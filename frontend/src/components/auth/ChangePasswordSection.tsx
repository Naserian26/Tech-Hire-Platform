import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';

const API = 'http://localhost:8000/api/v1';

const inputCls = (status?: 'error' | 'success') =>
  `w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition pr-11 ${
    status === 'error' ? 'border-red-500 focus:border-red-400'
    : status === 'success' ? 'border-green-500 focus:border-green-400'
    : 'border-slate-700 focus:border-violet-500'
  }`;

const ChangePasswordSection = () => {
  const token = useAuthStore((s) => s.token);

  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const pwdErrors: string[] = [];
  if (newPwd && newPwd.length < 8) pwdErrors.push('At least 8 characters');
  if (newPwd && !/[A-Z]/.test(newPwd)) pwdErrors.push('One uppercase letter');
  if (newPwd && !/[0-9]/.test(newPwd)) pwdErrors.push('One number');
  const confirmError = confirm && newPwd !== confirm ? 'Passwords do not match.' : '';
  const canSubmit = current && newPwd.length >= 8 && pwdErrors.length === 0 && !confirmError && confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        { current_password: current, new_password: newPwd },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setCurrent(''); setNewPwd(''); setConfirm('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-white font-semibold text-lg">Change Password</h3>
        <p className="text-slate-400 text-sm mt-1">Update your password to keep your account secure.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Password changed successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current password */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} value={current}
              onChange={(e) => setCurrent(e.target.value)} required
              className={inputCls()} placeholder="Your current password" />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} required
              className={inputCls(newPwd && pwdErrors.length === 0 ? 'success' : newPwd && pwdErrors.length > 0 ? 'error' : undefined)}
              placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {newPwd && pwdErrors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {pwdErrors.map(e => <li key={e} className="text-red-400 text-xs">· {e}</li>)}
            </ul>
          )}
          {newPwd && pwdErrors.length === 0 && <p className="text-green-400 text-xs mt-1">✓ Strong password</p>}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required
              className={inputCls(confirm && !confirmError ? 'success' : confirm && confirmError ? 'error' : undefined)}
              placeholder="Re-enter new password" />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmError && <p className="text-red-400 text-xs mt-1">{confirmError}</p>}
          {confirm && !confirmError && <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>}
        </div>

        <button type="submit" disabled={loading || !canSubmit}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition flex items-center gap-2 text-sm">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordSection;