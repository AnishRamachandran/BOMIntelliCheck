import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ValidationResult {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  issuesFound: number;
  issuesCorrected: number;
  qualityScore: number;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
  }>;
}

export function BomCheck() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        alert('Please upload a valid BOM file (.csv, .xlsx, or .xls)');
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
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExtension = droppedFile.name.toLowerCase().substring(droppedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(fileExtension)) {
        alert('Please upload a valid BOM file (.csv, .xlsx, or .xls)');
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
        .from('bom-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create BOM check record
      const { data: bomCheck, error: dbError } = await supabase
        .from('bom_checks')
        .insert([
          {
            user_id: user.id,
            file_name: file.name,
            status: 'processing',
            issues_found: 0,
            issues_corrected: 0,
            quality_score: 0,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Simulate validation process (in a real app, this would be handled by a backend service)
      setTimeout(async () => {
        // Mock validation results
        const mockIssues = [
          {
            type: 'naming',
            severity: 'warning' as const,
            message: 'Part number does not follow standard naming convention',
            line: 5,
          },
          {
            type: 'compliance',
            severity: 'error' as const,
            message: 'Material not found in approved materials list',
            line: 12,
          },
          {
            type: 'material',
            severity: 'info' as const,
            message: 'Consider using RoHS-compliant alternative',
            line: 18,
          },
        ];

        const issuesFound = mockIssues.length;
        const issuesCorrected = 1;
        const qualityScore = Math.round(((issuesFound - (issuesFound - issuesCorrected)) / issuesFound) * 100);

        // Update the BOM check record
        await supabase
          .from('bom_checks')
          .update({
            status: 'completed',
            issues_found: issuesFound,
            issues_corrected: issuesCorrected,
            quality_score: qualityScore,
          })
          .eq('id', bomCheck.id);

        setValidationResult({
          id: bomCheck.id,
          fileName: file.name,
          status: 'completed',
          issuesFound,
          issuesCorrected,
          qualityScore,
          issues: mockIssues,
        });

        setUploading(false);
      }, 3000);
    } catch (error) {
      console.error('Error uploading BOM:', error);
      alert('Failed to upload BOM. Please try again.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">BOM Validation</h1>
        <p className="text-slate-400 text-lg">
          Upload your Bill of Materials for automated compliance checking
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
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />

            {!file ? (
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload BOM File
                </h3>
                <p className="text-gray-600 mb-6">
                  Drag and drop your file here, or click to browse
                </p>
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 cursor-pointer transition-all shadow-lg shadow-blue-500/30"
                >
                  <Upload size={20} />
                  Choose File
                </label>
                <p className="text-sm text-gray-500 mt-4">
                  Supported formats: CSV, XLSX, XLS
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Validate BOM
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
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">Processing BOM</p>
                  <p className="text-sm text-blue-700">
                    Validating against standards and checking compliance...
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Upload Another
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Issues Found</p>
                    <p className="text-2xl font-bold text-gray-900">{validationResult.issuesFound}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{validationResult.issuesCorrected}</p>
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
                    className={`p-4 rounded-lg border flex items-start gap-3 ${getSeverityColor(issue.severity)}`}
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">{issue.type}</span>
                        {issue.line && (
                          <span className="text-xs opacity-75">Line {issue.line}</span>
                        )}
                      </div>
                      <p className="text-sm">{issue.message}</p>
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
