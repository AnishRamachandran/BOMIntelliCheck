import { useState } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignupFormProps {
  onToggleForm: () => void;
}

export function SignupForm({ onToggleForm }: SignupFormProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  function validateField(field: string, value: string) {
    const errors = { ...fieldErrors };

    switch (field) {
      case 'fullName':
        if (!value.trim()) {
          errors.fullName = 'Full name is required';
        } else if (value.trim().length < 2) {
          errors.fullName = 'Please enter your full name';
        } else {
          delete errors.fullName;
        }
        break;
      case 'email':
        if (!value) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (!value) {
          errors.password = 'Password is required';
        } else if (value.length < 6) {
          errors.password = 'Password must be at least 6 characters';
        } else if (!/[A-Z]/.test(value)) {
          errors.password = 'Include at least one uppercase letter';
        } else if (!/[a-z]/.test(value)) {
          errors.password = 'Include at least one lowercase letter';
        } else if (!/[0-9]/.test(value)) {
          errors.password = 'Include at least one number';
        } else {
          delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (value !== password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }

    setFieldErrors(errors);
  }

  function getPasswordStrength(): { strength: string; color: string; width: string } {
    if (!password) return { strength: '', color: '', width: '0%' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { strength: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { strength: 'Strong', color: 'bg-green-500', width: '100%' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    validateField('fullName', fullName);
    validateField('email', email);
    validateField('password', password);
    validateField('confirmPassword', confirmPassword);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (fullName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        onToggleForm();
      }, 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join us to start validating your BOMs</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Registration Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Account Created Successfully!</p>
                <p className="text-sm text-green-700 mt-1">Redirecting to login...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    validateField('fullName', e.target.value);
                  }}
                  required
                  placeholder="John Doe"
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {fieldErrors.fullName && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle size={12} />
                  <span>{fieldErrors.fullName}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateField('email', e.target.value);
                  }}
                  required
                  placeholder="you@example.com"
                  className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle size={12} />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validateField('password', e.target.value);
                  }}
                  required
                  placeholder="At least 6 characters"
                  className={`w-full pl-11 pr-11 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle size={12} />
                  <span>{fieldErrors.password}</span>
                </div>
              )}
              {password && !fieldErrors.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      getPasswordStrength().strength === 'Weak' ? 'text-red-600' :
                      getPasswordStrength().strength === 'Medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {getPasswordStrength().strength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getPasswordStrength().color}`}
                      style={{ width: getPasswordStrength().width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    validateField('confirmPassword', e.target.value);
                  }}
                  required
                  placeholder="Confirm your password"
                  className={`w-full pl-11 pr-11 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.confirmPassword ? 'border-red-300' :
                    confirmPassword && !fieldErrors.confirmPassword ? 'border-green-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle size={12} />
                  <span>{fieldErrors.confirmPassword}</span>
                </div>
              )}
              {confirmPassword && !fieldErrors.confirmPassword && password === confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : success ? (
                'Account Created!'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onToggleForm}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-400">
            Secure authentication powered by Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
