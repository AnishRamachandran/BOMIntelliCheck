import { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  success?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, id, error, success, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {children}

      {hint && !error && !success && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={14} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
