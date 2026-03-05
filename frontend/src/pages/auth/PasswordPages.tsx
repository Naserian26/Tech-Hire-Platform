import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { Loader2, Mail, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000/api/v1';

const inputCls = (status?: 'error' | 'success') =>
  `w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition ${
    status === 'error'
      ? 'border-red-500 focus:border-red-400'
      : status === 'success'
      ? 'border-green-500 focus:border-green-400'
      : 'border-slate-700 focus:border-violet-500'
  }`;

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
          <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <p className="text-slate-300 text-sm">
              If <span className="text-white font-medium">{email}</span> is registered,
              you'll receive a reset link shortly. Check your spam folder too.
            </p>
            <Link to="/auth?mode=login"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputCls()}
                  placeholder="you@example.com"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <Link to="/auth?mode=login"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD PAGE  (/reset-password?token=xxx)
// ─────────────────────────────────────────────────────────────────────────────
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const pwdErrors: string[] = [];
  if (password && password.length < 8) pwdErrors.push('At least 8 characters');
  if (password && !/[A-Z]/.test(password)) pwdErrors.push('One uppercase letter');
  if (password && !/[0-9]/.test(password)) pwdErrors.push('One number');
  const confirmError = confirm && password !== confirm ? 'Passwords do not match.' : '';
  const canSubmit = password.length >= 8 && pwdErrors.length === 0 && !confirmError && confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/auth?mode=login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <AuthLayout>
      <div className="text-center space-y-4">
        <p className="text-red-400">Invalid reset link.</p>
        <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 text-sm">Request a new one</Link>
      </div>
    </AuthLayout>
  );

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-slate-400 text-sm">Choose a strong new password</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <p className="text-slate-300 text-sm">Password reset! Redirecting you to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}{' '}
                <Link to="/forgot-password" className="underline hover:text-red-300">Request a new link</Link>
              </div>
            )}

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className={inputCls(password && pwdErrors.length === 0 ? 'success' : password && pwdErrors.length > 0 ? 'error' : undefined)}
                  placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && pwdErrors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {pwdErrors.map(e => <li key={e} className="text-red-400 text-xs">· {e}</li>)}
                </ul>
              )}
              {password && pwdErrors.length === 0 && <p className="text-green-400 text-xs mt-1">✓ Strong password</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required
                  className={inputCls(confirm && !confirmError ? 'success' : confirm && confirmError ? 'error' : undefined)}
                  placeholder="Re-enter your password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmError && <p className="text-red-400 text-xs mt-1">{confirmError}</p>}
              {confirm && !confirmError && <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>}
            </div>

            <button type="submit" disabled={loading || !canSubmit}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// VERIFY EMAIL PAGE  (/verify-email?token=xxx)
// ─────────────────────────────────────────────────────────────────────────────
export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }
    axios.get(`${API}/auth/verify-email?token=${token}`)
      .then(() => { setStatus('success'); setTimeout(() => navigate('/auth?mode=login'), 3000); })
      .catch((err) => { setStatus('error'); setMessage(err.response?.data?.detail || 'Verification failed.'); });
  }, [token]);

  return (
    <AuthLayout>
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <><Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto" />
          <p className="text-slate-400">Verifying your email...</p></>
        )}
        {status === 'success' && (
          <><div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-white font-semibold">Email verified!</p>
          <p className="text-slate-400 text-sm">Redirecting you to sign in...</p></>
        )}
        {status === 'error' && (
          <><p className="text-red-400">{message}</p>
          <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 text-sm underline">
            Request a new link
          </Link></>
        )}
      </div>
    </AuthLayout>
  );
};