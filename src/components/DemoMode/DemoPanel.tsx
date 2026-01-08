import { Download, FileText, Book, AlertCircle, CheckCircle, X } from 'lucide-react';
import {
  downloadSampleBoM,
  downloadSampleDictionary,
  downloadSampleStandards,
  downloadSampleBomRules,
} from '../../utils/demoData';

interface DemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoPanel({ isOpen, onClose }: DemoPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-lg">
              <Book className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Demo Mode</h2>
              <p className="text-slate-400 text-sm">Download sample files to test validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border-2 border-blue-500/30 rounded-lg p-6">
            <p className="text-slate-300 mb-6">
              Download sample Senvion files to test the validation system. These files contain intentional
              errors to demonstrate the AI-powered correction capabilities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={downloadSampleBoM}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
              >
                <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">Sample BoM File</h3>
                  <p className="text-sm text-slate-400">
                    CSV with common errors: typos, wrong terminology
                  </p>
                </div>
                <Download className="w-5 h-5 text-slate-400" />
              </button>

              <button
                onClick={downloadSampleDictionary}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
              >
                <FileText className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">Terminology Dictionary</h3>
                  <p className="text-sm text-slate-400">
                    JSON with approved Senvion terminology
                  </p>
                </div>
                <Download className="w-5 h-5 text-slate-400" />
              </button>

              <button
                onClick={downloadSampleStandards}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
              >
                <FileText className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">Internal Standards</h3>
                  <p className="text-sm text-slate-400">
                    JSON with engineering standards and rules
                  </p>
                </div>
                <Download className="w-5 h-5 text-slate-400" />
              </button>

              <button
                onClick={downloadSampleBomRules}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
              >
                <FileText className="w-8 h-8 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">BoM Rules</h3>
                  <p className="text-sm text-slate-400">
                    JSON with validation rules and formats
                  </p>
                </div>
                <Download className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">Step 1: Upload Reference Files</p>
                  <p className="text-sm text-slate-400">
                    If you're an admin, upload the terminology dictionary, standards, and BoM rules
                    to the Reference Library first.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">Step 2: Test BoM Validation</p>
                  <p className="text-sm text-slate-400">
                    Upload the sample BoM file in the BoM Check page. The AI will detect and correct
                    errors like "Blad3" → "Blade 3", "grbx" → "gearbox".
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">Step 3: Review Results</p>
                  <p className="text-sm text-slate-400">
                    Check the dashboard for quality scores, download corrected files, and view
                    detailed validation reports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">OpenAI API Integration</p>
                  <p className="text-sm text-slate-400">
                    For production use with advanced AI validation, configure your OpenAI API key.
                    Current validation uses rule-based checking with terminology dictionaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
