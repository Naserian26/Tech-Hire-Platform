import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { Loader2, Plus, X, Edit2, Save, XCircle, User, MapPin, Phone, Briefcase, Link, Clock } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const EXPERIENCE_OPTIONS = ['0-1', '1-3', '3-5', '5-10', '10+'];

type FormFields = {
  full_name: string;
  phone: string;
  location: string;
  current_role: string;
  bio: string;
  skills: string[];
  years_experience: string;
  linkedin_url: string;
};

type Errors = Partial<Record<keyof FormFields, string>>;

const SeekerProfile = () => {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [skillInput, setSkillInput] = useState('');

  const emptyForm: FormFields = {
    full_name: '', phone: '', location: '', current_role: '',
    bio: '', skills: [], years_experience: '', linkedin_url: '',
  };

  const [saved, setSaved] = useState<FormFields>(emptyForm);
  const [form, setForm] = useState<FormFields>(emptyForm);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/seeker/profile?seeker_id=${user?.id}`);
        const data: FormFields = {
          full_name: res.data.full_name || '',
          phone: res.data.phone || '',
          location: res.data.location || '',
          current_role: res.data.current_role || '',
          bio: res.data.bio || '',
          skills: res.data.skills || [],
          years_experience: res.data.years_experience || '',
          linkedin_url: res.data.linkedin_url || '',
        };
        setSaved(data);
        setForm(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormFields]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const addSkill = () => {
    const parts = skillInput.split(',').map(s => s.trim()).filter(s => s && !form.skills.includes(s));
    if (parts.length > 0) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, ...parts] }));
      if (errors.skills) setErrors(prev => ({ ...prev, skills: undefined }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.full_name.trim()) e.full_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.location.trim()) e.location = 'Required';
    if (!form.current_role.trim()) e.current_role = 'Required';
    if (!form.bio.trim()) e.bio = 'Required';
    if (form.skills.length === 0) e.skills = 'Add at least one skill';
    if (!form.years_experience) e.years_experience = 'Required';
    if (!form.linkedin_url.trim()) e.linkedin_url = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/seeker/profile?seeker_id=${user?.id}`, form);
      setSaved({ ...form });
      setEditing(false);
      setErrors({});
    } catch (err: any) {
      setErrors({ full_name: err.response?.data?.detail || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...saved });
    setErrors({});
    setEditing(false);
  };

  // Profile strength based on saved data
  const strengthFields: (keyof FormFields)[] = ['full_name', 'phone', 'location', 'current_role', 'bio', 'linkedin_url', 'years_experience'];
  const filled = strengthFields.filter(f => saved[f]).length + (saved.skills.length > 0 ? 1 : 0);
  const strength = Math.round((filled / (strengthFields.length + 1)) * 100);

  const Field = ({ label, value, placeholder = '—' }: { label: string; value: string; placeholder?: string }) => (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${value ? 'text-white' : 'text-slate-600 italic'}`}>{value || placeholder}</p>
    </div>
  );

  const InputError = ({ field }: { field: keyof FormFields }) =>
    errors[field] ? <p className="text-red-400 text-xs mt-1">{errors[field]}</p> : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-violet/20 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-primary-violet" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{saved.full_name || 'Your Profile'}</h1>
            <p className="text-slate-400 text-sm">{saved.current_role || 'No title set'}</p>
            <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Edit / Save / Cancel buttons */}
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm transition"
          >
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 px-4 py-2 rounded-lg text-sm transition"
            >
              <XCircle className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-primary-violet hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile strength */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300 font-medium">Profile Strength</span>
          <span className={`text-sm font-bold ${strength === 100 ? 'text-accent-teal' : strength >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {strength}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${strength === 100 ? 'bg-accent-teal' : strength >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${strength}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {strength === 100 ? '✓ Profile complete!' : 'Complete your profile to improve job matches'}
        </p>
      </div>

      {/* Validation error summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          Please fill in all required fields before saving.
        </div>
      )}

      {/* Basic Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" /> Basic Information
        </h2>

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Full Name" value={saved.full_name} />
            <Field label="Phone" value={saved.phone} />
            <Field label="Location" value={saved.location} />
            <Field label="Job Title / Headline" value={saved.current_role} />
            <div className="md:col-span-2">
              <Field label="Bio / Summary" value={saved.bio} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-error={!!errors.full_name}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name <span className="text-red-400">*</span></label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.full_name ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Jane Doe" />
                <InputError field="full_name" />
              </div>
              <div data-error={!!errors.phone}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone <span className="text-red-400">*</span></label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.phone ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="+254 712 345 678" />
                <InputError field="phone" />
              </div>
              <div data-error={!!errors.location}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Location <span className="text-red-400">*</span></label>
                <input name="location" value={form.location} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.location ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Nairobi, Kenya" />
                <InputError field="location" />
              </div>
              <div data-error={!!errors.current_role}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Job Title / Headline <span className="text-red-400">*</span></label>
                <input name="current_role" value={form.current_role} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.current_role ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Frontend Developer" />
                <InputError field="current_role" />
              </div>
            </div>
            <div data-error={!!errors.bio}>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bio / Summary <span className="text-red-400">*</span></label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={4}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition resize-none ${errors.bio ? 'border-red-500' : 'border-slate-700'}`}
                placeholder="Tell employers about yourself..." />
              <InputError field="bio" />
            </div>
          </div>
        )}
      </div>

      {/* Professional Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-400" /> Professional Details
        </h2>

        {!editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Years of Experience" value={saved.years_experience ? `${saved.years_experience} years` : ''} />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">LinkedIn</p>
                {saved.linkedin_url ? (
                  <a href={saved.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-accent-teal hover:underline break-all">
                    View LinkedIn Profile →
                  </a>
                ) : (
                  <p className="text-slate-600 italic text-sm">—</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Skills</p>
              {saved.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {saved.skills.map(s => (
                    <span key={s} className="bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full text-sm">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 italic text-sm">No skills added</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-error={!!errors.years_experience}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience <span className="text-red-400">*</span></label>
                <select name="years_experience" value={form.years_experience} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.years_experience ? 'border-red-500' : 'border-slate-700'}`}
                >
                  <option value="">Select experience</option>
                  {EXPERIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} years</option>)}
                </select>
                <InputError field="years_experience" />
              </div>
              <div data-error={!!errors.linkedin_url}>
                <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn URL <span className="text-red-400">*</span></label>
                <input name="linkedin_url" value={form.linkedin_url} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.linkedin_url ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="https://linkedin.com/in/username" />
                <InputError field="linkedin_url" />
              </div>
            </div>
            <div data-error={!!errors.skills}>
              <label className="block text-sm font-medium text-slate-300 mb-2">Skills <span className="text-red-400">*</span></label>
              <div className="flex gap-2 mb-3">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  className={`flex-1 bg-slate-800 border rounded-lg px-4 py-2 text-white focus:border-accent-teal outline-none transition text-sm ${errors.skills ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="e.g. React, Python — press Enter or click Add" />
                <button type="button" onClick={addSkill}
                  className="bg-accent-teal hover:opacity-90 text-slate-900 px-4 py-2 rounded-lg transition flex items-center gap-1 text-sm font-medium">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.skills.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1 rounded-full text-sm">
                    {s} <button type="button" onClick={() => removeSkill(s)}><X className="w-3 h-3 hover:text-red-400" /></button>
                  </span>
                ))}
                {form.skills.length === 0 && <span className="text-slate-500 text-sm italic">No skills added yet</span>}
              </div>
              <InputError field="skills" />
            </div>
          </div>
        )}
      </div>

      {/* Account Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
          <p className="text-sm text-slate-400">{user?.email}</p>
          <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
        </div>
      </div>

    </div>
  );
};

export default SeekerProfile;