import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { useAuthStore } from '../../store/auth.store';
import { ArrowLeft, ArrowRight, Loader2, Briefcase, Users } from 'lucide-react';
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

const UnifiedAuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.setAuth);

  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register step 1 fields
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [countryCode, setCountryCode] = useState('+254');
  const [phone, setPhone] = useState('');

  const resetForm = () => {
    setStep(1);
    setEmail('');
    setPassword('');
    setFullName('');
    setCompanyName('');
    setPhone('');
    setError(null);
  };

  const switchToLogin = () => { resetForm(); setIsLogin(true); };
  const switchToRegister = () => { resetForm(); setIsLogin(false); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Try seeker first, then employer
      let res;
      let detectedRole: 'seeker' | 'employer' = 'seeker';

      try {
        res = await axios.post(`${API}/auth/login`, { email, password, portal: 'seeker' });
        detectedRole = 'seeker';
      } catch (seekerErr: any) {
        const detail = seekerErr.response?.data?.detail;
        if (seekerErr.response?.status === 403 && detail?.error === 'ROLE_MISMATCH') {
          // User is an employer, try employer portal
          res = await axios.post(`${API}/auth/login`, { email, password, portal: 'employer' });
          detectedRole = 'employer';
        } else {
          throw seekerErr;
        }
      }

      login({
        id: res.data.id,
        email: res.data.email,
        role: res.data.role || detectedRole,
        token: res.data.access_token,
      });

      navigate(detectedRole === 'seeker' ? '/seeker' : '/employer');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401) {
        setError('Incorrect email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = role === 'seeker'
        ? { full_name: fullName, phone: `${countryCode}${phone}`, email, password }
        : { company_name: companyName, phone: `${countryCode}${phone}`, email, password };

      await axios.post(`${API}/auth/register?role=${role}`, payload);

      const res = await axios.post(`${API}/auth/login`, { email, password, portal: role });

      login({
        id: res.data.id,
        email: res.data.email,
        role: res.data.role,
        token: res.data.access_token,
      });

      navigate(role === 'seeker' ? '/seeker' : '/employer');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409) {
        setError('An account with this email already exists. Please sign in.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : step === 1 ? 'Create Account' : 'Set Up Credentials'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Sign in to your TechHire account' : 'Join thousands finding jobs with AI'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button
            onClick={switchToLogin}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${isLogin ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign In
          </button>
          <button
            onClick={switchToRegister}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${!isLogin ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Create Account
          </button>
        </div>

        {/* Step progress (register only) */}
        {!isLogin && (
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1 rounded-full transition-all ${step >= 1 ? 'bg-primary-violet' : 'bg-slate-700'}`} />
            <div className={`flex-1 h-1 rounded-full transition-all ${step >= 2 ? 'bg-primary-violet' : 'bg-slate-700'}`} />
            <span className="text-xs text-slate-400 ml-1">Step {step} of 2</span>
          </div>
        )}

        {/* Error */}
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
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-violet hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        )}

        {/* ── REGISTER STEP 1 ── */}
        {!isLogin && step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('seeker')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
                    role === 'seeker'
                      ? 'border-accent-teal bg-teal-500/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Briefcase className={`w-5 h-5 ${role === 'seeker' ? 'text-accent-teal' : ''}`} />
                  <span className="text-sm font-medium">Job Seeker</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('employer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
                    role === 'employer'
                      ? 'border-primary-violet bg-violet-500/10 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Users className={`w-5 h-5 ${role === 'employer' ? 'text-primary-violet' : ''}`} />
                  <span className="text-sm font-medium">Employer</span>
                </button>
              </div>
            </div>

            {/* Name field — changes label based on role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {role === 'seeker' ? 'Full Name' : 'Company Name'}
              </label>
              <input
                type="text"
                value={role === 'seeker' ? fullName : companyName}
                onChange={(e) => role === 'seeker' ? setFullName(e.target.value) : setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                placeholder={role === 'seeker' ? 'Jane Doe' : 'Acme Corp'}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:border-accent-teal outline-none transition w-28 shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.name} value={c.code}>
                      {c.name} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                  placeholder="712 345 678"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-violet hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── REGISTER STEP 2 ── */}
        {!isLogin && step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-violet hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
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