import { useEffect, useState } from 'react';
import { Book, Search, Plus, CreditCard as Edit2, Trash2, Save, X, FileText, Tag, Folder, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReferenceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function ReferenceLibrary() {
  const { user } = useAuth();
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    content: '',
    tags: '',
  });
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const categories = [
    'All',
    'Standards',
    'Materials',
    'Naming Conventions',
    'Compliance',
    'Best Practices',
    'Terminology',
  ];

  useEffect(() => {
    fetchReferences();
  }, []);

  async function fetchReferences() {
    try {
      const { data, error } = await supabase
        .from('reference_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferences(data || []);
    } catch (error) {
      console.error('Error fetching references:', error);
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!formData.category) {
      errors.category = 'Please select a category';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.content.trim()) {
      errors.content = 'Content is required';
    } else if (formData.content.length < 20) {
      errors.content = 'Please provide more detailed content (at least 20 characters)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleFieldChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
  }

  async function handleSave() {
    if (!user) return;

    if (!validateForm()) {
      return;
    }

    const tags = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('reference_library')
          .update({
            title: formData.title,
            category: formData.category,
            description: formData.description,
            content: formData.content,
            tags: tags,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('reference_library').insert([
          {
            title: formData.title,
            category: formData.category,
            description: formData.description,
            content: formData.content,
            tags: tags,
            created_by: user.id,
          },
        ]);

        if (error) throw error;
      }

      setFormData({ title: '', category: '', description: '', content: '', tags: '' });
      setIsAddingNew(false);
      setEditingId(null);
      setFieldErrors({});
      setShowContentPreview(false);
      fetchReferences();
    } catch (error) {
      console.error('Error saving reference:', error);
      alert('Failed to save reference. Please try again.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reference?')) return;

    try {
      const { error } = await supabase.from('reference_library').delete().eq('id', id);

      if (error) throw error;
      fetchReferences();
    } catch (error) {
      console.error('Error deleting reference:', error);
      alert('Failed to delete reference. Please try again.');
    }
  }

  function handleEdit(item: ReferenceItem) {
    setFormData({
      title: item.title,
      category: item.category,
      description: item.description,
      content: item.content,
      tags: item.tags.join(', '),
    });
    setEditingId(item.id);
    setIsAddingNew(true);
  }

  function handleCancel() {
    setFormData({ title: '', category: '', description: '', content: '', tags: '' });
    setIsAddingNew(false);
    setEditingId(null);
    setFieldErrors({});
    setShowContentPreview(false);
  }

  function getCategoryDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      'standards': 'Industry standards, specifications, and regulations',
      'materials': 'Material properties, specifications, and guidelines',
      'naming conventions': 'Naming rules and conventions for parts and documents',
      'compliance': 'Compliance requirements and regulatory information',
      'best practices': 'Recommended practices and guidelines',
      'terminology': 'Technical terms, definitions, and glossary items'
    };
    return descriptions[category.toLowerCase()] || '';
  }

  const filteredReferences = references.filter((ref) => {
    const matchesSearch =
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || ref.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      standards: 'bg-blue-100 text-blue-700',
      materials: 'bg-purple-100 text-purple-700',
      'naming conventions': 'bg-green-100 text-green-700',
      compliance: 'bg-amber-100 text-amber-700',
      'best practices': 'bg-emerald-100 text-emerald-700',
      terminology: 'bg-pink-100 text-pink-700',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading reference library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Reference Library</h1>
          <p className="text-slate-400 text-lg">
            Manage technical references, standards, and best practices
          </p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
        >
          <Plus size={20} />
          Add Reference
        </button>
      </div>

      {isAddingNew ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingId ? 'Edit Reference' : 'Add New Reference'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-5">
            <p className="text-sm text-gray-600">Fields marked with * are required</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter a clear, descriptive title"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.title && (
                <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.title}</span>
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {categories.filter((c) => c !== 'All').map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {fieldErrors.category ? (
                <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.category}</span>
                </div>
              ) : formData.category ? (
                <p className="text-xs text-gray-500 mt-1">{getCategoryDescription(formData.category)}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="One-line summary of this reference"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.description && (
                <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.description}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowContentPreview(!showContentPreview)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {showContentPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showContentPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                placeholder="Detailed content, guidelines, specifications, or reference information..."
                rows={showContentPreview ? 6 : 10}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.content ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {fieldErrors.content ? (
                <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                  <AlertCircle size={14} />
                  <span>{fieldErrors.content}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">{formData.content.length} characters</p>
              )}

              {showContentPreview && formData.content && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Preview:</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{formData.content}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleFieldChange('tags', e.target.value)}
                placeholder="e.g., ISO, RoHS, quality, validation"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
              {formData.tags && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.split(',').map((tag, idx) => {
                    const trimmedTag = tag.trim();
                    return trimmedTag ? (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        <Tag size={12} />
                        {trimmedTag}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
              >
                <Save size={20} />
                {editingId ? 'Update Reference' : 'Save Reference'}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search references, content, or tags..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category.toLowerCase())}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.toLowerCase()
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReferences.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No references found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start by adding your first reference'}
                </p>
              </div>
            ) : (
              filteredReferences.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700 line-clamp-3">{item.content}</p>
                  </div>

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last updated: {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
