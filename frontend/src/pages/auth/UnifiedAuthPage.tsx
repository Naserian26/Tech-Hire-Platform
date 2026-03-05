import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuthStore } from '../../store/auth.store';
import { ArrowLeft, ArrowRight, Loader2, Briefcase, Users, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000/api/v1';

const COUNTRY_CODES = [
  { code: '+254', flag: '🇰🇪', name: 'KE' },
  { code: '+1',   flag: '🇺🇸', name: 'US' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+27',  flag: '🇿🇦', name: 'ZA' },
  { code: '+234', flag: '🇳🇬', name: 'NG' },
  { code: '+233', flag: '🇬🇭', name: 'GH' },
  { code: '+255', flag: '🇹🇿', name: 'TZ' },
  { code: '+256', flag: '🇺🇬', name: 'UG' },
  { code: '+251', flag: '🇪🇹', name: 'ET' },
  { code: '+91',  flag: '🇮🇳', name: 'IN' },
  { code: '+86',  flag: '🇨🇳', name: 'CN' },
  { code: '+49',  flag: '🇩🇪', name: 'DE' },
  { code: '+33',  flag: '🇫🇷', name: 'FR' },
  { code: '+61',  flag: '🇦🇺', name: 'AU' },
  { code: '+55',  flag: '🇧🇷', name: 'BR' },
  { code: '+971', flag: '🇦🇪', name: 'AE' },
  { code: '+65',  flag: '🇸🇬', name: 'SG' },
  { code: '+81',  flag: '🇯🇵', name: 'JP' },
  { code: '+82',  flag: '🇰🇷', name: 'KR' },
  { code: '+39',  flag: '🇮🇹', name: 'IT' },
];

const isValidEmailFormat = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const UnifiedAuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.setAuth);

  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  type EmailStatus = null | 'checking' | 'valid' | 'invalid-format' | 'taken';
  const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);
  const [emailError, setEmailError] = useState('');
  const [pwdErrors, setPwdErrors] = useState<string[]>([]);
  const [confirmError, setConfirmError] = useState('');

  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('+254');
  const [phone, setPhone] = useState('');

  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (isLogin || step !== 2) return;
    if (!email) { setEmailStatus(null); setEmailError(''); return; }
    if (!isValidEmailFormat(email)) {
      setEmailStatus('invalid-format');
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailStatus('checking');
    setEmailError('');
    const timer = setTimeout(async () => {
      try {
        await axios.post(`${API}/auth/check-email`, { email });
        setEmailStatus('valid');
        setEmailError('');
      } catch (err: any) {
        if (err.response?.status === 409) {
          setEmailStatus('taken');
          setEmailError('This email is already registered. Try signing in.');
        } else {
          setEmailStatus('valid');
          setEmailError('');
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [email, isLogin, step]);

  useEffect(() => {
    if (!password) { setPwdErrors([]); return; }
    const errs: string[] = [];
    if (password.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errs.push('One uppercase letter');
    if (!/[0-9]/.test(password)) errs.push('One number');
    setPwdErrors(errs);
  }, [password]);

  useEffect(() => {
    if (!confirmPassword) { setConfirmError(''); return; }
    setConfirmError(password !== confirmPassword ? 'Passwords do not match.' : '');
  }, [confirmPassword, password]);

  const resetForm = () => {
    setStep(1); setEmail(''); setPassword(''); setConfirmPassword('');
    setFullName(''); setCompanyName(''); setPhone(''); setError(null);
    setEmailStatus(null); setEmailError(''); setPwdErrors([]); setConfirmError('');
    setShowVerifyBanner(false); setResendSent(false);
  };

  const switchToLogin = () => { resetForm(); setIsLogin(true); };
  const switchToRegister = () => { resetForm(); setIsLogin(false); };

  const canSubmitRegister =
    emailStatus === 'valid' && password.length >= 8 &&
    pwdErrors.length === 0 && confirmPassword === password;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res;
      let detectedRole: 'seeker' | 'employer' = 'seeker';
      try {
        res = await axios.post(`${API}/auth/login`, { email, password, portal: 'seeker' });
        detectedRole = 'seeker';
      } catch (seekerErr: any) {
        const detail = seekerErr.response?.data?.detail;
        if (seekerErr.response?.status === 403 && detail?.error === 'ROLE_MISMATCH') {
          res = await axios.post(`${API}/auth/login`, { email, password, portal: 'employer' });
          detectedRole = 'employer';
        } else {
          throw seekerErr;
        }
      }
      login({ id: res.data.id, email: res.data.email, role: res.data.role || detectedRole, token: res.data.access_token });
      navigate(detectedRole === 'seeker' ? '/seeker' : '/employer');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401) setError('Incorrect email or password.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitRegister) return;
    setError(null);
    setLoading(true);
    try {
      const payload = role === 'seeker'
        ? { full_name: fullName, phone: `${countryCode}${phone}`, email, password }
        : { company_name: companyName, phone: `${countryCode}${phone}`, email, password };
      await axios.post(`${API}/auth/register?role=${role}`, payload);
      setShowVerifyBanner(true);
      setStep(1);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409) setError('An account with this email already exists. Please sign in.');
      else if (typeof detail === 'string') setError(detail);
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email });
      setResendSent(true);
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
  };

  const inputCls = (status?: 'error' | 'success') =>
    `w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition pr-11 ${
      status === 'error' ? 'border-red-500 focus:border-red-400'
      : status === 'success' ? 'border-green-500 focus:border-green-400'
      : 'border-slate-700 focus:border-accent-teal'
    }`;

  // ── EMAIL VERIFICATION BANNER ──────────────────────────────────────────────
  if (showVerifyBanner) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We sent a verification link to{' '}
              <span className="text-white font-medium">{email}</span>.
              Click the link to activate your account.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            Didn't receive it?{' '}
            {resendSent ? (
              <span className="text-green-400">✓ Sent! Check your inbox.</span>
            ) : (
              <button onClick={handleResendVerification} disabled={resendLoading}
                className="text-violet-400 hover:text-violet-300 transition font-medium disabled:opacity-60">
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
          </div>
          <button onClick={switchToLogin}
            className="w-full bg-primary-violet hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition">
            Go to Sign In
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : step === 1 ? 'Create Account' : 'Set Up Credentials'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Sign in to your TechHire account' : 'Join thousands finding jobs with AI'}
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button onClick={switchToLogin}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${isLogin ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
            Sign In
          </button>
          <button onClick={switchToRegister}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${!isLogin ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
            Create Account
          </button>
        </div>

        {!isLogin && (
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1 rounded-full transition-all ${step >= 1 ? 'bg-primary-violet' : 'bg-slate-700'}`} />
            <div className={`flex-1 h-1 rounded-full transition-all ${step >= 2 ? 'bg-primary-violet' : 'bg-slate-700'}`} />
            <span className="text-xs text-slate-400 ml-1">Step {step} of 2</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {isLogin && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required className={inputCls()} placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showLoginPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className={inputCls()} placeholder="••••••••" />
                <button type="button" onClick={() => setShowLoginPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-primary-violet hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── REGISTER STEP 1 ── */}
        {!isLogin && step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRole('seeker')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
                    role === 'seeker' ? 'border-accent-teal bg-teal-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  <Briefcase className={`w-5 h-5 ${role === 'seeker' ? 'text-accent-teal' : ''}`} />
                  <span className="text-sm font-medium">Job Seeker</span>
                </button>
                <button type="button" onClick={() => setRole('employer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
                    role === 'employer' ? 'border-primary-violet bg-violet-500/10 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  <Users className={`w-5 h-5 ${role === 'employer' ? 'text-primary-violet' : ''}`} />
                  <span className="text-sm font-medium">Employer</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {role === 'seeker' ? 'Full Name' : 'Company Name'}
              </label>
              <input type="text" value={role === 'seeker' ? fullName : companyName}
                onChange={(e) => role === 'seeker' ? setFullName(e.target.value) : setCompanyName(e.target.value)}
                required className={inputCls()} placeholder={role === 'seeker' ? 'Jane Doe' : 'Acme Corp'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:border-accent-teal outline-none transition w-28 shrink-0">
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.name} value={c.code}>{c.name} {c.code}</option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                  placeholder="712 345 678" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-primary-violet hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── REGISTER STEP 2 ── */}
        {!isLogin && step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className={inputCls(
                    emailStatus === 'valid' ? 'success'
                    : (emailStatus === 'invalid-format' || emailStatus === 'taken') ? 'error'
                    : undefined
                  )} placeholder="you@example.com" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {emailStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                  {emailStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {(emailStatus === 'invalid-format' || emailStatus === 'taken') && <XCircle className="w-4 h-4 text-red-500" />}
                </span>
              </div>
              {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
              {emailStatus === 'valid' && <p className="text-green-400 text-xs mt-1">✓ Email is available</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className={inputCls(
                    password && pwdErrors.length === 0 ? 'success'
                    : password && pwdErrors.length > 0 ? 'error' : undefined
                  )} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && pwdErrors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {pwdErrors.map(e => (
                    <li key={e} className="text-red-400 text-xs flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" /> {e}
                    </li>
                  ))}
                </ul>
              )}
              {password && pwdErrors.length === 0 && <p className="text-green-400 text-xs mt-1">✓ Strong password</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required
                  className={inputCls(
                    confirmPassword && !confirmError ? 'success'
                    : confirmPassword && confirmError ? 'error' : undefined
                  )} placeholder="Re-enter your password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmError && <p className="text-red-400 text-xs mt-1">{confirmError}</p>}
              {confirmPassword && !confirmError && <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={loading || !canSubmitRegister}
                className="flex-1 bg-primary-violet hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Get Started'}
              </button>
            </div>
          </form>
        )}

      </div>
    </AuthLayout>
  );
};

export default UnifiedAuthPage;