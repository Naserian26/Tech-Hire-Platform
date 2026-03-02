import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, ChevronLeft, AlertTriangle, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? 'bg-accent-teal' : 'bg-slate-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showPhone: false,
    allowRecruiterContact: true,
    dataAnalytics: true,
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggle = (key: keyof typeof privacy) => {
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePasswordSave = () => {
    if (!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm) return;
    setPwSaved(true);
    setPasswords({ current: '', newPass: '', confirm: '' });
    setTimeout(() => setPwSaved(false), 2000);
  };

  const handlePrefSave = () => {
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  };

  const Section = ({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary-violet/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-violet" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-base">{title}</h2>
          {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Row = ({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
      </div>
      <Toggle enabled={enabled} onChange={onToggle} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">Privacy & Security</h1>
          <p className="text-slate-400 text-sm">Manage your account security and data privacy</p>
        </div>
      </div>

      <Section icon={Eye} title="Profile Privacy" subtitle="Control what others can see">
        <Row label="Public Profile" desc="Allow employers to find your profile" enabled={privacy.profileVisible} onToggle={() => toggle('profileVisible')} />
        <div className="border-t border-slate-800" />
        <Row label="Show Email Address" desc="Display your email on your profile" enabled={privacy.showEmail} onToggle={() => toggle('showEmail')} />
        <div className="border-t border-slate-800" />
        <Row label="Show Phone Number" desc="Display your phone on your profile" enabled={privacy.showPhone} onToggle={() => toggle('showPhone')} />
        <div className="border-t border-slate-800" />
        <Row label="Allow Recruiter Contact" desc="Let recruiters reach out to you directly" enabled={privacy.allowRecruiterContact} onToggle={() => toggle('allowRecruiterContact')} />
        <div className="border-t border-slate-800" />
        <Row label="Analytics & Improvements" desc="Help improve TechHire with anonymous usage data" enabled={privacy.dataAnalytics} onToggle={() => toggle('dataAnalytics')} />
      </Section>

      <button
        onClick={handlePrefSave}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 mb-4 ${
          prefSaved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
        }`}
      >
        {prefSaved ? '✓ Privacy Settings Saved' : 'Save Privacy Settings'}
      </button>

      <Section icon={Key} title="Change Password" subtitle="Use a strong, unique password">
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Current Password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={passwords.current}
            onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-violet transition"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">New Password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={passwords.newPass}
            onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-violet transition"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Confirm New Password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={passwords.confirm}
            onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-violet transition"
            placeholder="••••••••"
          />
          {passwords.confirm && passwords.newPass !== passwords.confirm && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
          )}
        </div>
        <button
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
        >
          {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPasswords ? 'Hide' : 'Show'} passwords
        </button>
        <button
          onClick={handlePasswordSave}
          disabled={!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            pwSaved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-primary-violet text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {pwSaved ? '✓ Password Updated' : 'Update Password'}
        </button>
      </Section>

      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Danger Zone</h2>
            <p className="text-slate-500 text-xs">These actions are irreversible</p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-4 h-4" /> Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-300 text-sm">Are you sure? This will permanently delete your account and all data.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="flex-1 py-2.5 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 transition font-medium"
              >
                Yes, Delete Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySecurity;