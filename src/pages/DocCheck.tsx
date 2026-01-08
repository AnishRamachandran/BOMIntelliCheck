import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Activity, Book } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DocIssue {
  type: 'spelling' | 'grammar' | 'terminology' | 'standards';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: string;
  suggestion?: string;
  corrected: boolean;
}

interface ValidationResult {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  qualityScore: number;
  issues: DocIssue[];
  totalIssues: number;
  correctedIssues: number;
}

export function DocCheck() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.doc', '.docx', '.pdf', '.txt'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        alert('Please upload a valid document file (.doc, .docx, .pdf, or .txt)');
        return;
      }

      setFile(selectedFile);
      setValidationResult(null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['.doc', '.docx', '.pdf', '.txt'];
      const fileExtension = droppedFile.name.toLowerCase().substring(droppedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        alert('Please upload a valid document file (.doc, .docx, .pdf, or .txt)');
        return;
      }

      setFile(droppedFile);
      setValidationResult(null);
    }
  }

  async function handleUpload() {
    if (!file || !user) return;

    setUploading(true);

    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('doc-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create doc check record
      const { data: docCheck, error: dbError } = await supabase
        .from('doc_checks')
        .insert([
          {
            user_id: user.id,
            file_name: file.name,
            status: 'processing',
            issues_found: '[]',
            corrections_made: '[]',
            quality_score: 0,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Simulate validation process (in a real app, this would be handled by a backend service)
      setTimeout(async () => {
        // Mock validation results
        const mockIssues: DocIssue[] = [
          {
            type: 'spelling',
            severity: 'error',
            message: 'Spelling error detected',
            location: 'Page 1, Paragraph 2',
            suggestion: 'Replace "recieve" with "receive"',
            corrected: true,
          },
          {
            type: 'terminology',
            severity: 'warning',
            message: 'Non-standard terminology used',
            location: 'Page 2, Section 3.1',
            suggestion: 'Use "interface" instead of "connection point"',
            corrected: false,
          },
          {
            type: 'standards',
            severity: 'error',
            message: 'Document structure does not conform to standard template',
            location: 'Section Headers',
            suggestion: 'Add required sections: Abstract, Introduction, Methodology',
            corrected: false,
          },
          {
            type: 'grammar',
            severity: 'info',
            message: 'Passive voice detected',
            location: 'Page 3, Paragraph 1',
            suggestion: 'Consider using active voice for clarity',
            corrected: true,
          },
          {
            type: 'spelling',
            severity: 'error',
            message: 'Spelling error detected',
            location: 'Page 4, Paragraph 5',
            suggestion: 'Replace "accomodate" with "accommodate"',
            corrected: true,
          },
        ];

        const totalIssues = mockIssues.length;
        const correctedIssues = mockIssues.filter((i) => i.corrected).length;
        const qualityScore = Math.round((correctedIssues / totalIssues) * 100);

        // Update the doc check record
        await supabase
          .from('doc_checks')
          .update({
            status: 'completed',
            issues_found: JSON.stringify(mockIssues),
            corrections_made: JSON.stringify(mockIssues.filter((i) => i.corrected)),
            quality_score: qualityScore,
          })
          .eq('id', docCheck.id);

        setValidationResult({
          id: docCheck.id,
          fileName: file.name,
          status: 'completed',
          qualityScore,
          issues: mockIssues,
          totalIssues,
          correctedIssues,
        });

        setUploading(false);
      }, 3000);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
      setUploading(false);
    }
  }

  function resetForm() {
    setFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling':
        return 'Aa';
      case 'grammar':
        return 'G';
      case 'terminology':
        return 'T';
      case 'standards':
        return 'S';
      default:
        return '?';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Document Validation</h1>
        <p className="text-slate-400 text-lg">
          Upload technical documents for automated quality checking and correction
        </p>
      </div>

      {!validationResult ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx,.pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="doc-upload"
            />

            {!file ? (
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
                  <Book className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Document
                </h3>
                <p className="text-gray-600 mb-6">
                  Drag and drop your document here, or click to browse
                </p>
                <label
                  htmlFor="doc-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 cursor-pointer transition-all shadow-lg shadow-emerald-500/30"
                >
                  <Upload size={20} />
                  Choose File
                </label>
                <p className="text-sm text-gray-500 mt-4">
                  Supported formats: DOC, DOCX, PDF, TXT
                </p>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {file.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Validate Document
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={uploading}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {uploading && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-800">Processing Document</p>
                  <p className="text-sm text-emerald-700">
                    Checking spelling, grammar, terminology, and standards compliance...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Validation Complete</h2>
                <p className="text-gray-600">{validationResult.fileName}</p>
              </div>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Upload Another
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Issues</p>
                    <p className="text-2xl font-bold text-gray-900">{validationResult.totalIssues}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Auto-Corrected</p>
                    <p className="text-2xl font-bold text-gray-900">{validationResult.correctedIssues}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quality Score</p>
                    <p className="text-2xl font-bold text-gray-900">{validationResult.qualityScore}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Issues Detected</h3>
              <div className="space-y-3">
                {validationResult.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <span className="font-mono text-xs font-bold px-2 py-1 bg-white rounded">
                          {getTypeIcon(issue.type)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold capitalize">{issue.type}</span>
                          {issue.corrected && (
                            <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full font-medium">
                              Auto-corrected
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-1">{issue.message}</p>
                        <p className="text-xs opacity-75 mb-2">{issue.location}</p>
                        {issue.suggestion && (
                          <div className="text-sm bg-white bg-opacity-50 rounded p-2 border border-current border-opacity-20">
                            <span className="font-medium">Suggestion:</span> {issue.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
