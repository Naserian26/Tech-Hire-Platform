import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { Loader2, Edit2, Save, XCircle, Building2 } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';
const INDUSTRY_OPTIONS = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Media', 'Consulting', 'Government', 'Other'];
const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+'];

type FormFields = {
  company_name: string;
  phone: string;
  location: string;
  industry: string;
  company_size: string;
  website: string;
  description: string;
};

type Errors = Partial<Record<keyof FormFields, string>>;

const EmployerProfile = () => {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const emptyForm: FormFields = { company_name: '', phone: '', location: '', industry: '', company_size: '', website: '', description: '' };
  const [saved, setSaved] = useState<FormFields>(emptyForm);
  const [form, setForm] = useState<FormFields>(emptyForm);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/employer/profile?employer_id=${user?.id}`);
        const data: FormFields = {
          company_name: res.data.company_name || '',
          phone: res.data.phone || '',
          location: res.data.location || '',
          industry: res.data.industry || '',
          company_size: res.data.company_size || '',
          website: res.data.website || '',
          description: res.data.description || '',
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

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.company_name.trim()) e.company_name = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.location.trim()) e.location = 'Required';
    if (!form.industry) e.industry = 'Required';
    if (!form.company_size) e.company_size = 'Required';
    if (!form.description.trim()) e.description = 'Required';
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
      await axios.put(`${API}/employer/profile?employer_id=${user?.id}`, form);
      setSaved({ ...form });
      setEditing(false);
      setErrors({});
    } catch (err: any) {
      setErrors({ company_name: err.response?.data?.detail || 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setForm({ ...saved }); setErrors({}); setEditing(false); };

  const requiredFields: (keyof FormFields)[] = ['company_name', 'phone', 'location', 'industry', 'company_size', 'description'];
  const filled = requiredFields.filter(f => saved[f]).length;
  const strength = Math.round((filled / requiredFields.length) * 100);

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${value ? 'text-white' : 'text-slate-600 italic'}`}>{value || '—'}</p>
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
            <Building2 className="w-8 h-8 text-primary-violet" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{saved.company_name || 'Company Profile'}</h1>
            <p className="text-slate-400 text-sm">{saved.industry || 'No industry set'}</p>
            <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
          </div>
        </div>

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
          <span className="text-sm text-slate-300 font-medium">Profile Completeness</span>
          <span className={`text-sm font-bold ${strength === 100 ? 'text-accent-teal' : strength >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {strength}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all duration-500 ${strength === 100 ? 'bg-accent-teal' : strength >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${strength}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {strength === 100 ? '✓ Profile complete!' : 'Complete your profile to attract better candidates'}
        </p>
      </div>

      {/* Validation error */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          Please fill in all required fields before saving.
        </div>
      )}

      {/* Company Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Company Information</h2>

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Company Name" value={saved.company_name} />
            <Field label="Phone" value={saved.phone} />
            <Field label="Location" value={saved.location} />
            <Field label="Website" value={saved.website} />
            <Field label="Industry" value={saved.industry} />
            <Field label="Company Size" value={saved.company_size ? `${saved.company_size} employees` : ''} />
            <div className="md:col-span-2">
              <Field label="Description" value={saved.description} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div data-error={!!errors.company_name}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name <span className="text-red-400">*</span></label>
                <input name="company_name" value={form.company_name} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.company_name ? 'border-red-500' : 'border-slate-700'}`}
                  placeholder="Acme Corp" />
                <InputError field="company_name" />
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Website <span className="text-slate-500 text-xs">(optional)</span></label>
                <input name="website" value={form.website} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition"
                  placeholder="https://company.com" />
              </div>
              <div data-error={!!errors.industry}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Industry <span className="text-red-400">*</span></label>
                <select name="industry" value={form.industry} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.industry ? 'border-red-500' : 'border-slate-700'}`}>
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <InputError field="industry" />
              </div>
              <div data-error={!!errors.company_size}>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Size <span className="text-red-400">*</span></label>
                <select name="company_size" value={form.company_size} onChange={handleChange}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition ${errors.company_size ? 'border-red-500' : 'border-slate-700'}`}>
                  <option value="">Select size</option>
                  {COMPANY_SIZE_OPTIONS.map(o => <option key={o} value={o}>{o} employees</option>)}
                </select>
                <InputError field="company_size" />
              </div>
            </div>
            <div data-error={!!errors.description}>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company Description <span className="text-red-400">*</span></label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={5}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-accent-teal outline-none transition resize-none ${errors.description ? 'border-red-500' : 'border-slate-700'}`}
                placeholder="Tell candidates about your company, culture, and mission..." />
              <InputError field="description" />
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

export default EmployerProfile;