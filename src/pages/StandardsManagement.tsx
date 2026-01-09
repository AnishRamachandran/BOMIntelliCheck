import { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Globe, FolderTree, BookOpen, Plus, Edit2, X, AlertCircle } from 'lucide-react';
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
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<StandardRule | null>(null);
  const [formData, setFormData] = useState({
    rule_id: '',
    name: '',
    category: 'general',
    description: '',
    status: 'active',
    correct_example: '',
    incorrect_example: '',
    approved_materials: '',
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

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

  function openAddModal() {
    setEditingRule(null);
    setFormData({
      rule_id: '',
      name: '',
      category: 'general',
      description: '',
      status: 'active',
      correct_example: '',
      incorrect_example: '',
      approved_materials: '',
    });
    setShowAdvancedOptions(false);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEditModal(rule: StandardRule) {
    setEditingRule(rule);
    const hasExamples = rule.examples?.correct || rule.examples?.incorrect || rule.examples?.approved;
    setFormData({
      rule_id: rule.rule_id,
      name: rule.name,
      category: rule.category,
      description: rule.description,
      status: rule.status,
      correct_example: rule.examples?.correct || '',
      incorrect_example: rule.examples?.incorrect || '',
      approved_materials: rule.examples?.approved?.join(', ') || '',
    });
    setShowAdvancedOptions(!!hasExamples);
    setFieldErrors({});
    setShowModal(true);
  }

  function validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!formData.rule_id.trim()) {
      errors.rule_id = 'Rule ID is required';
    } else if (!/^[A-Z]+-\d+$/.test(formData.rule_id)) {
      errors.rule_id = 'Format: XXX-000 (e.g., BOM-001)';
    }

    if (!formData.name.trim()) {
      errors.name = 'Rule name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Please provide a more detailed description';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const examples: any = {};
    if (formData.correct_example) examples.correct = formData.correct_example;
    if (formData.incorrect_example) examples.incorrect = formData.incorrect_example;
    if (formData.approved_materials) {
      examples.approved = formData.approved_materials.split(',').map(m => m.trim()).filter(Boolean);
    }

    const ruleData = {
      rule_id: formData.rule_id,
      name: formData.name,
      category: formData.category,
      description: formData.description,
      status: formData.status,
      examples,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingRule) {
        const { error } = await supabase
          .from('standards_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('standards_rules')
          .insert([ruleData]);

        if (error) throw error;
      }

      setShowModal(false);
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule. Please try again.');
    }
  }

  function handleFieldChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
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
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus size={20} />
          Add New Rule
        </button>
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
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Description:</p>
                            <p className="text-sm text-gray-600">{rule.description}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(rule);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Edit2 size={14} />
                            Edit Rule
                          </button>
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingRule ? 'Edit Rule' : 'Add New Rule'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">Required fields are marked with *</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rule_id}
                    onChange={(e) => handleFieldChange('rule_id', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.rule_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="e.g., BOM-001"
                  />
                  {fieldErrors.rule_id && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.rule_id}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Format: XXX-000 (letters, dash, numbers)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Part Number Format"
                  />
                  {fieldErrors.name && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="naming">Naming</option>
                    <option value="compliance">Compliance</option>
                    <option value="material">Material</option>
                    <option value="formatting">Formatting</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the rule category for better organization</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    rows={3}
                    placeholder="Describe what this rule validates..."
                  />
                  {fieldErrors.description && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                      <AlertCircle size={14} />
                      <span>{fieldErrors.description}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length} characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active - Rule is enforced</option>
                    <option value="draft">Draft - Rule is not yet enforced</option>
                    <option value="deprecated">Deprecated - Rule is no longer used</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options (Examples & Materials)
                </button>
              </div>

              {showAdvancedOptions && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Add examples and approved materials (optional)</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Example
                    </label>
                    <input
                      type="text"
                      value={formData.correct_example}
                      onChange={(e) => handleFieldChange('correct_example', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., RES-0603-10K-1%"
                    />
                    <p className="text-xs text-gray-500 mt-1">Show users what a correct value looks like</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incorrect Example
                    </label>
                    <input
                      type="text"
                      value={formData.incorrect_example}
                      onChange={(e) => handleFieldChange('incorrect_example', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., res10k"
                    />
                    <p className="text-xs text-gray-500 mt-1">Show users what to avoid</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approved Materials
                    </label>
                    <input
                      type="text"
                      value={formData.approved_materials}
                      onChange={(e) => handleFieldChange('approved_materials', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Copper, Aluminum, Steel"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple materials with commas</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
