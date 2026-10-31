import React, { useState } from 'react';
import { ChefHat, X } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../lib/auth';

export type AuthMode = 'signin' | 'signup';

interface AuthPageProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2.5 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition';

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onModeChange, onClose }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation } = await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim()
        );
        if (needsEmailConfirmation) {
          setConfirmationSent(true);
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <span className="text-base font-bold text-zinc-900">CulinaryVault</span>
        </div>

        {confirmationSent ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900">Check your email</h2>
            <p className="text-sm text-zinc-600">
              We sent a confirmation link to <span className="font-semibold">{email}</span>. Open it to finish creating your account.
            </p>
            <button
              type="button"
              onClick={() => onModeChange('signin')}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-zinc-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-zinc-500 mt-1 mb-6">
              {isSignUp
                ? 'Save your recipes, macros, and profile to your account.'
                : 'Sign in to pick up where you left off.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                {isSignUp && (
                  <p className="text-xs text-zinc-500 mt-1.5">At least 6 characters.</p>
                )}
              </div>
              {isSignUp && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {error && (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
              >
                {submitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="text-sm text-zinc-600 text-center mt-6">
              {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onModeChange(isSignUp ? 'signin' : 'signup');
                }}
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
