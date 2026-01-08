import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, FileCheck, Zap, Upload, BookOpen, TrendingUp, Activity, Book } from 'lucide-react';
import { supabase, BomCheck, DocCheck } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DemoPanel } from '../components/DemoMode/DemoPanel';
import { MetricCard } from '../components/Dashboard/MetricCard';
import { ComplianceChart } from '../components/Dashboard/ComplianceChart';

interface DashboardStats {
  totalBomChecks: number;
  compliantBoms: number;
  itemsRequiringReview: number;
  totalProcessed: number;
  correctionConfidence: number;
  avgQualityScore: number;
  complianceHistory: { week: string; rate: number }[];
  currentComplianceRate: number;
  complianceTrend: number;
  totalDocsUploaded: number;
  totalDocsChecked: number;
  docsFullyCorrected: number;
  spellingIssuesFound: number;
  spellingIssuesCorrected: number;
  terminologyViolations: number;
  avgDocQualityScore: number;
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBomChecks: 0,
    compliantBoms: 0,
    itemsRequiringReview: 0,
    totalProcessed: 0,
    correctionConfidence: 0,
    avgQualityScore: 0,
    complianceHistory: [],
    currentComplianceRate: 0,
    complianceTrend: 0,
    totalDocsUploaded: 0,
    totalDocsChecked: 0,
    docsFullyCorrected: 0,
    spellingIssuesFound: 0,
    spellingIssuesCorrected: 0,
    terminologyViolations: 0,
    avgDocQualityScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showDemoModal, setShowDemoModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    const bomSubscription = supabase
      .channel('bom_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bom_checks' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const docSubscription = supabase
      .channel('doc_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doc_checks' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      bomSubscription.unsubscribe();
      docSubscription.unsubscribe();
    };
  }, [profile?.id, isAdmin]);

  async function fetchDashboardData() {
    try {
      const [bomResult, docResult, complianceResult] = await Promise.all([
        supabase
          .from('bom_checks')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('doc_checks')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('compliance_history')
          .select('*')
          .order('week_start', { ascending: true })
          .limit(8)
      ]);

      const bomChecks = bomResult.data || [];
      const docChecks = docResult.data || [];
      const complianceHistory = complianceResult.data || [];

      const completedBomChecks = bomChecks.filter(c => c.status === 'completed');
      const compliantBoms = completedBomChecks.filter(c => (c.quality_score || 0) >= 90).length;
      const itemsRequiringReview = completedBomChecks.filter(c =>
        (c.quality_score || 0) < 90 && (c.issues_found || 0) > 0
      ).length;

      const totalIssuesFound = bomChecks.reduce((acc, c) => acc + (c.issues_found || 0), 0);
      const totalIssuesCorrected = bomChecks.reduce((acc, c) => acc + (c.issues_corrected || 0), 0);
      const correctionConfidence = totalIssuesFound > 0
        ? (totalIssuesCorrected / totalIssuesFound) * 100
        : 0;

      const avgQualityScore = completedBomChecks.length > 0
        ? completedBomChecks.reduce((acc, c) => acc + (c.quality_score || 0), 0) / completedBomChecks.length
        : 0;

      const completedDocChecks = docChecks.filter(d => d.status === 'completed');
      const docsFullyCorrected = completedDocChecks.filter(d => (d.quality_score || 0) >= 90).length;

      const spellingIssuesFound = docChecks.reduce((acc, d) => {
        const issues = d.issues_found ? JSON.parse(d.issues_found) : [];
        return acc + issues.filter((i: any) => i.type === 'spelling').length;
      }, 0);

      const spellingIssuesCorrected = docChecks.reduce((acc, d) => {
        const corrections = d.corrections_made ? JSON.parse(d.corrections_made) : [];
        return acc + corrections.filter((c: any) => c.type === 'spelling').length;
      }, 0);

      const terminologyViolations = docChecks.reduce((acc, d) => {
        const issues = d.issues_found ? JSON.parse(d.issues_found) : [];
        return acc + issues.filter((i: any) => i.type === 'terminology' || i.type === 'standards').length;
      }, 0);

      const avgDocQualityScore = completedDocChecks.length > 0
        ? completedDocChecks.reduce((acc, d) => acc + (d.quality_score || 0), 0) / completedDocChecks.length
        : 0;

      const chartData = complianceHistory.map((item, index) => ({
        week: `Week ${index + 1}`,
        rate: Number(item.compliance_rate)
      }));

      const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].rate : 0;
      const previousRate = chartData.length > 1 ? chartData[chartData.length - 2].rate : currentRate;
      const trend = currentRate - previousRate;

      setStats({
        totalBomChecks: bomChecks.length,
        compliantBoms,
        itemsRequiringReview,
        totalProcessed: completedBomChecks.length,
        correctionConfidence: Math.round(correctionConfidence * 10) / 10,
        avgQualityScore: Math.round(avgQualityScore * 10) / 10,
        complianceHistory: chartData,
        currentComplianceRate: currentRate,
        complianceTrend: Math.round(trend * 10) / 10,
        totalDocsUploaded: docChecks.length,
        totalDocsChecked: completedDocChecks.length,
        docsFullyCorrected,
        spellingIssuesFound,
        spellingIssuesCorrected,
        terminologyViolations,
        avgDocQualityScore: Math.round(avgDocQualityScore * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Your Compliance Overview</h1>
          <p className="text-slate-400 text-lg">
            Welcome back, {profile?.full_name || 'User'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white border border-slate-600 rounded-xl font-medium hover:bg-slate-700 transition-colors"
          >
            <Book size={20} />
            Demo Mode
          </button>
          <button
            onClick={() => onNavigate('standards-management')}
            className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-100 transition-colors"
          >
            <BookOpen size={20} />
            Access Standards Library
          </button>
          <button
            onClick={() => onNavigate('bom-check')}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
          >
            <Upload size={20} />
            Upload New BOM
          </button>
        </div>
      </div>

      <DemoPanel isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">BoM Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Compliant BOMs"
              value={stats.compliantBoms}
              icon={CheckCircle}
              color="green"
            />
            <MetricCard
              title="Items Requiring Review"
              value={stats.itemsRequiringReview}
              icon={AlertTriangle}
              color="orange"
            />
            <MetricCard
              title="Total BOMs Processed"
              value={stats.totalProcessed}
              icon={FileCheck}
              color="blue"
            />
            <MetricCard
              title="Avg BoM Quality Score"
              value={`${stats.avgQualityScore.toFixed(1)}%`}
              icon={Zap}
              color="purple"
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Document Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Docs Uploaded"
              value={stats.totalDocsUploaded}
              icon={Upload}
              color="blue"
            />
            <MetricCard
              title="Docs Checked"
              value={stats.totalDocsChecked}
              icon={FileCheck}
              color="green"
            />
            <MetricCard
              title="Fully Corrected Docs"
              value={stats.docsFullyCorrected}
              icon={CheckCircle}
              color="green"
            />
            <MetricCard
              title="Avg Doc Quality Score"
              value={`${stats.avgDocQualityScore.toFixed(1)}%`}
              icon={TrendingUp}
              color="purple"
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Issue Detection & Correction</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Spelling Issues Found"
              value={stats.spellingIssuesFound}
              icon={AlertTriangle}
              color="orange"
            />
            <MetricCard
              title="Spelling Issues Corrected"
              value={stats.spellingIssuesCorrected}
              icon={CheckCircle}
              color="green"
            />
            <MetricCard
              title="Terminology Violations"
              value={stats.terminologyViolations}
              icon={AlertTriangle}
              color="orange"
            />
          </div>
        </div>
      </div>

      <ComplianceChart
        data={stats.complianceHistory}
        currentRate={stats.currentComplianceRate}
        trend={stats.complianceTrend}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Performance Metrics</h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Avg BoM Quality Score</span>
                <span className="text-lg font-bold text-gray-900">{stats.avgQualityScore.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all shadow-sm"
                  style={{ width: `${stats.avgQualityScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Avg Doc Quality Score</span>
                <span className="text-lg font-bold text-gray-900">{stats.avgDocQualityScore.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all shadow-sm"
                  style={{ width: `${stats.avgDocQualityScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Compliance Rate</span>
                <span className="text-lg font-bold text-gray-900">{stats.currentComplianceRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all shadow-sm"
                  style={{ width: `${stats.currentComplianceRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Auto-Correction Success</span>
                <span className="text-lg font-bold text-gray-900">{stats.correctionConfidence.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 h-3 rounded-full transition-all shadow-sm"
                  style={{ width: `${stats.correctionConfidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onNavigate('bom-check')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all group border border-blue-200"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Upload New BOM</p>
                  <p className="text-sm text-gray-600">Start a new validation</p>
                </div>
              </div>
              <div className="text-blue-600">→</div>
            </button>

            <button
              onClick={() => onNavigate('doc-check')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-xl transition-all group border border-emerald-200"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Check Document</p>
                  <p className="text-sm text-gray-600">Validate technical docs</p>
                </div>
              </div>
              <div className="text-emerald-600">→</div>
            </button>

            <button
              onClick={() => onNavigate('standards-management')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl transition-all group border border-orange-200"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">View Standards</p>
                  <p className="text-sm text-gray-600">Browse validation rules</p>
                </div>
              </div>
              <div className="text-orange-600">→</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
