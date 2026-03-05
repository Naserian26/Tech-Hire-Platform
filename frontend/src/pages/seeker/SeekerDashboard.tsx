import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import {
  BarChart3, Briefcase, MessageSquare, CalendarDays, Search,
  Send, Phone, Video, Loader2, Bell,
  MapPin, Clock, ChevronRight, BookmarkPlus, Bookmark,
  Users, FileText, Activity, Building2, ArrowUpRight,
  Bot, Sparkles, LogOut, Sun, Moon, Settings, X,
  Zap, Target, CheckCircle2, Circle,
  ChevronLeft, Filter,
} from 'lucide-react';
import JobApplicationModal from './JobApplicationModal';
import type { JobForModal } from './JobApplicationModal';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const API = 'http://localhost:8000/api/v1';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats { profile_strength: number; total_applications: number; interviews: number; saved_jobs: number; }
interface Application { id: string; job_id: string; job_title: string; company: string; location: string; type: string; stage: string; match_score: number; days_ago: number; applied_at: string; }
interface Interview { id: string; job_title: string; company: string; scheduled_at: string; interview_type: string; status: string; }
interface JobRec { id: string; title: string; company: string; location: string; type: string; salary_min: number | null; salary_max: number | null; match_score: number | null; experience_level: string; already_applied?: boolean; saved?: boolean; description?: string; skills?: string[]; days_ago?: number; }
interface Conversation { id: string; employer_id: string; employer_name: string; employer_avatar: string; last_message: string; last_message_time: string; unread_count: number; }
interface Message { id: string; sender: 'employer' | 'candidate'; text: string; created_at: string; }
interface AiMessage { role: 'user' | 'assistant'; text: string; }
type Theme = 'dark' | 'light';

// ── Design System ──────────────────────────────────────────────────────────────
const glass = {
  card: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40',
  cardHover: 'hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300',
  input: 'bg-white/[0.05] backdrop-blur border border-white/10 text-white placeholder-white/30 outline-none focus:border-teal-400/50 focus:bg-white/[0.08] transition-all duration-200',
  btn: {
    primary: 'bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-black font-bold shadow-lg shadow-teal-500/25 transition-all duration-200',
    ghost: 'bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all duration-200',
    danger: 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200',
  }
};

const AVATAR_COLORS = ['from-violet-500 to-purple-600','from-teal-500 to-emerald-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600','from-sky-500 to-blue-600','from-indigo-500 to-violet-600'];

const STAGE_STYLE: Record<string, { pill: string; dot: string }> = {
  APPLIED:   { pill: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',   dot: 'bg-slate-400'   },
  SCREENING: { pill: 'bg-violet-500/20 text-violet-300 border border-violet-500/30', dot: 'bg-violet-400'  },
  INTERVIEW: { pill: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',       dot: 'bg-teal-400'    },
  OFFER:     { pill: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400' },
  HIRED:     { pill: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',    dot: 'bg-amber-400'   },
};
const STAGE_STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

const NAV = [
  { icon: BarChart3,     label: 'Overview',     tab: 'overview'     },
  { icon: Briefcase,     label: 'Jobs',         tab: 'jobs'         },
  { icon: FileText,      label: 'Applications', tab: 'applications' },
  { icon: MessageSquare, label: 'Messages',     tab: 'messages'     },
  { icon: CalendarDays,  label: 'Interviews',   tab: 'interviews'   },
  { icon: Bot,           label: 'AI Coach',     tab: 'ai'           },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-2xl ${className}`} />
);

const formatDate = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (date.toDateString() === now.toDateString()) return `Today · ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`;
};

const formatSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
};

// ── Match Ring ─────────────────────────────────────────────────────────────────
const MatchRing = ({ score, size = 56 }: { score: number; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#14b8a6' : score >= 50 ? '#8b5cf6' : '#f59e0b';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size < 50 ? 9 : 11} fontWeight="bold"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}%
      </text>
    </svg>
  );
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 text-sm shadow-2xl">
      {label && <p className="text-white/60 text-xs mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? '#fff' }} className="font-semibold">
          {p.name !== 'value' ? `${p.name}: ` : ''}{p.value}{typeof p.value === 'number' && p.name?.includes('%') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

// ── Profile Strength Card ──────────────────────────────────────────────────────
const ProfileStrengthCard = ({ strength }: { strength: number }) => {
  const skills = ['Profile Photo', 'Current Role', 'Skills', 'Bio', 'Location', 'Resume', 'LinkedIn'];
  const filled = Math.round((strength / 100) * skills.length);
  return (
    <div className={`${glass.card} rounded-3xl p-5 col-span-2`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/50 text-xs font-medium tracking-wider uppercase">Profile Strength</p>
          <p className="text-3xl font-black text-white mt-0.5">{strength}%</p>
        </div>
        <div className="relative">
          <MatchRing score={strength} size={72} />
        </div>
      </div>
      <div className="space-y-1.5">
        {skills.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i < filled
              ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              : <Circle className="w-3.5 h-3.5 text-white/20 shrink-0" />}
            <span className={`text-xs ${i < filled ? 'text-white/70' : 'text-white/30'}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Weekly Activity Chart ──────────────────────────────────────────────────────
const WeeklyActivity = ({ apps }: { apps: Application[] }) => {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const now = new Date();
  const data = days.map((day, i) => {
    const target = new Date(now);
    target.setDate(now.getDate() - (now.getDay() - 1 - i + 7) % 7);
    const count = apps.filter(a => new Date(a.applied_at).toDateString() === target.toDateString()).length;
    return { day, count };
  });
  return (
    <div className={`${glass.card} rounded-3xl p-5`}>
      <p className="text-white/50 text-xs font-medium tracking-wider uppercase mb-1">Weekly Activity</p>
      <p className="text-white text-sm font-semibold mb-4">{apps.length} total applications</p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" name="Applications" radius={[4,4,0,0]}>
            {data.map((_, i) => <Cell key={i} fill={_.count > 0 ? '#14b8a6' : 'rgba(255,255,255,0.06)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Market Trends ─────────────────────────────────────────────────────────────
const MarketTrends = ({ recs }: { recs: JobRec[] }) => {
  const skillCount: Record<string, number> = {};
  recs.forEach(job => (job.skills ?? []).forEach(s => { skillCount[s] = (skillCount[s] ?? 0) + 1; }));
  const top = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([skill, count]) => ({ skill, demand: Math.min(99, Math.round((count / Math.max(recs.length, 1)) * 100) + 35) }));

  if (top.length < 2) return (
    <div className={`${glass.card} rounded-3xl p-5 flex items-center justify-center`}>
      <p className="text-white/30 text-sm">Complete your profile to see market trends</p>
    </div>
  );

  return (
    <div className={`${glass.card} rounded-3xl p-5`}>
      <p className="text-white/50 text-xs font-medium tracking-wider uppercase mb-1">Market Trends</p>
      <p className="text-white text-sm font-semibold mb-4">Top in-demand skills</p>
      <div className="space-y-2.5">
        {top.map(({ skill, demand }) => (
          <div key={skill} className="flex items-center gap-3">
            <span className="text-xs text-white/60 w-20 truncate shrink-0">{skill}</span>
            <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${demand}%` }} />
            </div>
            <span className="text-xs text-teal-400 font-bold w-8 text-right shrink-0">{demand}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Match Distribution ─────────────────────────────────────────────────────────
const MatchDistribution = ({ recs }: { recs: JobRec[] }) => {
  const scores = recs.filter(r => r.match_score !== null).map(r => r.match_score as number);
  if (scores.length < 2) return null;
  const buckets = [
    { label: '0–20', count: 0, color: '#f43f5e' },
    { label: '21–40', count: 0, color: '#f59e0b' },
    { label: '41–60', count: 0, color: '#6366f1' },
    { label: '61–80', count: 0, color: '#8b5cf6' },
    { label: '81–100', count: 0, color: '#14b8a6' },
  ];
  scores.forEach(s => {
    if (s <= 20) buckets[0].count++;
    else if (s <= 40) buckets[1].count++;
    else if (s <= 60) buckets[2].count++;
    else if (s <= 80) buckets[3].count++;
    else buckets[4].count++;
  });
  return (
    <div className={`${glass.card} rounded-3xl p-5`}>
      <p className="text-white/50 text-xs font-medium tracking-wider uppercase mb-1">Match Distribution</p>
      <p className="text-white text-sm font-semibold mb-4">AI score breakdown</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={buckets} barCategoryGap="20%">
          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" name="Jobs" radius={[4,4,0,0]}>
            {buckets.map((b, i) => <Cell key={i} fill={b.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ seekerId, onNavigate }: { seekerId: string; onNavigate: (tab: string) => void }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recs, setRecs] = useState<JobRec[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/seeker/stats?seeker_id=${seekerId}`),
      axios.get(`${API}/seeker/recommendations?seeker_id=${seekerId}`),
      axios.get(`${API}/seeker/applications?seeker_id=${seekerId}`),
    ]).then(([s, r, a]) => { setStats(s.data); setRecs(r.data); setApps(a.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STAT_CARDS = [
    { label: 'Applications', value: stats?.total_applications ?? 0, icon: FileText, color: 'teal', trend: '+2 this week' },
    { label: 'Interviews', value: stats?.interviews ?? 0, icon: Activity, color: 'violet', trend: 'Scheduled' },
    { label: 'Saved Jobs', value: stats?.saved_jobs ?? 0, icon: Bookmark, color: 'amber', trend: 'Bookmarked' },
  ];

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className={`${glass.card} rounded-3xl p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-violet-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-white/50 text-sm">{greeting} 👋</p>
          <h2 className="text-2xl font-black text-white mt-1">
            {user?.email?.split('@')[0] ?? 'Job Seeker'}
          </h2>
          <p className="text-white/40 text-sm mt-1">
            You have{' '}
            <span className="text-teal-400 font-bold">
              {loading ? '...' : `${recs.length} job matches`}
            </span>{' '}
            waiting — your profile is{' '}
            <span className="text-violet-400 font-bold">{stats?.profile_strength ?? 0}% complete</span>
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onNavigate('jobs')}
              className={`${glass.btn.primary} px-4 py-2 rounded-xl text-xs flex items-center gap-1.5`}>
              <Zap className="w-3.5 h-3.5" /> Browse Matches
            </button>
            <button onClick={() => window.location.href = '/seeker/profile'}
              className={`${glass.btn.ghost} px-4 py-2 rounded-xl text-xs flex items-center gap-1.5`}>
              Complete Profile <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Profile Strength spans 2 on mobile */}
        {loading ? <Skeleton className="h-44 col-span-2" /> : <ProfileStrengthCard strength={stats?.profile_strength ?? 0} />}

        {STAT_CARDS.map(({ label, value, icon: Icon, color, trend }) => (
          loading ? <Skeleton key={label} className="h-44" /> :
          <div key={label} className={`${glass.card} ${glass.cardHover} rounded-3xl p-5 cursor-pointer group`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-2xl ${color === 'teal' ? 'bg-teal-500/15 border border-teal-500/20' : color === 'violet' ? 'bg-violet-500/15 border border-violet-500/20' : 'bg-amber-500/15 border border-amber-500/20'}`}>
                <Icon className={`w-4 h-4 ${color === 'teal' ? 'text-teal-400' : color === 'violet' ? 'text-violet-400' : 'text-amber-400'}`} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-all" />
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
            <p className={`text-xs mt-2 font-medium ${color === 'teal' ? 'text-teal-400' : color === 'violet' ? 'text-violet-400' : 'text-amber-400'}`}>{trend}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <WeeklyActivity apps={apps} />
          <MarketTrends recs={recs} />
          {recs.length >= 2 ? <MatchDistribution recs={recs} /> :
            <div className={`${glass.card} rounded-3xl p-5 flex items-center justify-center`}>
              <p className="text-white/30 text-sm text-center">Apply to jobs to see match stats</p>
            </div>
          }
        </div>
      )}

      {/* Recent Applications + Top Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className={`${glass.card} rounded-3xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-white">Recent Applications</p>
            <button onClick={() => onNavigate('applications')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? <>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 mb-2" />)}</> :
            apps.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No applications yet</p>
                <button onClick={() => onNavigate('jobs')} className="text-teal-400 text-xs mt-2 hover:text-teal-300 transition-colors">Browse jobs →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {apps.slice(0, 4).map(app => (
                  <div key={app.id} className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3 transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{app.job_title}</p>
                      <p className="text-xs text-white/40 truncate">{app.company}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STAGE_STYLE[app.stage]?.pill ?? STAGE_STYLE['APPLIED'].pill}`}>
                      {app.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className={`${glass.card} rounded-3xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-white">Top Matches</p>
            <button onClick={() => onNavigate('jobs')} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? <>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 mb-2" />)}</> :
            recs.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-white/30 text-sm">No matches yet</p>
                <p className="text-white/20 text-xs mt-1">Complete your profile to get AI recommendations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recs.slice(0, 4).map(job => (
                  <div key={job.id} className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3 transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                      <p className="text-xs text-white/40 truncate">{job.company} · {job.location}</p>
                    </div>
                    {job.match_score != null && <MatchRing score={job.match_score} size={40} />}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
const JobsTab = ({ seekerId }: { seekerId: string }) => {
  const [jobs, setJobs] = useState<JobRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [expLevel, setExpLevel] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [view, setView] = useState<'recommended' | 'browse'>('recommended');
  const [modalJob, setModalJob] = useState<JobForModal | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'recommended') {
        const res = await axios.get(`${API}/seeker/recommendations?seeker_id=${seekerId}`);
        setJobs(res.data);
      } else {
        const params = new URLSearchParams({ seeker_id: seekerId });
        if (search) params.append('search', search);
        if (jobType) params.append('job_type', jobType);
        if (expLevel) params.append('experience_level', expLevel);
        const res = await axios.get(`${API}/seeker/jobs/browse?${params}`);
        setJobs(res.data);
      }
    } catch {} finally { setLoading(false); }
  }, [seekerId, view, search, jobType, expLevel]);

  useEffect(() => { fetchJobs(); }, [seekerId, view]);

  const handleApplySuccess = (jobId: string) => setJobs(prev => prev.map(j => j.id === jobId ? { ...j, already_applied: true } : j));

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

      {/* View Toggle + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={`${glass.card} rounded-2xl p-1 flex gap-1 w-fit`}>
          {(['recommended', 'browse'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${view === v ? 'bg-teal-500 text-black shadow-lg shadow-teal-500/30' : 'text-white/50 hover:text-white'}`}>
              {v === 'recommended' ? '✦ For You' : 'Browse All'}
            </button>
          ))}
        </div>

        {view === 'browse' && (
          <div className="flex gap-2 flex-1">
            <div className={`flex items-center gap-2 ${glass.input} rounded-2xl px-4 py-2.5 flex-1`}>
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJobs()}
                placeholder="Search jobs, skills, companies..." className="bg-transparent text-sm text-white placeholder-white/30 outline-none flex-1 w-full" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`${glass.btn.ghost} px-3 py-2.5 rounded-2xl flex items-center gap-1.5 text-sm`}>
              <Filter className="w-4 h-4" />
              {(jobType || expLevel) && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
            </button>
            <button onClick={fetchJobs} className={`${glass.btn.primary} px-4 py-2.5 rounded-2xl text-sm`}>Search</button>
          </div>
        )}
      </div>

      {/* Filters */}
      {view === 'browse' && showFilters && (
        <div className={`${glass.card} rounded-2xl p-4 flex flex-wrap gap-3`}>
          <select value={jobType} onChange={e => setJobType(e.target.value)}
            className={`${glass.input} rounded-xl px-3 py-2 text-sm`}>
            <option value="">All Types</option>
            {['Full Time','Part Time','Contract','Remote'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
            className={`${glass.input} rounded-xl px-3 py-2 text-sm`}>
            <option value="">All Levels</option>
            {['Entry Level','Mid Level','Senior','Lead / Manager'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {(jobType || expLevel) && (
            <button onClick={() => { setJobType(''); setExpLevel(''); }} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Job Cards */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : jobs.length === 0 ? (
        <div className={`${glass.card} rounded-3xl p-16 text-center`}>
          <Briefcase className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40">{view === 'recommended' ? 'Complete your profile to get AI recommendations!' : 'No jobs found — try different filters'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className={`${glass.card} ${glass.cardHover} rounded-3xl overflow-hidden group`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-lg leading-tight">{job.title}</p>
                        <p className="text-white/50 text-sm mt-0.5">{job.company}</p>
                      </div>
                      {job.match_score != null && <MatchRing score={job.match_score} size={52} />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      <span>{job.type}</span>
                      <span>{job.experience_level}</span>
                      {formatSalary(job.salary_min, job.salary_max) && (
                        <span className="text-emerald-400 font-semibold">{formatSalary(job.salary_min, job.salary_max)}</span>
                      )}
                      {job.days_ago !== undefined && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{job.days_ago}d ago</span>}
                    </div>
                  </div>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills.slice(0, 6).map(s => (
                      <span key={s} className="text-xs bg-white/[0.05] border border-white/10 text-white/60 px-2.5 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => !job.already_applied && setModalJob({ id: job.id, title: job.title, company: job.company, location: job.location, type: job.type })}
                    disabled={job.already_applied}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      job.already_applied
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : glass.btn.primary
                    }`}>
                    {job.already_applied ? <><CheckCircle2 className="w-4 h-4" /> Applied</> : 'Apply Now'}
                  </button>
                  <button onClick={() => toggleSave(job.id)} disabled={saving === job.id}
                    className={`${glass.btn.ghost} p-2.5 rounded-2xl`}>
                    {saving === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : job.saved ? <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" /> : <BookmarkPlus className="w-4 h-4" />}
                  </button>
                  {job.description && (
                    <button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      className={`${glass.btn.ghost} px-3 py-2.5 rounded-2xl text-xs font-semibold`}>
                      {expandedJob === job.id ? 'Less' : 'Details'}
                    </button>
                  )}
                </div>
              </div>

              {expandedJob === job.id && job.description && (
                <div className="border-t border-white/[0.05] px-5 py-4">
                  <div className="text-sm text-white/60 leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.description }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Applications Tab (Kanban) ──────────────────────────────────────────────────
const ApplicationsTab = ({ seekerId }: { seekerId: string }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');

  useEffect(() => {
    axios.get(`${API}/seeker/applications?seeker_id=${seekerId}`)
      .then(r => setApps(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  // Kanban columns
  const columns = STAGE_STEPS.map(stage => ({
    stage,
    jobs: apps.filter(a => a.stage === stage),
    style: STAGE_STYLE[stage],
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">{apps.length} total applications</p>
        <div className={`${glass.card} rounded-xl p-1 flex gap-1`}>
          {(['pipeline', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${view === v ? 'bg-teal-500 text-black' : 'text-white/40 hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'pipeline' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map(({ stage, jobs, style }) => (
            <div key={stage} className="w-64 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{stage}</span>
                <span className="ml-auto text-xs text-white/30 font-semibold">{jobs.length}</span>
              </div>
              <div className="space-y-2">
                {jobs.length === 0 ? (
                  <div className={`${glass.card} rounded-2xl p-4 text-center border-dashed`}>
                    <p className="text-white/20 text-xs">No applications</p>
                  </div>
                ) : jobs.map(app => (
                  <div key={app.id} className={`${glass.card} ${glass.cardHover} rounded-2xl p-3 cursor-pointer`}>
                    <p className="text-sm font-bold text-white leading-tight">{app.job_title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{app.company}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/30">{app.days_ago}d ago</span>
                      {app.match_score > 0 && <MatchRing score={app.match_score} size={32} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <div className={`${glass.card} rounded-3xl p-16 text-center`}>
              <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">No applications yet</p>
            </div>
          ) : apps.map(app => {
            const stageIdx = STAGE_STEPS.indexOf(app.stage);
            return (
              <div key={app.id} className={`${glass.card} ${glass.cardHover} rounded-3xl p-5`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{app.job_title}</p>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                      <span>{app.company}</span><span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>
                      <span>·</span><span>{app.days_ago}d ago</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${STAGE_STYLE[app.stage]?.pill ?? STAGE_STYLE['APPLIED'].pill}`}>
                    {app.stage}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-4 flex gap-1">
                  {STAGE_STEPS.map((s, i) => (
                    <div key={s} className="flex-1">
                      <div className={`h-1.5 rounded-full transition-all ${i <= stageIdx ? 'bg-gradient-to-r from-teal-500 to-teal-400' : 'bg-white/5'}`} />
                      <p className={`text-xs mt-1 hidden sm:block ${i <= stageIdx ? 'text-teal-400' : 'text-white/20'}`}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </p>
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
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try { const res = await axios.get(`${API}/seeker/conversations?seeker_id=${seekerId}`); setConversations(res.data); }
    catch {} finally { setLoadingConvs(false); }
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
      setMessages(prev => [...prev, res.data]);
      setMessageText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {} finally { setSending(false); }
  };

  const filteredConvs = conversations.filter(c => c.employer_name.toLowerCase().includes(search.toLowerCase()));

  const selectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setShowList(false);
  };

  return (
    <div className="flex gap-3 h-[calc(100vh-200px)] min-h-96">
      {/* Conversation List */}
      <div className={`${showList ? 'flex' : 'hidden md:flex'} w-full md:w-72 shrink-0 ${glass.card} rounded-3xl overflow-hidden flex-col`}>
        <div className="p-4 border-b border-white/[0.05]">
          <p className="font-bold text-white mb-3">Messages</p>
          <div className={`flex items-center gap-2 ${glass.input} rounded-xl px-3 py-2`}>
            <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="bg-transparent text-xs text-white placeholder-white/30 outline-none flex-1" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loadingConvs && [...Array(3)].map((_, i) => <div key={i} className="p-4"><Skeleton className="h-12" /></div>)}
          {!loadingConvs && filteredConvs.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/30">No messages yet</p>
            </div>
          )}
          {filteredConvs.map((conv, i) => (
            <div key={conv.id} onClick={() => selectConv(conv)}
              className={`p-4 cursor-pointer border-b border-white/[0.03] transition-all ${selectedConv?.id === conv.id ? 'bg-teal-500/10 border-l-2 border-l-teal-400' : 'hover:bg-white/[0.03]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {conv.employer_avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-white truncate">{conv.employer_name}</p>
                    <span className="text-xs text-white/30 shrink-0 ml-1">{conv.last_message_time}</span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="w-5 h-5 bg-teal-500 rounded-full text-xs text-black font-bold flex items-center justify-center shrink-0">{conv.unread_count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${!showList ? 'flex' : 'hidden md:flex'} flex-1 ${glass.card} rounded-3xl flex-col overflow-hidden`}>
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowList(true)} className="md:hidden p-1 text-white/40 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[conversations.findIndex(c => c.id === selectedConv.id) % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold`}>
                  {selectedConv.employer_avatar}
                </div>
                <div>
                  <p className="font-bold text-white">{selectedConv.employer_name}</p>
                  <p className="text-xs text-teal-400">● Auto-refreshes every 5s</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className={`${glass.btn.ghost} p-2 rounded-xl`}><Phone className="w-4 h-4" /></button>
                <button className={`${glass.btn.ghost} p-2 rounded-xl`}><Video className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {loadingMsgs && [...Array(3)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}><Skeleton className="h-12 w-48" /></div>
              ))}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white/20 text-sm">Start the conversation</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-3xl text-sm ${
                    msg.sender === 'candidate'
                      ? 'bg-gradient-to-br from-teal-500 to-teal-400 text-black font-medium rounded-br-lg'
                      : 'bg-white/[0.07] text-white rounded-bl-lg'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'candidate' ? 'text-black/50' : 'text-white/30'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-white/[0.05] flex items-center gap-3">
              <input value={messageText} onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..." className={`${glass.input} flex-1 rounded-2xl px-4 py-2.5 text-sm`} />
              <button onClick={sendMessage} disabled={sending || !messageText.trim()}
                className={`${glass.btn.primary} p-2.5 rounded-2xl disabled:opacity-40`}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <MessageSquare className="w-14 h-14 text-white/5" />
            <p className="text-white/20">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Interviews Tab ─────────────────────────────────────────────────────────────
const InterviewsTab = ({ seekerId }: { seekerId: string }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    axios.get(`${API}/seeker/interviews?seeker_id=${seekerId}`)
      .then(r => setInterviews(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [seekerId]);

  const upcoming = interviews.filter(i => i.status === 'scheduled');
  const past = interviews.filter(i => i.status !== 'scheduled');

  // Calendar grid
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const interviewDates = new Set(
    interviews.map(i => new Date(i.scheduled_at).toDateString())
  );

  const typeColor = (type: string) => {
    if (type === 'Video Call') return 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-300';
    if (type === 'Phone Screen') return 'from-teal-500/20 to-teal-600/10 border-teal-500/20 text-teal-300';
    return 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-300';
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-5">
      {/* Calendar */}
      <div className={`${glass.card} rounded-3xl p-5`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setSelectedMonth(new Date(year, month - 1))} className={`${glass.btn.ghost} p-1.5 rounded-xl`}><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setSelectedMonth(new Date(year, month + 1))} className={`${glass.btn.ghost} p-1.5 rounded-xl`}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center text-xs text-white/30 font-semibold py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const d = i + 1;
            const date = new Date(year, month, d);
            const isToday = date.toDateString() === today.toDateString();
            const hasInterview = interviewDates.has(date.toDateString());
            return (
              <div key={d} className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium relative transition-all ${
                isToday ? 'bg-teal-500 text-black font-bold' : hasInterview ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:bg-white/5'
              }`}>
                {d}
                {hasInterview && !isToday && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className={`${glass.card} rounded-3xl p-10 text-center`}>
            <CalendarDays className="w-10 h-10 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No upcoming interviews</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((iv, i) => (
              <div key={iv.id} className={`${glass.card} ${glass.cardHover} rounded-3xl p-5 flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-black shrink-0`}>
                  {iv.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{iv.job_title}</p>
                  <p className="text-sm text-white/50 mt-0.5">{iv.company}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{formatDate(iv.scheduled_at)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block bg-gradient-to-r border ${typeColor(iv.interview_type)}`}>
                    {iv.interview_type}
                  </span>
                </div>
                {iv.interview_type === 'Video Call' && (
                  <button className="p-2.5 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-violet-300 transition-all">
                    <Video className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="font-semibold text-white/40 mb-3">Past ({past.length})</h3>
          <div className="space-y-2">
            {past.map((iv, i) => (
              <div key={iv.id} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3 opacity-50">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {iv.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{iv.job_title}</p>
                  <p className="text-xs text-white/40">{iv.company}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${iv.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                  {iv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── AI Coach Tab ──────────────────────────────────────────────────────────────
const AiCoachTab = ({ seekerId: _seekerId }: { seekerId: string }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: 'assistant', text: "Hi! I'm your AI Career Coach 👋\n\nI can help you with:\n• Interview preparation & mock questions\n• Resume & cover letter reviews\n• Salary negotiation tactics\n• Career path advice for the Kenyan tech market\n\nWhat would you like to work on today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    '🎯 Prep me for a React interview',
    '💰 Help me negotiate my salary',
    '📄 Review my elevator pitch',
    '📈 Top tech skills in Kenya 2026',
    '🤝 How to follow up after an interview',
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
          system: `You are an expert AI Career Coach for TechHire, a smart tech recruitment platform in Kenya. Be encouraging, practical, and specific. Use bullet points and emojis when helpful. Focus on the Kenyan and African tech job market context when relevant.`,
          messages: messages.slice(-12).map(m => ({ role: m.role, content: m.text })).concat([{ role: 'user', content: msg }]),
        }),
      });
      const data = await response.json();
      const reply = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || "I'm here to help! Try asking me something specific.";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-200px)] min-h-96 ${glass.card} rounded-3xl overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-white/[0.05] flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white">AI Career Coach</p>
          <p className="text-xs text-teal-400">● Online · Powered by Claude</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/20 bg-white/5 px-2 py-1 rounded-full">{messages.length - 1} messages</span>
          <button onClick={() => setMessages([messages[0]])} className="text-xs text-white/30 hover:text-white/60 transition-colors">Clear</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-violet-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-teal-500 to-teal-400 text-black font-medium rounded-br-lg shadow-lg shadow-teal-500/20'
                : 'bg-white/[0.06] text-white/80 rounded-bl-lg border border-white/[0.08]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-teal-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-3xl rounded-bl-lg flex items-center gap-1.5">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/60 hover:text-white px-3 py-2 rounded-2xl transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/[0.05] flex items-center gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your career coach anything..."
          className={`${glass.input} flex-1 rounded-2xl px-4 py-2.5 text-sm`} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-teal-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-40 hover:opacity-90 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ── Settings Dropdown ─────────────────────────────────────────────────────────
const SettingsDropdown = ({ onSignOut, theme, onThemeChange }: { onSignOut: () => void; theme: Theme; onThemeChange: (t: Theme) => void; }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={`p-2 rounded-xl ${glass.btn.ghost}`}>
        <Settings className="w-4 h-4" />
      </button>
      {open && (
        <div className={`absolute right-0 top-12 w-52 ${glass.card} rounded-2xl shadow-2xl z-50 overflow-hidden`}>
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Settings</p>
          </div>
          <div className="px-3 py-3 border-b border-white/[0.05]">
            <p className="text-xs text-white/30 mb-2 font-medium px-1">Appearance</p>
            <div className="flex gap-1.5">
              {([{ v: 'dark' as Theme, label: 'Dark', icon: Moon }, { v: 'light' as Theme, label: 'Light', icon: Sun }]).map(({ v, label, icon: Icon }) => (
                <button key={v} onClick={() => onThemeChange(v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${theme === v ? 'bg-teal-500 text-black' : `${glass.btn.ghost}`}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); onSignOut(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${glass.btn.danger} font-medium`}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
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
      case 'overview':     return <OverviewTab seekerId={seekerId} onNavigate={setActiveTab} />;
      case 'jobs':         return <JobsTab seekerId={seekerId} />;
      case 'applications': return <ApplicationsTab seekerId={seekerId} />;
      case 'messages':     return <MessagesTab seekerId={seekerId} />;
      case 'interviews':   return <InterviewsTab seekerId={seekerId} />;
      case 'ai':           return <AiCoachTab seekerId={seekerId} />;
      default:             return null;
    }
  };

  return (
    <div className="flex min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top left, #0d1f1f 0%, #080c14 50%, #0a0a14 100%)' }}>
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 py-6 px-3 shrink-0 sticky top-0 h-screen z-20">
        <div className={`${glass.card} rounded-2xl px-3 py-3 mb-5`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.email?.split('@')[0] ?? 'Job Seeker'}</p>
              <p className="text-xs text-white/30">Candidate</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(({ icon: Icon, label, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/20 shadow-lg shadow-teal-500/10'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
              }`}>
              <Icon className={`w-4 h-4 shrink-0 ${activeTab === tab ? 'text-teal-400' : ''}`} />
              {label}
              {tab === 'messages' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />}
            </button>
          ))}
        </nav>

        <button onClick={() => window.location.href = '/seeker/profile'}
          className={`${glass.btn.ghost} w-full py-2.5 rounded-2xl text-sm font-bold mt-4 border border-teal-500/20 text-teal-400 hover:bg-teal-500/10 transition-all`}>
          Edit Profile
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top bar */}
        <div className="px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 bg-black/20 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-white capitalize">
              {activeTab === 'ai' ? 'AI Career Coach' : activeTab}
            </h1>
            <span className="hidden md:block text-xs text-white/20">/ Seeker Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all">
              <Bell className="w-4 h-4 text-white/50" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal-400 rounded-full" />
            </button>
            <SettingsDropdown theme={theme} onThemeChange={setTheme} onSignOut={handleSignOut} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 lg:pb-6">
          {renderTab()}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around px-1 py-2">
        {NAV.map(({ icon: Icon, label, tab }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all ${activeTab === tab ? 'text-teal-400' : 'text-white/30'}`}>
            <div className={`p-1.5 rounded-xl ${activeTab === tab ? 'bg-teal-500/15' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SeekerDashboard;