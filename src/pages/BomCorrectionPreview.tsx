import { useState, useEffect } from 'react';
import { CheckCircle, Download, RotateCcw, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BomRow {
  part_number: string;
  description: string;
  quantity: number;
  isChanged?: boolean;
  isRemoved?: boolean;
  isNew?: boolean;
}

interface BomCorrectionPreviewProps {
  correctionId: string;
  onBack: () => void;
  onApprove: () => void;
}

export function BomCorrectionPreview({ correctionId, onBack, onApprove }: BomCorrectionPreviewProps) {
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [originalBom, setOriginalBom] = useState<BomRow[]>([]);
  const [correctedBom, setCorrectedBom] = useState<BomRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrectionData();
  }, [correctionId]);

  async function fetchCorrectionData() {
    try {
      const { data, error } = await supabase
        .from('bom_corrections')
        .select('*')
        .eq('id', correctionId)
        .single();

      if (error) throw error;

      const original = data.original_data?.items || getDemoOriginal();
      const corrected = data.corrected_data?.items || getDemoCorrected();

      setOriginalBom(original);
      setCorrectedBom(corrected);
    } catch (error) {
      console.error('Error fetching correction data:', error);
      setOriginalBom(getDemoOriginal());
      setCorrectedBom(getDemoCorrected());
    } finally {
      setLoading(false);
    }
  }

  function getDemoOriginal(): BomRow[] {
    return [
      { part_number: 'PN-A456-OLD', description: 'Resistor, 10k Ohm, 5%', quantity: 100, isChanged: true },
      { part_number: 'PN-B789', description: 'Capacitor, 100uF, 25V', quantity: 50 },
      { part_number: 'PN-C112-OLD', description: 'Microcontroller, 8-bit', quantity: 10, isChanged: true },
      { part_number: 'PN-D415', description: 'LED, Green, 5mm', quantity: 200 },
      { part_number: 'PN-E620', description: 'Diode, Schottky', quantity: 75, isRemoved: true },
    ];
  }

  function getDemoCorrected(): BomRow[] {
    return [
      { part_number: 'PN-A456-V2', description: 'Resistor, 10k Ohm, 5%', quantity: 100, isChanged: true },
      { part_number: 'PN-B789', description: 'Capacitor, 100uF, 25V', quantity: 50 },
      { part_number: 'PN-C113-NEW', description: 'Microcontroller, 8-bit, Rev B', quantity: 10, isChanged: true },
      { part_number: 'PN-D415', description: 'LED, Green, 5mm', quantity: 200 },
    ];
  }

  const displayedOriginal = showOnlyChanged ? originalBom.filter(row => row.isChanged || row.isRemoved) : originalBom;
  const displayedCorrected = showOnlyChanged ? correctedBom.filter(row => row.isChanged || row.isNew) : correctedBom;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading correction preview...</p>
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
          <h1 className="text-3xl font-bold text-white">BOM #PN-12345 Correction Preview</h1>
          <p className="text-slate-400 mt-1">
            Review the AI-generated corrections and approve the changes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyChanged}
              onChange={(e) => setShowOnlyChanged(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-white font-medium">Show Only Changed Items</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Original BOM</h2>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedOriginal.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      row.isChanged ? 'bg-amber-50' : row.isRemoved ? 'bg-red-50 line-through opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-gray-900 whitespace-nowrap">
                      {row.part_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900">Corrected BOM</h2>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full">
              <thead className="bg-emerald-100 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedCorrected.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      row.isChanged ? 'bg-emerald-50' : row.isNew ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-gray-900 whitespace-nowrap relative">
                      {row.part_number}
                      {row.isChanged && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Edit className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{row.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Regenerate
            </button>
            <button className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium flex items-center gap-2">
              <Download size={18} />
              Export
            </button>
          </div>
          <button
            onClick={onApprove}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-500/30"
          >
            <CheckCircle size={20} />
            Approve All
          </button>
        </div>
      </div>
    </div>
  );
}
