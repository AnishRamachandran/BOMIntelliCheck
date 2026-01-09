import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultExpanded = false,
  children
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        {isExpanded ? (
          <ChevronUp className="text-gray-400" size={20} />
        ) : (
          <ChevronDown className="text-gray-400" size={20} />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
