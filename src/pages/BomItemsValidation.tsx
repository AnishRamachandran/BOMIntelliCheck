import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BomItem {
  id: string;
  part_number: string;
  description: string;
  quantity: number;
  status: string;
  rule_violations: RuleViolation[];
  suggested_corrections: Record<string, any>;
}

interface RuleViolation {
  rule_id: string;
  rule_name: string;
  severity: string;
  description: string;
  field: string;
  current_value: string;
}

interface BomItemsValidationProps {
  checkId: string;
  onBack: () => void;
}

export function BomItemsValidation({ checkId, onBack }: BomItemsValidationProps) {
  const [items, setItems] = useState<BomItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBomItems();
  }, [checkId]);

  async function fetchBomItems() {
    try {
      const { data, error } = await supabase
        .from('bom_items')
        .select('*')
        .eq('check_id', checkId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching BOM items:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <AlertCircle size={14} />
            Error
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            <AlertTriangle size={14} />
            Warning
          </div>
        );
      case 'valid':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
            <CheckCircle size={14} />
            Valid
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            Pending
          </div>
        );
    }
  };

  const errorCount = items.filter(i => i.status === 'error').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const validCount = items.filter(i => i.status === 'valid').length;
  const qualityScore = items.length > 0 ? Math.round((validCount / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading BOM items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white mb-2 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">BOM Validation</h1>
          <p className="text-slate-400 mt-1">
            AI Correction System
          </p>
        </div>
        <button className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Sparkles size={20} />
          Generate Corrected BOM
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">BOM Items ({items.length})</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{validCount}</span> Valid
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{errorCount}</span> Errors
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{warningCount}</span> Warnings
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Compliance Score</span>
              <span className="text-lg font-bold text-gray-900">{qualityScore}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const isExpanded = expandedItem === item.id;
            return (
              <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusBadge(item.status)}
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">{item.part_number}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      Qty: <span className="font-medium text-gray-900">{item.quantity}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {item.rule_violations && item.rule_violations.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <X className="w-5 h-5 text-red-600" />
                            <h3 className="font-semibold text-gray-900">Standard Rules Violated</h3>
                          </div>
                          <div className="space-y-3">
                            {item.rule_violations.map((violation, idx) => (
                              <div key={idx} className="bg-white rounded-lg p-4 border border-red-200">
                                <div className="flex items-start gap-3">
                                  <div className="bg-red-100 p-2 rounded-lg">
                                    <X className="w-4 h-4 text-red-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">
                                      Rule ID #{violation.rule_id}: {violation.rule_name}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">{violation.description}</p>
                                    {violation.current_value && (
                                      <p className="text-sm text-gray-500">
                                        Current value: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{violation.current_value}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {Object.keys(item.suggested_corrections).length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="w-5 h-5 text-blue-600" />
                              <h3 className="font-semibold text-gray-900">AI-Suggested Correction</h3>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              {Object.entries(item.suggested_corrections).map(([field, value]) => (
                                <div key={field} className="mb-3 last:mb-0">
                                  <p className="text-sm font-medium text-gray-700 mb-1 capitalize">{field}</p>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-500 mb-1">Current Value</p>
                                      <p className="font-mono bg-gray-100 px-3 py-2 rounded text-sm text-gray-700">
                                        {item[field as keyof BomItem] as string}
                                      </p>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                    <div className="flex-1">
                                      <p className="text-sm text-emerald-600 font-medium mb-1">Suggested Value</p>
                                      <p className="font-mono bg-emerald-50 px-3 py-2 rounded text-sm text-emerald-700 font-medium">
                                        {value as string}
                                      </p>
                                    </div>
                                  </div>
                                  {field === 'part_number' && (
                                    <p className="text-xs text-gray-500 mt-2 italic">
                                      Rationale: Copper C110 offers superior thermal conductivity required for this class and is an approved material.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-3">
                          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                            Reject
                          </button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                            <Edit2 size={16} />
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-emerald-600">
                        <CheckCircle className="w-5 h-5" />
                        <p className="font-medium">No issues found - This item meets all standards</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
