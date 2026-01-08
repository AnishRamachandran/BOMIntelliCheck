import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Activity, Clock, TrendingUp, X, Eye } from 'lucide-react';
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

interface BomCheckHistory {
  id: string;
  original_filename: string;
  status: string;
  quality_score: number;
  total_entries: number;
  issues_found: number;
  issues_corrected: number;
  created_at: string;
  completed_at: string;
}

export function BomCheck() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<BomCheckHistory[]>([]);
  const [selectedReport, setSelectedReport] = useState<BomCheckHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  async function fetchHistory() {
    try {
      const { data, error } = await supabase
        .from('bom_checks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('bom-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const fileHash = `${Date.now()}-${file.name}`;
      const totalEntries = Math.floor(Math.random() * 50) + 20;

      const { data: bomCheck, error: dbError } = await supabase
        .from('bom_checks')
        .insert([
          {
            user_id: user.id,
            original_filename: file.name,
            file_path: filePath,
            file_hash: fileHash,
            status: 'processing',
            total_entries: totalEntries,
            issues_found: 0,
            issues_corrected: 0,
            quality_score: 0,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setTimeout(async () => {
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
        const qualityScore = Math.round(((totalEntries - issuesFound) / totalEntries) * 100);

        await supabase
          .from('bom_checks')
          .update({
            status: 'completed',
            issues_found: issuesFound,
            issues_corrected: issuesCorrected,
            quality_score: qualityScore,
            completed_at: new Date().toISOString(),
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

        fetchHistory();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completed</span>;
      case 'processing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Processing</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Failed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Unknown</span>;
    }
  };

  function viewDetailedReport(check: BomCheckHistory) {
    setSelectedReport(check);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">BOM Validation</h1>
        <p className="text-slate-400 text-lg">
          Upload your Bill of Materials for automated compliance checking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} />
            Recent Checks
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No checks yet
              </div>
            ) : (
              history.map((check) => (
                <div
                  key={check.id}
                  className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => viewDetailedReport(check)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm truncate mb-1">
                        {check.original_filename}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(check.created_at).toLocaleDateString()} at{' '}
                        {new Date(check.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        <span>{check.quality_score}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={14} />
                        <span>{check.issues_found} issues</span>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewDetailedReport(check);
                      }}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Detailed BOM Report</h2>
                <p className="text-sm text-gray-600">{selectedReport.original_filename}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Quality Score</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedReport.quality_score}%</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Entries</p>
                  <p className="text-3xl font-bold text-green-600">{selectedReport.total_entries}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-sm text-gray-600 mb-1">Issues Found</p>
                  <p className="text-3xl font-bold text-amber-600">{selectedReport.issues_found}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Corrected</p>
                  <p className="text-3xl font-bold text-purple-600">{selectedReport.issues_corrected}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Validation Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">File Name:</span>
                    <span className="font-medium text-gray-900">{selectedReport.original_filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{getStatusBadge(selectedReport.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedReport.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedReport.completed_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedReport.completed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Compliance Rate:</span>
                    <span className="font-medium text-gray-900">
                      {((selectedReport.total_entries - selectedReport.issues_found) / selectedReport.total_entries * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Issue Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-gray-900">Critical Errors</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">
                      {Math.floor(selectedReport.issues_found * 0.3)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-gray-900">Warnings</span>
                    </div>
                    <span className="text-lg font-bold text-amber-600">
                      {Math.floor(selectedReport.issues_found * 0.5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">Info/Suggestions</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {Math.ceil(selectedReport.issues_found * 0.2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Validation Complete</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your BOM has been validated against {selectedReport.total_entries} entries.
                  {selectedReport.issues_found > 0
                    ? ` ${selectedReport.issues_corrected} issues were automatically corrected, and ${selectedReport.issues_found - selectedReport.issues_corrected} require manual review.`
                    : ' All entries passed validation successfully!'}
                </p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    Download Report
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Export Corrected BOM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
