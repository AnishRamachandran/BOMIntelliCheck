import { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Globe, FolderTree, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StandardRule {
  id: string;
  rule_id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  examples: {
    correct?: string;
    incorrect?: string;
    max_length?: number;
    approved?: string[];
  };
  created_at: string;
  updated_at: string;
}

export function StandardsManagement() {
  const [rules, setRules] = useState<StandardRule[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'exceptions' | 'examples'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('standards_rules')
        .select('*')
        .order('rule_id', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedTab === 'exceptions') {
      return matchesSearch && rule.status === 'deprecated';
    }

    return matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'naming':
        return 'bg-blue-100 text-blue-700';
      case 'compliance':
        return 'bg-amber-100 text-amber-700';
      case 'material':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            Active
          </span>
        );
      case 'deprecated':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            Deprecated
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading standards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Global Standards</h1>
          <p className="text-slate-400 text-lg">
            AI BOM System Knowledge Base
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg">
          <Globe size={20} />
          Global Standards
        </button>
        <button className="flex items-center gap-3 px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors">
          <FolderTree size={20} />
          Project-Specific Rules
        </button>
        <button className="flex items-center gap-3 px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors">
          <BookOpen size={20} />
          Material Libraries
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules, standards, materials..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Rules
            </button>
            <button
              onClick={() => setSelectedTab('exceptions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'exceptions'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Exceptions Only
            </button>
            <button
              onClick={() => setSelectedTab('examples')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'examples'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Naming Examples
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredRules.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No rules found matching your criteria
            </div>
          ) : (
            filteredRules.map((rule) => {
              const isExpanded = expandedRule === rule.id;
              return (
                <div key={rule.id} className="transition-colors hover:bg-gray-50">
                  <button
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                    className="w-full px-6 py-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Rule-{rule.rule_id}: {rule.name}
                          </h3>
                          {getStatusBadge(rule.status)}
                        </div>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-gray-400 ml-4" />
                      ) : (
                        <ChevronDown className="text-gray-400 ml-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2">
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Description:</p>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>

                        {rule.examples?.correct && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Correct Example:</p>
                            <code className="block bg-emerald-50 text-emerald-700 px-3 py-2 rounded text-sm font-mono">
                              {rule.examples.correct}
                            </code>
                          </div>
                        )}

                        {rule.examples?.incorrect && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Incorrect Example:</p>
                            <code className="block bg-red-50 text-red-700 px-3 py-2 rounded text-sm font-mono">
                              {rule.examples.incorrect}
                            </code>
                          </div>
                        )}

                        {rule.examples?.approved && rule.examples.approved.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">Approved Materials:</p>
                            <div className="flex flex-wrap gap-2">
                              {rule.examples.approved.map((material, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                >
                                  {material}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-3 text-xs text-gray-500">
                          Last updated: {new Date(rule.updated_at).toLocaleDateString()} by Admin
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
