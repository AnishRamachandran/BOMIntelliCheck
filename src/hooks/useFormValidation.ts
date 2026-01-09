import { useState, useCallback } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | undefined;
  };
}

interface ValidationErrors {
  [key: string]: string;
}

export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback((name: string, value: any): string | undefined => {
    const rule = rules[name];
    if (!rule) return undefined;

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'This field is required';
    }

    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return `Must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return `Must be less than ${rule.maxLength} characters`;
    }

    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return 'Invalid format';
    }

    if (rule.custom) {
      return rule.custom(value);
    }

    return undefined;
  }, [rules]);

  const validate = useCallback((name: string, value: any) => {
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
    return !error;
  }, [validateField]);

  const validateAll = useCallback((formData: { [key: string]: any }) => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(name => {
      const error = validateField(name, formData[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const setTouched = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validate,
    validateAll,
    setTouched,
    clearError,
    clearAllErrors
  };
}
