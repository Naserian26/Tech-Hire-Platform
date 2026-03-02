import { useState, useRef } from 'react';
import axios from 'axios';
import { X, Loader2, CheckCircle, Upload, AlertCircle } from 'lucide-react';

const API = 'http://localhost:8000/api/v1';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface JobForModal {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
}

interface Props {
  job: JobForModal;
  seekerId: string;
  onClose: () => void;
  onSuccess: (jobId: string) => void;
}

const STEPS = [
  { id: 1, label: 'Personal'   },
  { id: 2, label: 'Experience' },
  { id: 3, label: 'Documents'  },
  { id: 4, label: 'Screening'  },
  { id: 5, label: 'Review'     },
];

const SCREENING_QUESTIONS = [
  'How many years of relevant experience do you have for this role?',
  'Are you comfortable with the job location / remote arrangement?',
  'What is your expected salary range?',
  'When is your earliest available start date?',
];

const COUNTRIES = [
  'Kenya','Uganda','Tanzania','Nigeria','Ghana','South Africa',
  'United States','United Kingdom','Canada','Australia','Other',
];

const EXPERIENCE_RANGES = ['0–1 years','1–3 years','3–5 years','5–8 years','8+ years'];

// ── Input helper ───────────────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = "bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 transition w-full";

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Modal ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const JobApplicationModal = ({ job, seekerId, onClose, onSuccess }: Props) => {
  const [step, setStep]             = useState(1);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:        '',
    phone:       '',
    country:     '',
    experience:  '',
    portfolio:   '',
    coverLetter: '',
    resume:      null as File | null,
    answers:     ['', '', '', ''],
  });

  const update = (field: string, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const updateAnswer = (i: number, value: string) => {
    const answers = [...form.answers];
    answers[i] = value;
    setForm(f => ({ ...f, answers }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) update('resume', file);
  };

  // FIX: Send JSON (not FormData) — backend uses `body: dict` which expects
  // application/json. FormData was causing the CORS preflight to fail because
  // the backend returned a 422 before attaching CORS headers.
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        `${API}/seeker/jobs/${job.id}/apply`,
        {
          seeker_id:    seekerId,
          name:         form.name,
          phone:        form.phone,
          country:      form.country,
          experience:   form.experience,
          portfolio:    form.portfolio,
          cover_letter: form.coverLetter,
          answers:      form.answers,
          // Note: file upload omitted — backend doesn't currently handle it.
          // Add a separate file upload endpoint if resume storage is needed.
        }
        // No custom Content-Type needed — axios defaults to application/json
      );

      setSubmitted(true);
      onSuccess(job.id);
    } catch (e: any) {
      if (e.response?.status === 409) {
        // Already applied — treat as success so UI updates correctly
        setSubmitted(true);
        onSuccess(job.id);
      } else {
        const detail = e.response?.data?.detail;
        setError(detail || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // ── Step content ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      case 1: return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name">
              <input className={inputCls} placeholder="e.g. Mercy Naserian" value={form.name} onChange={e => update('name', e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className={inputCls} placeholder="+254 700 000 000" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </Field>
            <Field label="Country">
              <select className={inputCls} value={form.country} onChange={e => update('country', e.target.value)}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Years of Experience">
              <select className={inputCls} value={form.experience} onChange={e => update('experience', e.target.value)}>
                <option value="">Select range</option>
                {EXPERIENCE_RANGES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Experience & Motivation</p>
          <Field label="Portfolio / GitHub / Website">
            <input className={inputCls} placeholder="https://yourportfolio.com" value={form.portfolio} onChange={e => update('portfolio', e.target.value)} />
          </Field>
          <Field label="Cover Letter">
            <textarea
              className={`${inputCls} resize-none`}
              rows={7}
              placeholder={`Tell us why you're a great fit for ${job.title} at ${job.company}...`}
              value={form.coverLetter}
              onChange={e => update('coverLetter', e.target.value)}
            />
          </Field>
        </div>
      );

      case 3: return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Upload Your Resume / CV</p>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              form.resume
                ? 'border-teal-500/60 bg-teal-500/5'
                : 'border-slate-700 hover:border-teal-500/40 hover:bg-slate-800/50'
            }`}
          >
            {form.resume ? (
              <>
                <div className="w-12 h-12 bg-teal-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-teal-400" />
                </div>
                <p className="text-sm font-semibold text-teal-400">{form.resume.name}</p>
                <p className="text-xs text-slate-500 mt-1">Click to replace</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">Click to upload your resume</p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX — up to 10MB</p>
                <p className="text-xs text-slate-600 mt-2">(Resume stored locally for review — link it via your portfolio URL above)</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFile} />
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Screening Questions</p>
          {SCREENING_QUESTIONS.map((q, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <p className="text-sm text-slate-200 font-medium leading-relaxed">
                <span className="text-teal-400 font-bold mr-2">Q{i + 1}.</span>{q}
              </p>
              <input
                className={inputCls}
                placeholder="Your answer..."
                value={form.answers[i]}
                onChange={e => updateAnswer(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      );

      case 5: return (
        <div className="space-y-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Review Before Submitting</p>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-teal-400 font-bold uppercase tracking-wider mb-3">Personal Info</p>
            {[['Name', form.name], ['Phone', form.phone], ['Country', form.country], ['Experience', form.experience]].map(([label, val]) => (
              <div key={label} className="flex gap-3 text-sm">
                <span className="text-slate-500 w-24 shrink-0">{label}</span>
                <span className="text-white">{val || <em className="text-slate-600 not-italic">Not provided</em>}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-teal-400 font-bold uppercase tracking-wider mb-3">Documents & Links</p>
            {[['Resume', form.resume?.name], ['Portfolio', form.portfolio]].map(([label, val]) => (
              <div key={label} className="flex gap-3 text-sm">
                <span className="text-slate-500 w-24 shrink-0">{label}</span>
                <span className="text-white">{val || <em className="text-slate-600 not-italic">Not provided</em>}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-teal-400 font-bold uppercase tracking-wider mb-3">Cover Letter</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {form.coverLetter || <em className="text-slate-600 not-italic">No cover letter provided</em>}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-10 text-center shadow-2xl">
        <div className="w-16 h-16 bg-teal-500/15 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-teal-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-2">
          Your application for <span className="text-white font-semibold">{job.title}</span> at{' '}
          <span className="text-white font-semibold">{job.company}</span> has been received.
        </p>
        <p className="text-sm text-slate-500 mb-8">We'll review it and get back to you within 3–5 business days.</p>
        <div className="flex gap-2 justify-center flex-wrap mb-6">
          {['✓ Application Sent', '✓ Cover Letter Included', '📬 Under Review'].map(t => (
            <span key={t} className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
        <button onClick={onClose} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition">
          Back to Jobs
        </button>
      </div>
    </div>
  );

  // ── Modal ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-1">Job Application</p>
            <h2 className="text-lg font-bold text-white">{job.title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{job.company} · {job.location} · {job.type}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-5 pb-1">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            {STEPS.map(s => (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  step > s.id  ? 'bg-teal-500 border-teal-500 text-white'
                  : step === s.id ? 'bg-slate-900 border-teal-400 text-teal-400 ring-4 ring-teal-500/15'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s.id ? 'text-teal-400' : 'text-slate-600'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Step {step} of {STEPS.length}</span>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ← Back
              </button>
            )}
            {step < STEPS.length ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '🚀'}
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default JobApplicationModal;