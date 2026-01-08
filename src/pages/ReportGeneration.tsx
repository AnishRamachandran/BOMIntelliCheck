import { useState, useEffect } from 'react';
import { Calendar, FileText, Download, Loader, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Report {
  id: string;
  report_type: string;
  format: string;
  status: string;
  date_range_start: string;
  date_range_end: string;
  file_url: string | null;
  created_at: string;
}

export function ReportGeneration() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportType, setReportType] = useState('compliance');
  const [format, setFormat] = useState('pdf');
  const [dateRangeStart, setDateRangeStart] = useState('2023-11-01');
  const [dateRangeEnd, setDateRangeEnd] = useState('2023-11-30');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();

    const subscription = supabase
      .channel('reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  async function fetchReports() {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!profile?.id) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: profile.id,
          report_type: reportType,
          format,
          status: 'processing',
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
        })
        .select()
        .single();

      if (error) throw error;

      setTimeout(async () => {
        await supabase
          .from('reports')
          .update({
            status: 'completed',
            file_url: `/reports/${data.id}.${format}`,
          })
          .eq('id', data.id);
      }, 3000);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteReport(id: string) {
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  }

  function downloadReport(report: Report) {
    const content = generateMockReportContent(report);
    const blob = new Blob([content], { type: getMimeType(report.format) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}-${report.date_range_start}-to-${report.date_range_end}.${report.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getMimeType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  function generateMockReportContent(report: Report): string {
    const reportTitle = report.report_type.replace('_', ' ').toUpperCase();
    const dateRange = `${report.date_range_start} to ${report.date_range_end}`;

    if (report.format === 'json') {
      return JSON.stringify({
        report_type: report.report_type,
        date_range: { start: report.date_range_start, end: report.date_range_end },
        generated_at: report.created_at,
        summary: {
          total_bom_checks: 24,
          total_doc_checks: 18,
          average_quality_score: 87.5,
          issues_found: 156,
          issues_corrected: 124
        },
        details: [
          { date: '2023-11-15', bom_checks: 8, quality_score: 85.2 },
          { date: '2023-11-22', bom_checks: 10, quality_score: 89.1 },
          { date: '2023-11-29', bom_checks: 6, quality_score: 88.7 }
        ]
      }, null, 2);
    }

    if (report.format === 'csv') {
      return `${reportTitle} REPORT\nDate Range,${dateRange}\n\nDate,BOM Checks,Doc Checks,Quality Score,Issues Found,Issues Corrected\n2023-11-15,8,6,85.2,45,38\n2023-11-22,10,7,89.1,52,44\n2023-11-29,6,5,88.7,59,42\n\nTOTAL,24,18,87.5,156,124`;
    }

    return `${reportTitle} REPORT\n${'='.repeat(50)}\n\nDate Range: ${dateRange}\nGenerated: ${new Date(report.created_at).toLocaleString()}\n\nSUMMARY\n${'-'.repeat(50)}\nTotal BOM Checks: 24\nTotal Doc Checks: 18\nAverage Quality Score: 87.5%\nTotal Issues Found: 156\nTotal Issues Corrected: 124\n\nDETAILED BREAKDOWN\n${'-'.repeat(50)}\n\n2023-11-15:\n  BOM Checks: 8\n  Quality Score: 85.2%\n  Issues: 45 found, 38 corrected\n\n2023-11-22:\n  BOM Checks: 10\n  Quality Score: 89.1%\n  Issues: 52 found, 44 corrected\n\n2023-11-29:\n  BOM Checks: 6\n  Quality Score: 88.7%\n  Issues: 59 found, 42 corrected\n`;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-emerald-700 font-medium">Completed</span>;
      case 'processing':
        return <span className="text-blue-700 font-medium">Processing</span>;
      case 'failed':
        return <span className="text-red-700 font-medium">Failed</span>;
      default:
        return <span className="text-gray-700 font-medium">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Generate & Export Reports</h1>
        <p className="text-slate-400 text-lg">
          Create comprehensive compliance and audit reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Generate New Report</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="compliance">Compliance Report</option>
                <option value="audit">Audit Trail</option>
                <option value="quality">Quality Metrics</option>
                <option value="full_export">Full Data Export</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-slate-400">to</span>
                <div className="flex-1 relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Report History</h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-400">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No reports generated yet
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm capitalize">
                        {report.report_type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-400">
                        Generated on {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusIcon(report.status)}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs uppercase font-medium">
                      {report.format}
                    </span>
                    {getStatusText(report.status)}
                  </div>

                  <div className="flex gap-2">
                    {report.status === 'completed' && (
                      <button
                        onClick={() => downloadReport(report)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
