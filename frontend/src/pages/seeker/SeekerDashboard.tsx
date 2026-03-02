import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import {
  BarChart3, Briefcase, MessageSquare, CalendarDays, Search,
  Send, Phone, Video, Loader2, AlertCircle, Bell,
  MapPin, Clock, ChevronRight, BookmarkPlus, Bookmark,
  Users, FileText, Activity, Building2,
  ArrowUpRight, Bot, Sparkles, Settings, LogOut, Sun, Moon
} from 'lucide-react';
import JobApplicationModal from './JobApplicationModal';
import type { JobForModal } from './JobApplicationModal';

const API = 'http://localhost:8000/api/v1';
const AVATAR_COLORS = ['bg-violet-500','bg-teal-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500'];

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats { profile_strength: number; total_applications: number; interviews: number; saved_jobs: number; }
interface Application { id: string; job_id: string; job_title: string; company: string; location: string; type: string; stage: string; match_score: number; days_ago: number; applied_at: string; }
interface Interview { id: string; job_title: string; company: string; scheduled_at: string; interview_type: string; status: string; }
interface JobRec { id: string; title: string; company: string; location: string; type: string; salary_min: number | null; salary_max: number | null; match_score: number | null; experience_level: string; already_applied?: boolean; saved?: boolean; description?: string; skills?: string[]; days_ago?: number; }
interface Conversation { id: string; employer_id: string; employer_name: string; employer_avatar: string; last_message: string; last_message_time: string; unread_count: number; }
interface Message { id: string; sender: 'employer' | 'candidate'; text: string; created_at: string; }
interface AiMessage { role: 'user' | 'assistant'; text: string; }
type Theme = 'dark' | 'light';

// ── Helpers ────────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />
);

const formatDate = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (sameDay(date, now)) return `Today · ${time}`;
  if (sameDay(date, tomorrow)) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
};

const formatSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
};

const STAGE_STYLE: Record<string, string> = {
  APPLIED:   'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  SCREENING: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  INTERVIEW: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  OFFER:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  HIRED:     'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};
const STAGE_STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

const NAV = [
  { icon: BarChart3,    label: 'Overview',     tab: 'overview'    },
  { icon: Briefcase,    label: 'Jobs',         tab: 'jobs'        },
  { icon: FileText,     label: 'Applications', tab: 'applications'},
  { icon: MessageSquare,label: 'Messages',     tab: 'messages'    },
  { icon: CalendarDays, label: 'Interviews',   tab: 'interviews'  },
  { icon: Bot,          label: 'AI Coach',     tab: 'ai'          },
];

// ── Settings Dropdown ─────────────────────────────────────────────────────────
const SettingsDropdown = ({ onSignOut, theme, onThemeChange }: {
  onSignOut: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg transition ${open ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
      >
        <Settings className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settings</p>
          </div>
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-2 font-medium">Appearance</p>
            <div className="flex gap-1.5">
              {([
                { value: 'dark'  as Theme, label: 'Dark',  icon: Moon },
                { value: 'light' as Theme, label: 'Light', icon: Sun  },
              ]).map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => onThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                    theme === value ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition font-medium">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ seekerId, onNavigate }: { seekerId: string; onNavigate: (tab: string) => void }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recs, setRecs] = useState<JobRec[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/seeker/stats?seeker_id=${seekerId}`),
      axios.get(`${API}/seeker/recommendations?seeker_id=${seekerId}`),
      axios.get(`${API}/seeker/applications?seeker_id=${seekerId}`),
    ]).then(([s, r, a]) => {
      setStats(s.data); setRecs(r.data.slice(0, 4)); setApps(a.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  const STAT_CONFIG = [
    { label: 'Profile Strength', value: stats ? `${stats.profile_strength}%` : '—', icon: Users,    color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Applications',     value: stats?.total_applications ?? '—',            icon: FileText, color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20'   },
    { label: 'Interviews',       value: stats?.interviews ?? '—',                    icon: Activity, color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20'   },
    { label: 'Saved Jobs',       value: stats?.saved_jobs ?? '—',                    icon: Bookmark, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative bg-gradient-to-r from-teal-600/20 via-teal-500/5 to-transparent border border-teal-500/20 rounded-2xl p-5 overflow-hidden">
        <p className="text-slate-400 text-sm">Good morning 👋</p>
        <h2 className="text-xl font-bold text-white mt-0.5">Your job search dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">You have <span className="text-teal-400 font-semibold">{loading ? '...' : `${recs.length} new job matches`}</span> waiting for you.</p>
        <button onClick={() => onNavigate('jobs')} className="mt-3 flex items-center gap-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
          Browse Jobs <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CONFIG.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`bg-slate-900 border ${bg} rounded-2xl p-4`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`${bg} border p-2 rounded-xl`}><Icon className={`${color} w-4 h-4`} /></div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
            </div>
            {loading ? <Skeleton className="h-7 w-12 mb-1" /> : <p className="text-2xl font-bold text-white">{value}</p>}
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Recent Applications</h3>
            <button onClick={() => onNavigate('applications')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
          </div>
          {loading ? <>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 mb-2" />)}</> :
            apps.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">No applications yet</p>
            : <div className="space-y-2">
                {apps.map(app => (
                  <div key={app.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                    <div className="bg-teal-500/10 border border-teal-500/20 p-2 rounded-lg shrink-0"><Briefcase className="w-4 h-4 text-teal-400" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{app.job_title}</p><p className="text-xs text-slate-400 truncate">{app.company}</p></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_STYLE[app.stage] ?? STAGE_STYLE['APPLIED']}`}>{app.stage}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Top Matches</h3>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
          </div>
          {loading ? <>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 mb-2" />)}</> :
            recs.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">No recommendations yet</p>
            : <div className="space-y-2">
                {recs.map(job => (
                  <div key={job.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                    <div className="bg-violet-500/10 border border-violet-500/20 p-2 rounded-lg shrink-0"><Building2 className="w-4 h-4 text-violet-400" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{job.title}</p><p className="text-xs text-slate-400 truncate">{job.company} · {job.location}</p></div>
                    {job.match_score && <div className="shrink-0 text-right"><p className="text-sm font-bold text-teal-400">{job.match_score}%</p><p className="text-xs text-slate-500">match</p></div>}
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
};

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
const JobsTab = ({ seekerId }: { seekerId: string }) => {
  const [jobs, setJobs]               = useState<JobRec[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [jobType, setJobType]         = useState('');
  const [expLevel, setExpLevel]       = useState('');
  const [saving, setSaving]           = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [view, setView]               = useState<'browse' | 'recommended'>('recommended');
  const [modalJob, setModalJob]       = useState<JobForModal | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      if (view === 'recommended') {
        const res = await axios.get(`${API}/seeker/recommendations?seeker_id=${seekerId}`);
        setJobs(res.data);
      } else {
        const params = new URLSearchParams({ seeker_id: seekerId });
        if (search)   params.append('search', search);
        if (jobType)  params.append('job_type', jobType);
        if (expLevel) params.append('experience_level', expLevel);
        const res = await axios.get(`${API}/seeker/jobs/browse?${params}`);
        setJobs(res.data);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, [seekerId, view]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchJobs(); };
  const handleApplySuccess = (jobId: string) => { setJobs(prev => prev.map(j => j.id === jobId ? { ...j, already_applied: true } : j)); };

  const toggleSave = async (jobId: string) => {
    setSaving(jobId);
    try {
      const res = await axios.post(`${API}/seeker/jobs/${jobId}/save`, { seeker_id: seekerId });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, saved: res.data.saved } : j));
    } catch {} finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      {modalJob && <JobApplicationModal job={modalJob} seekerId={seekerId} onClose={() => setModalJob(null)} onSuccess={handleApplySuccess} />}

      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['recommended', 'browse'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${view === v ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {v === 'recommended' ? '✦ For You' : 'Browse All'}
          </button>
        ))}
      </div>

      {view === 'browse' && (
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, skills, companies..." className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1" />
          </div>
          <select value={jobType} onChange={e => setJobType(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
            <option value="">All Types</option>
            {['Full Time','Part Time','Contract','Remote'].map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={expLevel} onChange={e => setExpLevel(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
            <option value="">All Levels</option>
            {['Entry Level','Mid Level','Senior','Lead / Manager'].map(l => <option key={l}>{l}</option>)}
          </select>
          <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">Search</button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16"><Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">{view === 'recommended' ? 'No recommendations yet — complete your profile!' : 'No jobs found'}</p></div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 flex items-start gap-4">
                <div className="bg-violet-500/10 border border-violet-500/20 p-2.5 rounded-xl shrink-0"><Building2 className="w-5 h-5 text-violet-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold text-white">{job.title}</p><p className="text-sm text-slate-400">{job.company}</p></div>
                    {job.match_score && <div className="shrink-0 text-right"><p className="text-sm font-bold text-teal-400">{job.match_score}%</p><p className="text-xs text-slate-500">AI match</p></div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span>{job.type}</span><span>{job.experience_level}</span>
                    {formatSalary(job.salary_min, job.salary_max) && <span className="text-emerald-400 font-medium">{formatSalary(job.salary_min, job.salary_max)}</span>}
                    {job.days_ago !== undefined && <span><Clock className="w-3 h-3 inline mr-0.5" />{job.days_ago}d ago</span>}
                  </div>
                </div>
              </div>
              {job.skills && job.skills.length > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {job.skills.slice(0, 5).map(s => <span key={s} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{s}</span>)}
                </div>
              )}
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  onClick={() => !job.already_applied && setModalJob({ id: job.id, title: job.title, company: job.company, location: job.location, type: job.type })}
                  disabled={job.already_applied}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    job.already_applied ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-teal-600 hover:bg-teal-500 text-white'
                  }`}>
                  {job.already_applied ? '✓ Applied' : 'Apply Now'}
                </button>
                <button onClick={() => toggleSave(job.id)} disabled={saving === job.id} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-amber-400 transition">
                  {saving === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : job.saved ? <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" /> : <BookmarkPlus className="w-4 h-4" />}
                </button>
                {job.description && (
                  <button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition text-xs font-medium px-3">
                    {expandedJob === job.id ? 'Less' : 'Details'}
                  </button>
                )}
              </div>
              {expandedJob === job.id && job.description && (
                <div className="border-t border-slate-800 px-4 py-3">
                  <div className="text-sm text-slate-300 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: job.description }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Applications Tab ──────────────────────────────────────────────────────────
const ApplicationsTab = ({ seekerId }: { seekerId: string }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/seeker/applications?seeker_id=${seekerId}`)
      .then(r => setApps(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  const filtered = filter === 'all' ? apps : apps.filter(a => a.stage.toLowerCase() === filter);
  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'applied', 'screening', 'interview', 'offer', 'hired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === s ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
            {s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16"><FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No applications {filter !== 'all' ? `in ${filter}` : 'yet'}</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => {
            const stageIdx = STAGE_STEPS.indexOf(app.stage);
            return (
              <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-start gap-4">
                  <div className="bg-teal-500/10 border border-teal-500/20 p-2.5 rounded-xl shrink-0"><Briefcase className="w-5 h-5 text-teal-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{app.job_title}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{app.company}</span><span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>
                      <span>·</span><span>{app.days_ago}d ago</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STAGE_STYLE[app.stage] ?? STAGE_STYLE['APPLIED']}`}>{app.stage}</span>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {STAGE_STEPS.map((s, i) => (
                    <div key={s} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-1.5 w-full rounded-full transition-all ${i <= stageIdx ? 'bg-teal-500' : 'bg-slate-700'}`} />
                      <span className={`text-xs hidden sm:block ${i <= stageIdx ? 'text-teal-400' : 'text-slate-600'}`}>{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Messages Tab ──────────────────────────────────────────────────────────────
const MessagesTab = ({ seekerId }: { seekerId: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try { const res = await axios.get(`${API}/seeker/conversations?seeker_id=${seekerId}`); setConversations(res.data); }
    catch { setConvError('Failed to load conversations'); } finally { setLoadingConvs(false); }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await axios.get(`${API}/seeker/conversations/${convId}/messages`);
      setMessages(res.data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {}
  };

  useEffect(() => { fetchConversations(); }, [seekerId]);

  useEffect(() => {
    if (!selectedConv) return;
    setLoadingMsgs(true);
    fetchMessages(selectedConv.id).finally(() => setLoadingMsgs(false));
    pollRef.current = setInterval(() => fetchMessages(selectedConv.id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/seeker/conversations/${selectedConv.id}/messages`, { text: messageText.trim() });
      setMessages(prev => [...prev, res.data]); setMessageText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, last_message: messageText.trim(), last_message_time: 'Just now', unread_count: 0 } : c));
    } catch {} finally { setSending(false); }
  };

  const filteredConvs = conversations.filter(c => c.employer_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-96">
      <div className="w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loadingConvs && [...Array(3)].map((_, i) => <div key={i} className="p-4 border-b border-slate-800/50"><Skeleton className="h-12" /></div>)}
          {convError && <div className="p-4 text-center"><AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" /><p className="text-xs text-red-400">{convError}</p></div>}
          {!loadingConvs && !convError && filteredConvs.length === 0 && <div className="p-8 text-center"><MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-xs text-slate-400">No messages yet</p></div>}
          {filteredConvs.map((conv, i) => (
            <div key={conv.id} onClick={() => setSelectedConv(conv)} className={`p-4 cursor-pointer border-b border-slate-800/50 transition ${selectedConv?.id === conv.id ? 'bg-teal-500/10' : 'hover:bg-slate-800/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{conv.employer_avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center"><p className="text-sm font-semibold text-white truncate">{conv.employer_name}</p><span className="text-xs text-slate-500 shrink-0 ml-1">{conv.last_message_time}</span></div>
                  <p className="text-xs text-slate-400 truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && <span className="w-5 h-5 bg-teal-500 rounded-full text-xs text-white flex items-center justify-center shrink-0">{conv.unread_count}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedConv ? (
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${AVATAR_COLORS[conversations.findIndex(c => c.id === selectedConv.id) % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>{selectedConv.employer_avatar}</div>
              <div><p className="font-semibold text-white">{selectedConv.employer_name}</p><p className="text-xs text-teal-400">Employer · Auto-refreshes every 5s</p></div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"><Phone className="w-4 h-4" /></button>
              <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"><Video className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {loadingMsgs && [...Array(3)].map((_, i) => <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}><Skeleton className="h-12 w-48" /></div>)}
            {!loadingMsgs && messages.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-slate-500 text-sm">No messages yet</p></div>}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'candidate' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
                  <p>{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'candidate' ? 'text-teal-200' : 'text-slate-500'}`}>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="p-4 border-t border-slate-800 flex items-center gap-3">
            <input value={messageText} onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500 transition" />
            <button onClick={sendMessage} disabled={sending || !messageText.trim()} className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" /><p className="text-slate-400">Select a conversation</p></div></div>
      )}
    </div>
  );
};

// ── Interviews Tab ─────────────────────────────────────────────────────────────
const InterviewsTab = ({ seekerId }: { seekerId: string }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/seeker/interviews?seeker_id=${seekerId}`)
      .then(r => setInterviews(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  const upcoming = interviews.filter(i => i.status === 'scheduled');
  const past = interviews.filter(i => i.status !== 'scheduled');
  const typeColor = (type: string) => {
    if (type === 'Video Call') return 'bg-violet-500/15 text-violet-400';
    if (type === 'Phone Screen') return 'bg-teal-500/15 text-teal-400';
    return 'bg-amber-500/15 text-amber-400';
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-white mb-3">Upcoming ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl"><CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">No upcoming interviews</p></div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((iv, i) => (
              <div key={iv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{iv.company.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-white">{iv.job_title}</p><p className="text-sm text-slate-400">{iv.company}</p></div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{formatDate(iv.scheduled_at)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${typeColor(iv.interview_type)}`}>{iv.interview_type}</span>
                </div>
                {iv.interview_type === 'Video Call' && <button className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition shrink-0"><Video className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-400 mb-3">Past ({past.length})</h3>
          <div className="space-y-2">
            {past.map((iv, i) => (
              <div key={iv.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 flex items-center gap-3 opacity-60">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{iv.company.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{iv.job_title}</p><p className="text-xs text-slate-400">{iv.company}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${iv.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{iv.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── AI Career Coach Tab ────────────────────────────────────────────────────────
const AiCoachTab = ({ seekerId }: { seekerId: string }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: 'assistant', text: "Hi! I'm your AI Career Coach 👋 I can help you with interview prep, resume tips, salary negotiation, career advice, and more. What would you like to work on today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    'Help me prepare for a React developer interview',
    'How should I negotiate my salary offer?',
    'Review my elevator pitch',
    'What tech skills are most in demand in Kenya?',
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert AI Career Coach for TechHire, a tech recruitment platform based in Kenya. You help job seekers with:
- Optimizing resumes and LinkedIn profiles for tech roles
- Preparing for technical interviews (coding, system design, behavioral)
- Writing personalized cover letters
- Negotiating job offers and salaries in KES for the Kenyan market
- Career path advice and skill gap analysis
- Portfolio and GitHub profile tips
- Job search strategy and networking in Kenya's tech scene
Be encouraging, practical, and specific. Use bullet points when helpful.`,
          messages: messages.slice(-10).map(m => ({ role: m.role, content: m.text })).concat([{ role: 'user', content: msg }]),
        }),
      });
      const data = await response.json();
      const reply = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || "I'm here to help!";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-96 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-white" /></div>
        <div><p className="font-semibold text-white">AI Career Coach</p><p className="text-xs text-teal-400">● Online · Powered by Claude</p></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {msg.role === 'assistant' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5 text-white" /></div>}
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => <button key={s} onClick={() => sendMessage(s)} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition">{s}</button>)}
        </div>
      )}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your career coach anything..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-teal-500 transition" />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-violet-600 to-teal-600 hover:opacity-90 disabled:opacity-40 text-white p-2.5 rounded-xl transition">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const SeekerDashboard = () => {
  const { user, logout } = useAuthStore();
  const seekerId = user?.id ?? '';
  const [activeTab, setActiveTab] = useState('overview');

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('th_theme') as Theme) || 'dark');
  useEffect(() => {
    localStorage.setItem('th_theme', theme);
    document.documentElement.classList.toggle('light-mode', theme === 'light');
  }, [theme]);

  const handleSignOut = () => { logout?.(); window.location.href = '/'; };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':      return <OverviewTab seekerId={seekerId} onNavigate={setActiveTab} />;
      case 'jobs':          return <JobsTab seekerId={seekerId} />;
      case 'applications':  return <ApplicationsTab seekerId={seekerId} />;
      case 'messages':      return <MessagesTab seekerId={seekerId} />;
      case 'interviews':    return <InterviewsTab seekerId={seekerId} />;
      case 'ai':            return <AiCoachTab seekerId={seekerId} />;
      default:              return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900 border-r border-slate-800 py-6 px-3 shrink-0 sticky top-0 h-screen">
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="min-w-0"><p className="text-xs font-semibold text-white truncate">{user?.email ?? 'Job Seeker'}</p><p className="text-xs text-slate-400">Candidate</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ icon: Icon, label, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>
        <div className="px-3 mt-4">
          <button onClick={() => window.location.href = '/seeker/profile'}
            className="w-full flex items-center justify-center gap-2 border border-teal-500/30 hover:border-teal-500/60 text-teal-400 text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            Edit Profile
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-slate-900/80 border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white capitalize">{activeTab === 'ai' ? 'AI Career Coach' : activeTab}</h1>
            <span className="hidden md:block text-xs text-slate-500">/ Job Seeker</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-slate-800 transition">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full" />
            </button>
            <SettingsDropdown theme={theme} onThemeChange={setTheme} onSignOut={handleSignOut} />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 lg:pb-6">
          {renderTab()}
        </div>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-1 py-2">
        {NAV.map(({ icon: Icon, label, tab }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${activeTab === tab ? 'text-teal-400' : 'text-slate-500'}`}>
            <div className={`p-1.5 rounded-lg ${activeTab === tab ? 'bg-teal-500/15' : ''}`}><Icon className="w-4 h-4" /></div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SeekerDashboard;