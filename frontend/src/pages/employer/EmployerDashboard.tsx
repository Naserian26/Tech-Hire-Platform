import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QuillEditor from '../../components/editor/QuillEditor';
import { useAuthStore } from '../../store/auth.store';
import {
  Plus, Users, Briefcase, CheckCircle, ChevronRight,
  MapPin, Clock, TrendingUp, Search, Settings, X, Zap,
  BarChart3, Bell, ArrowUpRight,
  UserCheck, CalendarDays, Building2, Star, Inbox, Loader2, AlertCircle,
  ChevronDown, MessageSquare, Send, Phone, Video, Calendar,
  LogOut, Sun, Moon, Bot
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1';

const LOCATIONS = [
  'Remote','Nairobi County','Mombasa County','Kisumu County','Nakuru County',
  'Eldoret / Uasin Gishu County','Kiambu County','Machakos County','Kajiado County',
  'Nyeri County','Meru County','Kilifi County','Kwale County','Kakamega County',
  'Kisii County','Kericho County','Bomet County','Nandi County','Trans Nzoia County',
  'Bungoma County','Siaya County','Homa Bay County','Migori County','Nyamira County',
  'Kirinyaga County',"Murang'a County",'Nyandarua County','Laikipia County',
  'Samburu County','Turkana County','West Pokot County','Baringo County',
  'Elgeyo Marakwet County','Narok County','Taita Taveta County','Tana River County',
  'Lamu County','Garissa County','Wajir County','Mandera County','Marsabit County',
  'Isiolo County','Tharaka Nithi County','Embu County','Kitui County','Makueni County',
  'Vihiga County','Busia County','Hybrid (Nairobi)','Hybrid (Mombasa)','Hybrid (Kisumu)',
];

const CATEGORIES = [
  'Engineering & Tech','Design & Creative','Product & Strategy','Marketing & Growth',
  'Sales & Business Dev','Data & Analytics','Finance & Accounting','HR & People Ops',
  'Customer Success','Operations & Logistics','Legal & Compliance','Healthcare',
  'Education & Training','Other',
];

interface Stats { jobs_posted: number; total_applicants: number; jobs_closed: number; hire_success: string; }
interface PipelineStage { stage: string; count: number; }
interface Candidate { id: string; name: string; role: string; score: number; status: string; avatar: string; job: string; }
interface Job { id: string; title: string; location: string; type: string; applicants: number; days_ago: number; active: boolean; }
interface Application { id: string; name: string; role: string; score: number; status: string; avatar: string; job: string; job_id: string; }
interface Conversation { id: string; candidate_id: string; candidate_name: string; candidate_role: string; candidate_avatar: string; last_message: string; last_message_time: string; unread_count: number; }
interface Message { id: string; sender: 'employer' | 'candidate'; text: string; created_at: string; }
interface Interview { id: string; candidate_id: string; candidate_name: string; candidate_role: string; candidate_avatar: string; scheduled_at: string; interview_type: string; status: string; }
interface InterviewStats { scheduled: number; this_week: number; completed: number; }
type Theme = 'dark' | 'light';

const PIPELINE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Applied:   { bar: 'bg-slate-500',   text: 'text-slate-300',   bg: 'bg-slate-500/20'   },
  Screening: { bar: 'bg-violet-500',  text: 'text-violet-300',  bg: 'bg-violet-500/20'  },
  Interview: { bar: 'bg-teal-500',    text: 'text-teal-300',    bg: 'bg-teal-500/20'    },
  Offer:     { bar: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  Hired:     { bar: 'bg-amber-500',   text: 'text-amber-300',   bg: 'bg-amber-500/20'   },
};
const AVATAR_COLORS = ['bg-violet-500','bg-teal-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500'];
const STATUS_STYLE: Record<string, string> = {
  applied:   'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  screening: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  interview: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  offer:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  hired:     'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  new:       'bg-teal-500/15 text-teal-400 border border-teal-500/30',
};
const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
const NAV_ITEMS = [
  { icon: BarChart3,    label: 'Overview',   tab: 'overview'   },
  { icon: Users,        label: 'Candidates', tab: 'candidates' },
  { icon: Briefcase,    label: 'Jobs',       tab: 'jobs'       },
  { icon: Inbox,        label: 'Messages',   tab: 'messages'   },
  { icon: CalendarDays, label: 'Interviews', tab: 'interviews' },
  { icon: Bot,          label: 'AI Coach',   tab: 'ai'         },
];

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />
);

const formatInterviewDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (sameDay(date, now)) return `Today · ${timeStr}`;
  if (sameDay(date, tomorrow)) return `Tomorrow · ${timeStr}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${timeStr}`;
};

// ── Settings Dropdown ─────────────────────────────────────────────────────────
const SettingsDropdown = ({ onSignOut, theme, onThemeChange }: {
  onSignOut: () => void; theme: Theme; onThemeChange: (t: Theme) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={`p-2 rounded-lg transition ${open ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
        <Settings className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800"><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Settings</p></div>
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs text-slate-500 mb-2 font-medium">Appearance</p>
            <div className="flex gap-1.5">
              {([{ value: 'dark' as Theme, label: 'Dark', icon: Moon }, { value: 'light' as Theme, label: 'Light', icon: Sun }]).map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => onThemeChange(value)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${theme === value ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); onSignOut(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition font-medium">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Candidate List (sidebar) ──────────────────────────────────────────────────
const CandidateList = ({ candidates, loading, error, selectedCandidate, setSelectedCandidate }: {
  candidates: Candidate[]; loading: boolean; error: string | null;
  selectedCandidate: Candidate | null; setSelectedCandidate: (c: Candidate | null) => void;
}) => {
  if (loading) return <>{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 mb-2" />)}</>;
  if (error) return <p className="text-xs text-red-400 text-center py-4">{error}</p>;
  if (!candidates.length) return <p className="text-xs text-slate-400 text-center py-4">No candidates yet</p>;
  return (
    <>
      {candidates.map((c, i) => (
        <div key={c.id} onClick={() => setSelectedCandidate(selectedCandidate?.id === c.id ? null : c)}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${selectedCandidate?.id === c.id ? 'bg-violet-500/10 border-violet-500/40' : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800 hover:border-slate-600'}`}>
          <div className="flex items-center gap-3">
            <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{c.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{c.name}</p>
              <p className="text-xs text-slate-400 truncate">{c.role}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-teal-400">{c.score}%</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLE[c.status] ?? STATUS_STYLE['new']}`}>{c.status}</span>
            </div>
          </div>
          {selectedCandidate?.id === c.id && (
            <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
              <p className="text-xs text-slate-400">Applied for: <span className="text-white">{c.job}</span></p>
              <div className="flex gap-2">
                <button className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1"><UserCheck className="w-3 h-3" /> Invite</button>
                <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Save</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// ── Candidates Tab ────────────────────────────────────────────────────────────
const CandidatesTab = ({ employerId, onStartMessage }: { employerId: string; onStartMessage: (candidate: Candidate) => void }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API}/employer/candidates?employer_id=${employerId}`)
      .then(r => setCandidates(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [employerId]);

  const updateStatus = async (appId: string, stage: string) => {
    setUpdating(appId);
    try {
      await axios.put(`${API}/employer/applications/${appId}/stage`, { stage });
      setCandidates(prev => prev.map(c => c.id === appId ? { ...c, status: stage.toLowerCase() } : c));
    } catch {} finally { setUpdating(null); }
  };

  const handleMessage = async (e: React.MouseEvent, candidate: Candidate) => {
    e.stopPropagation();
    setMessagingId(candidate.id);
    try {
      await axios.post(`${API}/employer/conversations/start`, {
        employer_id: employerId,
        candidate_id: candidate.id,
        initial_message: `Hi ${candidate.name}, I came across your profile and I'm interested in discussing an opportunity with you.`
      });
      setSuccessId(candidate.id);
      setTimeout(() => { setSuccessId(null); onStartMessage(candidate); }, 1000);
    } catch {
      onStartMessage(candidate);
    } finally { setMessagingId(null); }
  };

  const filtered = candidates.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..." className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
        </select>
      </div>
      {filtered.length === 0
        ? <div className="text-center py-16"><Users className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No candidates found</p></div>
        : <div className="space-y-3">
            {filtered.map((c, i) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="text-sm text-slate-400">{c.role}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Applied for: {c.job}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-bold text-teal-400">{c.score}%</p>
                    <p className="text-xs text-slate-500">AI Match</p>
                  </div>
                  <button
                    onClick={(e) => handleMessage(e, c)}
                    disabled={messagingId === c.id}
                    title="Message Candidate"
                    className={`p-2 rounded-lg transition flex items-center justify-center border ${
                      successId === c.id
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-teal-400 hover:border-teal-500/50 hover:bg-teal-500/10'
                    }`}
                  >
                    {messagingId === c.id ? <Loader2 size={16} className="animate-spin" /> : successId === c.id ? <span className="text-xs px-1">✓</span> : <MessageSquare size={16} />}
                  </button>
                  <div className="relative">
                    <select value={c.status.toUpperCase()} onChange={e => updateStatus(c.id, e.target.value)} disabled={updating === c.id}
                      className="appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none pr-7 cursor-pointer hover:border-violet-500 transition">
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {updating === c.id ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 animate-spin" /> : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
};

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
const JobsTab = ({ employerId, onPostJob, refreshKey }: { employerId: string; onPostJob: () => void; refreshKey: number; }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobApplicants, setJobApplicants] = useState<Record<string, Application[]>>({});
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/employer/jobs?employer_id=${employerId}`)
      .then(r => setJobs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [employerId, refreshKey]);

  const loadApplicants = async (jobId: string) => {
    if (jobApplicants[jobId]) return;
    setLoadingApplicants(jobId);
    try {
      const res = await axios.get(`${API}/employer/candidates?employer_id=${employerId}`);
      setJobApplicants(prev => ({ ...prev, [jobId]: res.data.filter((c: Application) => c.job_id === jobId) }));
    } catch {} finally { setLoadingApplicants(null); }
  };

  const toggleJob = (jobId: string) => {
    if (expandedJob === jobId) { setExpandedJob(null); return; }
    setExpandedJob(jobId); loadApplicants(jobId);
  };

  const updateStatus = async (appId: string, stage: string, jobId: string) => {
    setUpdatingApp(appId);
    try {
      await axios.put(`${API}/employer/applications/${appId}/stage`, { stage });
      setJobApplicants(prev => ({ ...prev, [jobId]: prev[jobId].map(a => a.id === appId ? { ...a, status: stage.toLowerCase() } : a) }));
    } catch {} finally { setUpdatingApp(null); }
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''} posted</p>
        <button onClick={onPostJob} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"><Plus className="w-4 h-4" /> Post New Job</button>
      </div>
      {jobs.length === 0
        ? <div className="text-center py-16"><Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 mb-3">No jobs posted yet</p><button onClick={onPostJob} className="text-violet-400 hover:text-violet-300 text-sm">Post your first job →</button></div>
        : <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 transition" onClick={() => toggleJob(job.id)}>
                  <div className="bg-violet-500/10 border border-violet-500/20 p-2.5 rounded-xl shrink-0"><Briefcase className="w-5 h-5 text-violet-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{job.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.days_ago}d ago</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right"><p className="font-bold text-white">{job.applicants}</p><p className="text-xs text-slate-400">applicants</p></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>{job.active ? '● Active' : 'Closed'}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {expandedJob === job.id && (
                  <div className="border-t border-slate-800 p-4">
                    <p className="text-sm font-semibold text-white mb-3">Applicants</p>
                    {loadingApplicants === job.id ? <Skeleton className="h-16" />
                      : !jobApplicants[job.id]?.length ? <p className="text-sm text-slate-400 py-4 text-center">No applicants yet</p>
                      : <div className="space-y-2">
                          {jobApplicants[job.id].map((app, i) => (
                            <div key={app.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                              <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{app.avatar}</div>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{app.name}</p><p className="text-xs text-slate-400">{app.role}</p></div>
                              <p className="text-sm font-bold text-teal-400 shrink-0">{app.score}%</p>
                              <div className="relative shrink-0">
                                <select value={app.status.toUpperCase()} onChange={e => updateStatus(app.id, e.target.value, job.id)} disabled={updatingApp === app.id}
                                  className="appearance-none bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white outline-none pr-7 cursor-pointer hover:border-violet-500 transition">
                                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {updatingApp === app.id ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 animate-spin" /> : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />}
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
      }
    </div>
  );
};

// ── Messages Tab ──────────────────────────────────────────────────────────────
const MessagesTab = ({ employerId }: { employerId: string }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convError, setConvError] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!employerId) return;
    axios.get(`${API}/employer/conversations?employer_id=${employerId}`)
      .then(r => { setConversations(r.data); if (r.data.length > 0) setSelectedConv(r.data[0]); })
      .catch(() => setConvError('Failed to load conversations'))
      .finally(() => setLoadingConvs(false));
  }, [employerId]);

  useEffect(() => {
    if (!selectedConv) return;
    setLoadingMsgs(true); setMessages([]);
    axios.get(`${API}/employer/conversations/${selectedConv.id}/messages`)
      .then(r => setMessages(r.data)).catch(() => {}).finally(() => setLoadingMsgs(false));
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await axios.post(`${API}/employer/conversations/${selectedConv.id}/messages`, { text: messageText.trim() });
      setMessages(prev => [...prev, res.data]); setMessageText('');
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, last_message: messageText.trim(), last_message_time: 'Just now', unread_count: 0 } : c));
    } catch {} finally { setSending(false); }
  };

  const filteredConvs = conversations.filter(c => c.candidate_name.toLowerCase().includes(search.toLowerCase()) || c.candidate_role.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)] min-h-96">
      <div className="w-72 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loadingConvs && [...Array(3)].map((_, i) => <div key={i} className="p-4 border-b border-slate-800/50"><Skeleton className="h-12" /></div>)}
          {convError && <div className="p-4 text-center"><AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /><p className="text-xs text-red-400">{convError}</p></div>}
          {!loadingConvs && !convError && filteredConvs.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No conversations yet</p>
              <p className="text-xs text-slate-500 mt-1">Go to Candidates to start one</p>
            </div>
          )}
          {filteredConvs.map((conv, i) => (
            <div key={conv.id} onClick={() => setSelectedConv(conv)} className={`p-4 cursor-pointer border-b border-slate-800/50 transition ${selectedConv?.id === conv.id ? 'bg-violet-500/10' : 'hover:bg-slate-800/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{conv.candidate_avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center"><p className="text-sm font-semibold text-white truncate">{conv.candidate_name}</p><span className="text-xs text-slate-500 shrink-0 ml-1">{conv.last_message_time}</span></div>
                  <p className="text-xs text-slate-400 truncate">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && <span className="w-5 h-5 bg-violet-500 rounded-full text-xs text-white flex items-center justify-center shrink-0">{conv.unread_count}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedConv ? (
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${AVATAR_COLORS[conversations.findIndex(c => c.id === selectedConv.id) % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>{selectedConv.candidate_avatar}</div>
              <div><p className="font-semibold text-white">{selectedConv.candidate_name}</p><p className="text-xs text-slate-400">{selectedConv.candidate_role}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"><Phone className="w-4 h-4" /></button>
              <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"><Video className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {loadingMsgs && [...Array(3)].map((_, i) => <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}><Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-56'}`} /></div>)}
            {!loadingMsgs && messages.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-slate-500 text-sm">No messages yet. Say hello!</p></div>}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'employer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'employer' ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
                  <p>{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'employer' ? 'text-violet-200' : 'text-slate-500'}`}>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-800 flex items-center gap-3">
            <input value={messageText} onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 transition" />
            <button onClick={sendMessage} disabled={sending || !messageText.trim()} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition">
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

// ── Interviews Tab ────────────────────────────────────────────────────────────
const InterviewsTab = ({ employerId }: { employerId: string }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employerId) return;
    Promise.all([
      axios.get(`${API}/employer/interviews?employer_id=${employerId}`),
      axios.get(`${API}/employer/interviews/stats?employer_id=${employerId}`),
    ]).then(([ir, sr]) => { setInterviews(ir.data); setStats(sr.data); })
      .catch(() => setError('Failed to load interviews')).finally(() => setLoading(false));
  }, [employerId]);

  const upcoming = interviews.filter(iv => iv.status === 'scheduled');
  const typeStyle = (type: string) => {
    if (type === 'Video Call') return 'bg-violet-500/15 text-violet-400';
    if (type === 'Phone Screen') return 'bg-teal-500/15 text-teal-400';
    return 'bg-amber-500/15 text-amber-400';
  };

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></div>;
  if (error) return <div className="text-center py-16"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><p className="text-red-400">{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Scheduled', value: stats?.scheduled ?? 0, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'This Week', value: stats?.this_week ?? 0, color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20'   },
          { label: 'Completed', value: stats?.completed ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20'},
        ].map(s => (
          <div key={s.label} className={`bg-slate-900 border ${s.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <h3 className="font-semibold text-white">Upcoming Interviews</h3>
      {upcoming.length === 0
        ? <div className="text-center py-16"><CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No upcoming interviews scheduled</p></div>
        : <div className="space-y-3">
            {upcoming.map((interview, i) => (
              <div key={interview.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{interview.candidate_avatar}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-white">{interview.candidate_name}</p><p className="text-sm text-slate-400">{interview.candidate_role}</p></div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{formatInterviewDate(interview.scheduled_at)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${typeStyle(interview.interview_type)}`}>{interview.interview_type}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {interview.interview_type === 'Video Call' && <button className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition"><Video className="w-4 h-4" /></button>}
                  <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"><Calendar className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
};

// ── AI Coach Tab ──────────────────────────────────────────────────────────────
interface AiMessage { role: 'user' | 'assistant'; text: string; }

const EMPLOYER_SUGGESTIONS = [
  'Write a job description for a Senior React Developer',
  'What are good interview questions for a backend engineer?',
  'How do I evaluate a candidate\'s cultural fit?',
  'Help me write a rejection email that\'s kind and professional',
  'What salary range is competitive for a mid-level data scientist in Nairobi?',
  'How do I reduce time-to-hire?',
];

const AiCoachTab = ({ employerId }: { employerId: string }) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: 'assistant', text: "Hi! I'm your AI Hiring Coach 👋 I can help you write job descriptions, prepare interview questions, evaluate candidates, draft offer letters, and more. What do you need help with today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert AI Hiring Coach for TechHire, a tech recruitment platform based in Kenya. You help employers with:
- Writing compelling job descriptions for tech roles
- Preparing technical and behavioral interview questions
- Evaluating candidate profiles and resumes
- Drafting professional offer letters
- Salary benchmarking in KES and compensation advice for the Kenyan market
- Building diverse and inclusive hiring pipelines
- Onboarding best practices
Be concise, practical, and actionable. Use bullet points and structure when helpful.`,
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
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Bot className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-white">AI Hiring Coach</p>
          <p className="text-xs text-violet-400">● Online · Powered by Claude</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
            )}
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mr-2">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {EMPLOYER_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your hiring coach anything..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 transition"
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const EmployerDashboard = () => {
  const { user, logout } = useAuthStore();
  const employerId = user?.id ?? '';

  const [stats, setStats] = useState<Stats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [_errorStats, setErrorStats] = useState<string | null>(null);
  const [errorCandidates, setErrorCandidates] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCandidatesDrawer, setShowCandidatesDrawer] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0);

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('th_theme') as Theme) || 'dark');
  useEffect(() => {
    localStorage.setItem('th_theme', theme);
    document.documentElement.classList.toggle('light-mode', theme === 'light');
  }, [theme]);

  const handleSignOut = () => { logout?.(); window.location.href = '/'; };

  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState('Full Time');
  const [jobSalary, setJobSalary] = useState('');
  const [jobLevel, setJobLevel] = useState('Mid Level');
  const [jobCategory, setJobCategory] = useState('Engineering & Tech');
  const [editorContent, setEditorContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!employerId) return;
    const fetchAll = async () => {
      try { const r = await axios.get(`${API}/employer/stats?employer_id=${employerId}`); setStats(r.data); } catch { setErrorStats('Failed'); } finally { setLoadingStats(false); }
      try { const r = await axios.get(`${API}/employer/pipeline?employer_id=${employerId}`); setPipeline(r.data); } catch {} finally { setLoadingPipeline(false); }
      try { const r = await axios.get(`${API}/employer/candidates?employer_id=${employerId}`); setCandidates(r.data); } catch { setErrorCandidates('Failed'); } finally { setLoadingCandidates(false); }
      try { const r = await axios.get(`${API}/employer/jobs?employer_id=${employerId}`); setJobs(r.data); } catch {} finally { setLoadingJobs(false); }
    };
    fetchAll();
  }, [employerId]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault(); setPosting(true); setPostError(null);
    try {
      const [salaryMin, salaryMax] = jobSalary.replace(/\$/g, '').split(/[-–]/).map(s => parseInt(s.replace(/k/i, '')) * 1000);
      await axios.post(`${API}/employer/jobs`, { employer_id: employerId, title: jobTitle, description: editorContent, location: jobLocation, type: jobType, salary_min: salaryMin || null, salary_max: salaryMax || null, experience_level: jobLevel, category: jobCategory });
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/employer/jobs?employer_id=${employerId}`),
        axios.get(`${API}/employer/stats?employer_id=${employerId}`),
      ]);
      setJobs(jobsRes.data); setStats(statsRes.data);
      setJobsRefreshKey(prev => prev + 1);
      setShowPostForm(false);
      setJobTitle(''); setJobLocation(''); setJobSalary(''); setEditorContent(''); setJobCategory('Engineering & Tech');
      setActiveTab('jobs');
    } catch { setPostError('Failed to post job. Please try again.'); }
    finally { setPosting(false); }
  };

  const handleStartMessage = (_candidate: Candidate) => { setActiveTab('messages'); };

  const totalPipeline = pipeline.reduce((s, p) => s + p.count, 0);
  const STATS_CONFIG = [
    { label: 'Jobs Posted',      value: stats?.jobs_posted,      delta: 'Total posted',     icon: Briefcase,   light: 'bg-violet-500/10 border-violet-500/20',   text: 'text-violet-400'  },
    { label: 'Total Applicants', value: stats?.total_applicants, delta: 'Across all jobs',  icon: Users,       light: 'bg-teal-500/10 border-teal-500/20',       text: 'text-teal-400'    },
    { label: 'Jobs Closed',      value: stats?.jobs_closed,      delta: 'Filled positions', icon: CheckCircle, light: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
    { label: 'Hire Success',     value: stats?.hire_success,     delta: 'Offer acceptance', icon: TrendingUp,  light: 'bg-amber-500/10 border-amber-500/20',     text: 'text-amber-400'   },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'candidates': return <CandidatesTab employerId={employerId} onStartMessage={handleStartMessage} />;
      case 'jobs':       return <JobsTab employerId={employerId} onPostJob={() => setShowPostForm(true)} refreshKey={jobsRefreshKey} />;
      case 'messages':   return <MessagesTab employerId={employerId} />;
      case 'interviews': return <InterviewsTab employerId={employerId} />;
      case 'ai':         return <AiCoachTab employerId={employerId} />;
      default:           return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900 border-r border-slate-800 py-6 px-3 shrink-0 sticky top-0 h-screen">
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2">
            <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0"><p className="text-xs font-semibold text-white truncate">TechHire Co.</p><p className="text-xs text-slate-400">Employer</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>
        <div className="px-3 mt-4">
          <button onClick={() => setShowPostForm(true)} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-violet-500/20">
            <Plus className="w-4 h-4" /> Post a Job
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-slate-900/80 border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white capitalize">{activeTab === 'ai' ? 'AI Hiring Coach' : activeTab}</h1>
            <span className="hidden md:block text-xs text-slate-500">/ Employer Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="Search candidates, jobs..." className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-40 lg:w-48" />
            </div>
            <button onClick={() => setShowCandidatesDrawer(true)} className="xl:hidden flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-700 transition">
              <Users className="w-3.5 h-3.5" /> Candidates
            </button>
            <button className="relative p-2 rounded-lg hover:bg-slate-800 transition">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-teal-400 rounded-full" />
            </button>
            <button onClick={() => setShowPostForm(true)} className="lg:hidden flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Post Job</span>
            </button>
            <SettingsDropdown theme={theme} onThemeChange={setTheme} onSignOut={handleSignOut} />
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5 pb-24 lg:pb-6">
            {activeTab === 'overview' && (
              <>
                <div className="relative bg-gradient-to-r from-violet-600/20 via-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-4 md:p-5 overflow-hidden">
                  <p className="text-slate-400 text-sm">Welcome back 👋</p>
                  <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">Good morning, Employer</h2>
                  <p className="text-slate-400 text-sm mt-1">You have <span className="text-teal-400 font-semibold">{loadingStats ? '...' : `${pipeline.find(p => p.stage === 'Applied')?.count ?? 0} new applicants`}</span> in your pipeline today.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {STATS_CONFIG.map(({ label, value, delta, icon: Icon, light, text }) => (
                    <div key={label} className={`bg-slate-900 border ${light} rounded-2xl p-4 md:p-5`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`${light} border p-2 md:p-2.5 rounded-xl`}><Icon className={`${text} w-4 h-4`} /></div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      {loadingStats ? <Skeleton className="h-8 w-16 mb-1" /> : <p className="text-xl md:text-2xl font-bold text-white">{value ?? '—'}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                      <p className={`text-xs ${text} mt-1 font-medium`}>{delta}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h2 className="font-bold text-white">Hiring Pipeline</h2><p className="text-xs text-slate-400 mt-0.5">{totalPipeline} candidates across all stages</p></div>
                    <button onClick={() => setActiveTab('candidates')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 border border-violet-500/30 px-3 py-1.5 rounded-lg transition">Details <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  {loadingPipeline ? <Skeleton className="h-2.5 w-full mb-4" /> : (
                    <>
                      <div className="flex h-2.5 rounded-full overflow-hidden mb-4 gap-0.5">
                        {pipeline.map(({ stage, count }) => (
                          <div key={stage} className={PIPELINE_COLORS[stage]?.bar ?? 'bg-slate-500'} style={{ width: totalPipeline ? `${(count / totalPipeline) * 100}%` : '0%' }} title={`${stage}: ${count}`} />
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {pipeline.map(({ stage, count }) => {
                          const c = PIPELINE_COLORS[stage] ?? { bg: 'bg-slate-500/20', text: 'text-slate-300' };
                          return (
                            <div key={stage} className="text-center">
                              <div className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg ${c.bg} mb-1`}><span className={`text-xs md:text-sm font-bold ${c.text}`}>{count}</span></div>
                              <p className="text-xs text-slate-400 hidden sm:block">{stage}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-white">Recent Job Posts</h2>
                    <button onClick={() => setActiveTab('jobs')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  {loadingJobs ? <>{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 mb-2" />)}</> :
                    jobs.length === 0
                      ? <div className="text-center py-10"><Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-sm">No jobs posted yet</p><button onClick={() => setShowPostForm(true)} className="mt-3 text-xs text-violet-400 hover:text-violet-300">Post your first job →</button></div>
                      : <div className="space-y-2">
                          {jobs.slice(0, 5).map(job => (
                            <div key={job.id} onClick={() => setActiveTab('jobs')} className="flex items-center gap-3 md:gap-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-slate-600 rounded-xl p-3 md:p-4 transition cursor-pointer">
                              <div className="bg-violet-500/10 border border-violet-500/20 p-2 md:p-2.5 rounded-xl shrink-0"><Briefcase className="w-4 h-4 text-violet-400" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{job.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                                  <span className="hidden sm:flex items-center gap-1"><Clock className="w-3 h-3" />{job.days_ago}d ago</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right"><p className="text-sm font-bold text-white">{job.applicants}</p><p className="text-xs text-slate-400 hidden sm:block">applicants</p></div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>{job.active ? '● Active' : 'Closed'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                  }
                </div>
              </>
            )}
            {activeTab !== 'overview' && renderTab()}
          </div>

          {/* Right Candidates Panel */}
          <aside className="hidden xl:flex flex-col w-80 border-l border-slate-800 bg-slate-900/50 shrink-0 sticky top-0 h-screen overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-white">Top Candidates</h2>
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full"><Zap className="w-3 h-3" /> AI Ranked</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Filter candidates..." className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1" />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              <CandidateList candidates={candidates} loading={loadingCandidates} error={errorCandidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} />
            </div>
            <div className="p-4 border-t border-slate-800">
              <button onClick={() => setActiveTab('candidates')} className="w-full text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl py-2.5 transition">View All Candidates</button>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ icon: Icon, label, tab }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${activeTab === tab ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <div className={`p-1.5 rounded-lg transition-all ${activeTab === tab ? 'bg-violet-500/15' : ''}`}><Icon className="w-5 h-5" /></div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
        <button onClick={() => setShowPostForm(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
          <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-500/30"><Plus className="w-5 h-5 text-white" /></div>
          <span className="text-xs font-medium text-slate-500">Post</span>
        </button>
      </nav>

      {/* Candidates Drawer */}
      {showCandidatesDrawer && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowCandidatesDrawer(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-slate-900 border-l border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Top Candidates</h2>
              <button onClick={() => setShowCandidatesDrawer(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              <CandidateList candidates={candidates} loading={loadingCandidates} error={errorCandidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} />
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowPostForm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-2xl space-y-4 max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg md:text-xl font-bold text-white">Create Job Posting</h2><p className="text-xs text-slate-400 mt-0.5">Fill in the details to attract top candidates</p></div>
              <button onClick={() => setShowPostForm(false)} className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            {postError && <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> {postError}</div>}
            <form onSubmit={handlePostJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Job Title *</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required placeholder="e.g. Senior React Developer" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Location</label>
                  <select value={jobLocation} onChange={e => setJobLocation(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition">
                    <option value="">Select location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Job Type</label>
                  <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition">
                    <option>Full Time</option><option>Part Time</option><option>Contract</option><option>Remote</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Category</label>
                  <select value={jobCategory} onChange={e => setJobCategory(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Experience Level</label>
                  <select value={jobLevel} onChange={e => setJobLevel(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition">
                    <option>Entry Level</option><option>Mid Level</option><option>Senior</option><option>Lead / Manager</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Salary Range (KES)</label>
                  <input type="text" value={jobSalary} onChange={e => setJobSalary(e.target.value)} placeholder="e.g. 80k – 120k" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none transition" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">Job Description</label>
                  <QuillEditor value={editorContent} onChange={setEditorContent} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPostForm(false)} className="flex-1 border border-slate-700 hover:border-slate-500 text-slate-300 py-3 rounded-xl transition text-sm font-medium">Cancel</button>
                <button type="submit" disabled={posting} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white py-3 rounded-xl transition text-sm font-semibold shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2">
                  {posting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;