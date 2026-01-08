import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BomEntry {
  partNumber?: string;
  partName?: string;
  description?: string;
  quantity?: number;
  material?: string;
  supplier?: string;
  revision?: string;
  [key: string]: any;
}

interface ValidationResult {
  entry: BomEntry;
  issues: Array<{
    type: 'spelling' | 'terminology' | 'formatting' | 'inconsistency' | 'missing_field';
    severity: 'critical' | 'high' | 'medium' | 'low';
    field: string;
    original: string;
    suggestion: string;
    description: string;
    autoCorrected: boolean;
  }>;
  corrected: BomEntry;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { checkId } = await req.json();

    if (!checkId) {
      throw new Error('checkId is required');
    }

    await supabase
      .from('bom_checks')
      .update({ status: 'processing' })
      .eq('id', checkId);

    const { data: check, error: checkError } = await supabase
      .from('bom_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (checkError) throw checkError;

    const { data: fileData, error: fileError } = await supabase.storage
      .from('bom-uploads')
      .download(check.file_path);

    if (fileError) throw fileError;

    const fileContent = await fileData.text();
    const bomEntries = parseBoMFile(fileContent, check.original_filename);

    const { data: referenceFiles } = await supabase
      .from('reference_files')
      .select('*')
      .in('type', ['standard', 'dictionary', 'bom_rules']);

    const terminologyDict = buildTerminologyDict(referenceFiles || []);

    const validationResults: ValidationResult[] = [];
    const allIssues: any[] = [];
    const bomItems: any[] = [];

    for (const entry of bomEntries) {
      const result = await validateBomEntry(entry, terminologyDict);
      validationResults.push(result);

      const ruleViolations = result.issues.map(issue => ({
        rule_id: issue.type === 'missing_field' ? '102' : '101',
        rule_name: issue.type === 'missing_field' ? 'Material Description Length' : 'Part Number Formatting',
        severity: issue.severity,
        description: issue.description,
        field: issue.field,
        current_value: issue.original
      }));

      const suggestedCorrections: Record<string, any> = {};
      for (const issue of result.issues) {
        if (issue.autoCorrected && issue.suggestion) {
          suggestedCorrections[issue.field] = issue.suggestion;
        }
      }

      const itemStatus = result.issues.some(i => i.severity === 'critical') ? 'error' :
                        result.issues.some(i => i.severity === 'high' || i.severity === 'medium') ? 'warning' :
                        'valid';

      bomItems.push({
        check_id: checkId,
        part_number: entry.partNumber || 'Unknown',
        description: entry.description || entry.partName || '',
        quantity: parseInt(entry.quantity as string) || 0,
        status: itemStatus,
        rule_violations: ruleViolations,
        suggested_corrections: suggestedCorrections
      });

      for (const issue of result.issues) {
        allIssues.push({
          check_id: checkId,
          check_type: 'bom',
          issue_type: issue.type,
          severity: issue.severity,
          field_name: issue.field,
          original_value: issue.original,
          suggested_value: issue.suggestion,
          auto_corrected: issue.autoCorrected,
          description: issue.description,
        });
      }
    }

    if (allIssues.length > 0) {
      await supabase.from('validation_issues').insert(allIssues);
    }

    if (bomItems.length > 0) {
      await supabase.from('bom_items').insert(bomItems);
    }

    const correctedEntries = validationResults.map(r => r.corrected);
    const correctedContent = generateCSV(correctedEntries);

    const correctedFileName = `${check.user_id}/${Date.now()}_corrected.csv`;
    await supabase.storage
      .from('corrected-files')
      .upload(correctedFileName, correctedContent, {
        contentType: 'text/csv',
      });

    const totalIssues = allIssues.length;
    const correctedIssues = allIssues.filter(i => i.auto_corrected).length;
    const qualityScore = calculateQualityScore(totalIssues, bomEntries.length);

    const originalItems = bomEntries.map(e => ({
      part_number: e.partNumber || '',
      description: e.description || e.partName || '',
      quantity: parseInt(e.quantity as string) || 0
    }));

    const correctedItems = validationResults.map(r => ({
      part_number: r.corrected.partNumber || '',
      description: r.corrected.description || r.corrected.partName || '',
      quantity: parseInt(r.corrected.quantity as string) || 0
    }));

    const changes = validationResults
      .map((r, idx) => {
        const hasChanges = r.issues.some(i => i.autoCorrected);
        return hasChanges ? {
          index: idx,
          changes: r.issues.filter(i => i.autoCorrected).map(i => ({
            field: i.field,
            original: i.original,
            corrected: i.suggestion
          }))
        } : null;
      })
      .filter(c => c !== null);

    await supabase.from('bom_corrections').insert({
      check_id: checkId,
      original_data: { items: originalItems },
      corrected_data: { items: correctedItems },
      changes,
      status: 'pending'
    });

    await supabase
      .from('bom_checks')
      .update({
        status: 'completed',
        quality_score: qualityScore,
        total_entries: bomEntries.length,
        issues_found: totalIssues,
        issues_corrected: correctedIssues,
        validation_result: { validationResults },
        corrected_file_path: correctedFileName,
        completed_at: new Date().toISOString(),
      })
      .eq('id', checkId);

    return new Response(
      JSON.stringify({
        success: true,
        checkId,
        qualityScore,
        totalIssues,
        correctedIssues,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Validation error:', error);

    const { checkId } = await req.json().catch(() => ({ checkId: null }));
    if (checkId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('bom_checks')
        .update({ status: 'failed' })
        .eq('id', checkId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function parseBoMFile(content: string, filename: string): BomEntry[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const entries: BomEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const entry: BomEntry = {};

    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });

    entries.push(entry);
  }

  return entries;
}

function buildTerminologyDict(referenceFiles: any[]): Map<string, string> {
  const dict = new Map<string, string>();

  const commonTerms = [
    ['Blad', 'Blade'],
    ['Blad3', 'Blade 3'],
    ['blde', 'blade'],
    ['Hubm', 'Hub'],
    ['Nacele', 'Nacelle'],
    ['nacell', 'nacelle'],
    ['Gearbox', 'Gearbox'],
    ['grbx', 'gearbox'],
    ['Generator', 'Generator'],
    ['genrtr', 'generator'],
    ['Rotor', 'Rotor'],
    ['rotr', 'rotor'],
    ['Tower', 'Tower'],
    ['towr', 'tower'],
    ['Foundation', 'Foundation'],
    ['foundtn', 'foundation'],
    ['Stator', 'Stator'],
    ['Bearing', 'Bearing'],
    ['brng', 'bearing'],
  ];

  for (const [wrong, correct] of commonTerms) {
    dict.set(wrong.toLowerCase(), correct);
  }

  for (const file of referenceFiles) {
    if (file.type === 'dictionary' && file.parsed_content) {
      const content = file.parsed_content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.incorrect && item.correct) {
            dict.set(item.incorrect.toLowerCase(), item.correct);
          }
        }
      }
    }
  }

  return dict;
}

async function validateBomEntry(
  entry: BomEntry,
  terminologyDict: Map<string, string>
): Promise<ValidationResult> {
  const issues: ValidationResult['issues'] = [];
  const corrected: BomEntry = { ...entry };

  const requiredFields = ['partNumber', 'partName', 'description', 'quantity'];
  for (const field of requiredFields) {
    if (!entry[field] || entry[field] === '') {
      issues.push({
        type: 'missing_field',
        severity: 'critical',
        field,
        original: '',
        suggestion: '[Required]',
        description: `Missing required field: ${field}`,
        autoCorrected: false,
      });
    }
  }

  for (const [field, value] of Object.entries(entry)) {
    if (typeof value !== 'string' || !value) continue;

    const words = value.split(/\s+/);
    const correctedWords: string[] = [];
    let fieldCorrected = false;

    for (const word of words) {
      const lowerWord = word.toLowerCase();
      if (terminologyDict.has(lowerWord)) {
        const correction = terminologyDict.get(lowerWord)!;
        correctedWords.push(correction);

        if (word !== correction) {
          issues.push({
            type: 'terminology',
            severity: 'medium',
            field,
            original: word,
            suggestion: correction,
            description: `Incorrect terminology: '${word}' should be '${correction}'`,
            autoCorrected: true,
          });
          fieldCorrected = true;
        }
      } else {
        const spellingIssue = checkSpelling(word);
        if (spellingIssue) {
          correctedWords.push(spellingIssue.suggestion);
          issues.push({
            type: 'spelling',
            severity: 'low',
            field,
            original: word,
            suggestion: spellingIssue.suggestion,
            description: `Possible spelling error: '${word}'`,
            autoCorrected: true,
          });
          fieldCorrected = true;
        } else {
          correctedWords.push(word);
        }
      }
    }

    if (fieldCorrected) {
      corrected[field] = correctedWords.join(' ');
    }
  }

  return { entry, issues, corrected };
}

function checkSpelling(word: string): { suggestion: string } | null {
  const spellingRules: Record<string, string> = {
    'teh': 'the',
    'adn': 'and',
    'wieght': 'weight',
    'lenght': 'length',
    'widht': 'width',
    'hieght': 'height',
    'diamter': 'diameter',
    'materail': 'material',
    'aluminium': 'aluminum',
  };

  const lowerWord = word.toLowerCase();
  if (spellingRules[lowerWord]) {
    return { suggestion: spellingRules[lowerWord] };
  }

  return null;
}

function generateCSV(entries: BomEntry[]): string {
  if (entries.length === 0) return '';

  const headers = Object.keys(entries[0]);
  const csvLines = [headers.join(',')];

  for (const entry of entries) {
    const values = headers.map(h => entry[h] || '');
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

function calculateQualityScore(totalIssues: number, totalEntries: number): number {
  if (totalEntries === 0) return 100;

  const issuesPerEntry = totalIssues / totalEntries;
  const baseScore = 100;
  const penalty = Math.min(issuesPerEntry * 10, 50);

  return Math.max(baseScore - penalty, 0);
}