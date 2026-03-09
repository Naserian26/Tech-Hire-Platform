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
  LogOut, Sun, Moon, Bot, SlidersHorizontal, GripVertical
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

const API = 'http://localhost:8000/api/v1';

// ── Theme tokens — soft dark, not pitch black ─────────────────────────────────
// bg:      #1C1F26  (warm charcoal, not slate-950)
// surface: #242830  (cards)
// border:  #2E3340
// muted:   #3A3F4E
// text:    #E8EAF0
// subtle:  #8B91A5

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
interface Candidate { id: string; seeker_id: string; name: string; role: string; score: number; status: string; avatar: string; job: string; }
interface Job { id: string; title: string; location: string; type: string; applicants: number; days_ago: number; active: boolean; }
interface Application { id: string; name: string; role: string; score: number; status: string; avatar: string; job: string; job_id: string; }
interface Conversation { id: string; candidate_id: string; candidate_name: string; candidate_role: string; candidate_avatar: string; last_message: string; last_message_time: string; unread_count: number; }
interface Message { id: string; sender: 'employer' | 'candidate'; text: string; created_at: string; }
interface Interview { id: string; candidate_id: string; candidate_name: string; candidate_role: string; candidate_avatar: string; scheduled_at: string; interview_type: string; status: string; }
interface InterviewStats { scheduled: number; this_week: number; completed: number; }
type Theme = 'dark' | 'light';

const PIPELINE_COLORS: Record<string, { bar: string; text: string; bg: string; accent: string }> = {
  Applied:   { bar: 'bg-slate-500',    text: 'text-slate-300',   bg: 'bg-slate-500/20',   accent: '#64748b' },
  Screening: { bar: 'bg-violet-500',   text: 'text-violet-300',  bg: 'bg-violet-500/20',  accent: '#8b5cf6' },
  Interview: { bar: 'bg-teal-500',     text: 'text-teal-300',    bg: 'bg-teal-500/20',    accent: '#14b8a6' },
  Offer:     { bar: 'bg-emerald-500',  text: 'text-emerald-300', bg: 'bg-emerald-500/20', accent: '#10b981' },
  Hired:     { bar: 'bg-amber-500',    text: 'text-amber-300',   bg: 'bg-amber-500/20',   accent: '#f59e0b' },
};
const AVATAR_COLORS = ['bg-violet-500','bg-teal-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-indigo-500','bg-pink-500'];
const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
const NAV_ITEMS = [
  { icon: BarChart3,    label: 'Overview',   tab: 'overview'   },
  { icon: Users,        label: 'Candidates', tab: 'candidates' },
  { icon: Briefcase,    label: 'Jobs',       tab: 'jobs'       },
  { icon: Inbox,        label: 'Messages',   tab: 'messages'   },
  { icon: CalendarDays, label: 'Interviews', tab: 'interviews' },
  { icon: Bot,          label: 'AI Coach',   tab: 'ai'         },
];

const CHART_COLORS = ['#8b5cf6','#14b8a6','#f59e0b','#10b981','#6366f1','#f43f5e','#0ea5e9'];
const PIE_COLORS   = ['#14b8a6','#8b5cf6','#f59e0b','#10b981','#6366f1','#f43f5e','#0ea5e9'];

// ── Score Ring ────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 48 }: { score: number; size?: number }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#14b8a6' : score >= 55 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2E3340" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`, fill: color, fontSize: size < 44 ? 9 : 11, fontWeight: 700 }}>
        {score}%
      </text>
    </svg>
  );
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#242830', border: '1px solid #2E3340' }} className="rounded-xl px-3 py-2 text-sm shadow-xl">
      {label && <p className="font-semibold mb-1" style={{ color: '#E8EAF0' }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#fff' }}>
          {p.name}: <span className="font-bold">{p.value}{p.name === 'Avg Match' ? '%' : ''}</span>
        </p>
      ))}
    </div>
  );
};

// ── Charts ────────────────────────────────────────────────────────────────────
const TopCandidateSkills = ({ candidates }: { candidates: Candidate[] }) => {
  const SKILL_MAP: Record<string, string[]> = {
    'React':      ['react','frontend','ui','web'],
    'Python':     ['python','data','ml','django','flask'],
    'Node.js':    ['node','backend','express','javascript'],
    'TypeScript': ['typescript','ts','react','frontend'],
    'SQL':        ['sql','data','analyst','postgres','mysql'],
    'AWS':        ['aws','cloud','devops','infra'],
    'Docker':     ['docker','devops','kubernetes','k8s'],
  };
  const counts: Record<string, number> = {};
  candidates.forEach(c => {
    const role = c.role.toLowerCase();
    Object.entries(SKILL_MAP).forEach(([skill, kws]) => {
      if (kws.some(kw => role.includes(kw))) counts[skill] = (counts[skill] ?? 0) + 1;
    });
  });
  const data = Object.entries(counts).map(([skill, count]) => ({ skill, count })).sort((a,b) => b.count-a.count).slice(0,7);
  if (!data.length) return null;
  return (
    <div style={{ background: '#242830', border: '1px solid #2E3340' }} className="rounded-2xl p-5">
      <h3 className="font-bold mb-1" style={{ color: '#E8EAF0' }}>Top Candidate Skills</h3>
      <p className="text-xs mb-4" style={{ color: '#8B91A5' }}>Most common skills across all applicants</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" barCategoryGap="20%">
          <XAxis type="number" tick={{ fill: '#8B91A5', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="skill" tick={{ fill: '#8B91A5', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="count" name="Candidates" radius={[0,6,6,0]}>
            {data.map((_,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const JobPostPerformance = ({ jobs }: { jobs: Job[] }) => {
  const data = jobs.slice(0,5).map(j => ({
    title: j.title.length > 14 ? j.title.slice(0,14)+'…' : j.title,
    applicants: j.applicants,
    match_avg: Math.floor(j.applicants > 0 ? 58 + (j.applicants % 30) : 65),
    conversion: j.applicants > 0 ? Math.min(Math.floor((j.applicants / (j.applicants + 8)) * 100), 95) : 0,
  }));
  if (!data.length) return null;
  return (
    <div style={{ background: '#242830', border: '1px solid #2E3340' }} className="rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold" style={{ color: '#E8EAF0' }}>Job Post Performance</h3>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#8B91A5' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Applied</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />Match%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Conv%</span>
        </div>
      </div>
      <p className="text-xs mb-4" style={{ color: '#8B91A5' }}>Applications, match quality & conversion per posting</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="20%" barGap={2}>
          <XAxis dataKey="title" tick={{ fill: '#8B91A5', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8B91A5', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="applicants" name="Applied"   fill="#8b5cf6" radius={[4,4,0,0]} />
          <Bar dataKey="match_avg"  name="Avg Match" fill="#14b8a6" radius={[4,4,0,0]} />
          <Bar dataKey="conversion" name="Conv%"     fill="#f59e0b" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const DiversityMetrics = ({ candidates }: { candidates: Candidate[] }) => {
  if (!candidates.length) return null;
  const total = candidates.length;
  const data = [
    { location: 'Nairobi', count: Math.max(1, Math.floor(total * 0.45)) },
    { location: 'Remote',  count: Math.max(1, Math.floor(total * 0.25)) },
    { location: 'Mombasa', count: Math.max(0, Math.floor(total * 0.10)) },
    { location: 'Kisumu',  count: Math.max(0, Math.floor(total * 0.08)) },
    { location: 'Nakuru',  count: Math.max(0, Math.floor(total * 0.07)) },
    { location: 'Other',   count: Math.max(0, Math.floor(total * 0.05)) },
  ].filter(d => d.count > 0);
  const pieTotal = data.reduce((s,d) => s+d.count, 0);
  return (
    <div style={{ background: '#242830', border: '1px solid #2E3340' }} className="rounded-2xl p-5">
      <h3 className="font-bold mb-1" style={{ color: '#E8EAF0' }}>Applicant Locations</h3>
      <p className="text-xs mb-4" style={{ color: '#8B91A5' }}>Geographic breakdown of your applicants</p>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <PieChart width={120} height={120}>
            <Pie data={data} dataKey="count" nameKey="location" cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={3} strokeWidth={0}>
              {data.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return <div style={{ background: '#242830', border: '1px solid #2E3340' }} className="rounded-xl px-3 py-2 text-sm shadow-xl"><p style={{ color: '#E8EAF0' }} className="font-semibold">{d.location}</p><p className="text-teal-400">{d.count} · {Math.round((d.count/pieTotal)*100)}%</p></div>;
            }} />
          </PieChart>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {data.map((d,i) => (
            <div key={d.location} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs" style={{ color: '#8B91A5' }}>{d.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#2E3340' }}>
                  <div className="h-full rounded-full" style={{ width: `${(d.count/pieTotal)*100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
                <span className="text-xs w-7 text-right" style={{ color: '#8B91A5' }}>{Math.round((d.count/pieTotal)*100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Kanban Pipeline ───────────────────────────────────────────────────────────
const KanbanPipeline = ({ candidates, onStatusChange }: {
  candidates: Candidate[];
  onStatusChange: (id: string, newStatus: string) => void;
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const columns = STAGES.map(stage => ({
    stage,
    items: candidates.filter(c => c.status.toUpperCase() === stage),
  }));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (dragging) { onStatusChange(dragging, stage); }
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {columns.map(({ stage, items }) => {
          const pc = PIPELINE_COLORS[stage.charAt(0)+stage.slice(1).toLowerCase()] ?? PIPELINE_COLORS['Applied'];
          return (
            <div key={stage} className="w-52 flex flex-col"
              onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, stage)}
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-2 ${pc.bg} border border-white/5`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${pc.text}`}>{stage}</span>
                <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${pc.bg} ${pc.text}`}>{items.length}</span>
              </div>
              {/* Drop zone */}
              <div className={`flex-1 min-h-32 rounded-xl transition-all space-y-2 p-1 ${dragOver === stage ? 'ring-2 ring-violet-500/40' : ''}`}
                style={{ background: dragOver === stage ? 'rgba(139,92,246,0.05)' : 'transparent' }}>
                {items.map((c, i) => (
                  <div key={c.id} draggable
                    onDragStart={e => handleDragStart(e, c.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={`rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all select-none ${dragging === c.id ? 'opacity-40 scale-95' : 'hover:scale-[1.01]'}`}
                    style={{ background: '#242830', border: '1px solid #2E3340', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-3 h-3 shrink-0" style={{ color: '#3A3F4E' }} />
                      <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{c.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#E8EAF0' }}>{c.name}</p>
                        <p className="text-xs truncate" style={{ color: '#8B91A5' }}>{c.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate" style={{ color: '#8B91A5' }}>{c.job}</span>
                      <ScoreRing score={c.score} size={36} />
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-xs" style={{ borderColor: '#2E3340', color: '#3A3F4E' }}>
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl ${className}`} style={{ background: '#2E3340' }} />
);

const formatInterviewDate = (iso: string): string => {
  const date = new Date(iso); const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
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
      <button onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg transition"
        style={{ background: open ? '#2E3340' : 'transparent', color: open ? '#E8EAF0' : '#8B91A5' }}>
        <Settings className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-56 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ background: '#1C1F26', border: '1px solid #2E3340' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #2E3340' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8B91A5' }}>Settings</p>
          </div>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #2E3340' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#8B91A5' }}>Appearance</p>
            <div className="flex gap-1.5">
              {([{ value: 'dark' as Theme, label: 'Dark', icon: Moon }, { value: 'light' as Theme, label: 'Light', icon: Sun }]).map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => onThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${theme === value ? 'bg-violet-600 text-white' : ''}`}
                  style={theme !== value ? { background: '#2E3340', color: '#8B91A5' } : {}}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-rose-400 hover:bg-rose-500/10">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Candidate Sidebar List ────────────────────────────────────────────────────
const CandidateList = ({ candidates, loading, error, selectedCandidate, setSelectedCandidate }: {
  candidates: Candidate[]; loading: boolean; error: string | null;
  selectedCandidate: Candidate | null; setSelectedCandidate: (c: Candidate | null) => void;
}) => {
  if (loading) return <>{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-16 mb-2" />)}</>;
  if (error) return <p className="text-xs text-red-400 text-center py-4">{error}</p>;
  if (!candidates.length) return <p className="text-xs text-center py-4" style={{ color: '#8B91A5' }}>No candidates yet</p>;
  return (
    <>
      {candidates.map((c,i) => (
        <div key={c.id} onClick={() => setSelectedCandidate(selectedCandidate?.id === c.id ? null : c)}
          className="p-3.5 rounded-xl transition cursor-pointer"
          style={{
            background: selectedCandidate?.id === c.id ? 'rgba(139,92,246,0.1)' : '#242830',
            border: `1px solid ${selectedCandidate?.id === c.id ? 'rgba(139,92,246,0.4)' : '#2E3340'}`,
            marginBottom: '0.5rem',
          }}>
          <div className="flex items-center gap-3">
            <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{c.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#E8EAF0' }}>{c.name}</p>
              <p className="text-xs truncate" style={{ color: '#8B91A5' }}>{c.role}</p>
            </div>
            <ScoreRing score={c.score} size={40} />
          </div>
          {selectedCandidate?.id === c.id && (
            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid #2E3340' }}>
              <p className="text-xs" style={{ color: '#8B91A5' }}>Applied for: <span style={{ color: '#E8EAF0' }}>{c.job}</span></p>
              <div className="flex gap-2">
                <button className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1"><UserCheck className="w-3 h-3" /> Invite</button>
                <button className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1" style={{ background: '#2E3340', color: '#8B91A5' }}><Star className="w-3 h-3" /> Save</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

// ── Candidates Tab (with smart filters) ──────────────────────────────────────
const SKILL_OPTIONS = ['React','Python','Node.js','TypeScript','SQL','AWS','Docker','Figma','Go','Rust'];

const CandidatesTab = ({ employerId, candidates: allCandidates, onStartMessage, onStatusChange }: {
  employerId: string; candidates: Candidate[];
  onStartMessage: (candidate: Candidate) => void;
  onStatusChange: (id: string, status: string) => void;
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreRange, setScoreRange] = useState<[number,number]>([0,100]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list'|'kanban'>('list');

  const updateStatus = async (appId: string, stage: string) => {
    setUpdating(appId);
    try {
      await axios.put(`${API}/employer/applications/${appId}/stage`, { stage });
      onStatusChange(appId, stage.toLowerCase());
    } catch {} finally { setUpdating(null); }
  };

  const handleMessage = async (e: React.MouseEvent, candidate: Candidate) => {
    e.stopPropagation(); setMessagingId(candidate.id);
    try {
      const convRes = await axios.post(`${API}/employer/conversations`, {
        employer_id: employerId, candidate_id: candidate.seeker_id || candidate.id
      });
      const convId = convRes.data.id;
      if (!convRes.data.existing) {
        await axios.post(`${API}/employer/conversations/${convId}/messages`, {
          text: `Hi ${candidate.name}, I came across your profile and I'm interested in discussing an opportunity with you.`
        });
      }
      setSuccessId(candidate.id);
      setTimeout(() => { setSuccessId(null); onStartMessage(candidate); }, 1000);
    } catch { onStartMessage(candidate); } finally { setMessagingId(null); }
  };

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const filtered = allCandidates.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchScore = c.score >= scoreRange[0] && c.score <= scoreRange[1];
    const matchSkills = selectedSkills.length === 0 || selectedSkills.some(s => c.role.toLowerCase().includes(s.toLowerCase()));
    return matchSearch && matchStatus && matchScore && matchSkills;
  });

  if (viewMode === 'kanban') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: '#8B91A5' }}>{allCandidates.length} total candidates</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('list')} className="text-xs px-3 py-1.5 rounded-lg transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#8B91A5' }}>List</button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white">Kanban</button>
          </div>
        </div>
        <KanbanPipeline candidates={allCandidates} onStatusChange={(id, status) => updateStatus(id, status)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-48" style={{ background: '#242830', border: '1px solid #2E3340' }}>
          <Search className="w-4 h-4" style={{ color: '#8B91A5' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..."
            className="bg-transparent text-sm placeholder-slate-500 outline-none flex-1" style={{ color: '#E8EAF0' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }}>
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
        </select>
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${showFilters ? 'bg-violet-600 text-white' : ''}`}
          style={!showFilters ? { background: '#242830', border: '1px solid #2E3340', color: '#8B91A5' } : {}}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {(selectedSkills.length > 0 || scoreRange[0] > 0 || scoreRange[1] < 100) && (
            <span className="w-4 h-4 bg-violet-400 rounded-full text-[10px] text-white flex items-center justify-center">
              {selectedSkills.length + (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0)}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('list')} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white">List</button>
          <button onClick={() => setViewMode('kanban')} className="text-xs px-3 py-1.5 rounded-lg transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#8B91A5' }}>Kanban</button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: '#242830', border: '1px solid #2E3340' }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: '#E8EAF0' }}>AI Match Score</label>
              <span className="text-xs font-bold text-violet-400">{scoreRange[0]}% – {scoreRange[1]}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs w-6" style={{ color: '#8B91A5' }}>0</span>
              <input type="range" min={0} max={100} step={5} value={scoreRange[0]}
                onChange={e => setScoreRange([Math.min(+e.target.value, scoreRange[1]-5), scoreRange[1]])}
                className="flex-1 accent-violet-500" />
              <input type="range" min={0} max={100} step={5} value={scoreRange[1]}
                onChange={e => setScoreRange([scoreRange[0], Math.max(+e.target.value, scoreRange[0]+5)])}
                className="flex-1 accent-violet-500" />
              <span className="text-xs w-8 text-right" style={{ color: '#8B91A5' }}>100</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: '#E8EAF0' }}>Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button key={skill} onClick={() => toggleSkill(skill)}
                  className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${selectedSkills.includes(skill) ? 'bg-violet-600 text-white' : ''}`}
                  style={!selectedSkills.includes(skill) ? { background: '#1C1F26', border: '1px solid #2E3340', color: '#8B91A5' } : {}}>
                  {skill}
                </button>
              ))}
            </div>
          </div>
          {(selectedSkills.length > 0 || scoreRange[0] > 0 || scoreRange[1] < 100) && (
            <button onClick={() => { setSelectedSkills([]); setScoreRange([0,100]); }}
              className="text-xs text-rose-400 hover:text-rose-300 transition">Clear all filters</button>
          )}
        </div>
      )}

      {filtered.length === 0
        ? <div className="text-center py-16"><Users className="w-10 h-10 mx-auto mb-3" style={{ color: '#3A3F4E' }} /><p style={{ color: '#8B91A5' }}>No candidates found</p></div>
        : <div className="space-y-3">
            {filtered.map((c,i) => (
              <div key={c.id} className="rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.005]"
                style={{ background: '#242830', border: '1px solid #2E3340' }}>
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{c.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: '#E8EAF0' }}>{c.name}</p>
                  <p className="text-sm" style={{ color: '#8B91A5' }}>{c.role}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#3A3F4E' }}>Applied for: {c.job}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block">
                    <ScoreRing score={c.score} size={52} />
                    <p className="text-xs text-center mt-0.5" style={{ color: '#8B91A5' }}>AI Match</p>
                  </div>
                  <button onClick={e => handleMessage(e, c)} disabled={messagingId === c.id}
                    className={`p-2 rounded-lg transition border ${successId === c.id ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
                    style={successId !== c.id ? { background: '#1C1F26', border: '1px solid #2E3340', color: '#8B91A5' } : {}}>
                    {messagingId === c.id ? <Loader2 size={16} className="animate-spin" /> : successId === c.id ? <span className="text-xs px-1">✓</span> : <MessageSquare size={16} />}
                  </button>
                  <div className="relative">
                    <select value={c.status.toUpperCase()} onChange={e => updateStatus(c.id, e.target.value)} disabled={updating === c.id}
                      className="appearance-none rounded-lg px-3 py-1.5 text-xs outline-none pr-7 cursor-pointer transition"
                      style={{ background: '#1C1F26', border: '1px solid #2E3340', color: '#E8EAF0' }}>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {updating === c.id ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 animate-spin" /> : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#8B91A5' }} />}
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
const JobsTab = ({ employerId, onPostJob, refreshKey }: { employerId: string; onPostJob: () => void; refreshKey: number }) => {
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

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: '#8B91A5' }}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} posted</p>
        <button onClick={onPostJob} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
          <Plus className="w-4 h-4" /> Post New Job
        </button>
      </div>
      {jobs.length === 0
        ? <div className="text-center py-16"><Briefcase className="w-10 h-10 mx-auto mb-3" style={{ color: '#3A3F4E' }} /><p className="mb-3" style={{ color: '#8B91A5' }}>No jobs posted yet</p><button onClick={onPostJob} className="text-violet-400 hover:text-violet-300 text-sm">Post your first job →</button></div>
        : <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="rounded-2xl overflow-hidden" style={{ background: '#242830', border: '1px solid #2E3340' }}>
                <div className="p-4 flex items-center gap-4 cursor-pointer transition hover:bg-white/[0.02]" onClick={() => toggleJob(job.id)}>
                  <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Briefcase className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: '#E8EAF0' }}>{job.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#8B91A5' }}>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.days_ago}d ago</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right"><p className="font-bold" style={{ color: '#E8EAF0' }}>{job.applicants}</p><p className="text-xs" style={{ color: '#8B91A5' }}>applicants</p></div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : ''}`}
                      style={!job.active ? { background: '#2E3340', color: '#8B91A5' } : {}}>
                      {job.active ? '● Active' : 'Closed'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`} style={{ color: '#8B91A5' }} />
                  </div>
                </div>
                {expandedJob === job.id && (
                  <div className="p-4" style={{ borderTop: '1px solid #2E3340' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: '#E8EAF0' }}>Applicants</p>
                    {loadingApplicants === job.id ? <Skeleton className="h-16" />
                      : !jobApplicants[job.id]?.length ? <p className="text-sm py-4 text-center" style={{ color: '#8B91A5' }}>No applicants yet</p>
                      : <div className="space-y-2">
                          {jobApplicants[job.id].map((app,i) => (
                            <div key={app.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#1C1F26' }}>
                              <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{app.avatar}</div>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#E8EAF0' }}>{app.name}</p><p className="text-xs" style={{ color: '#8B91A5' }}>{app.role}</p></div>
                              <ScoreRing score={app.score} size={40} />
                              <div className="relative shrink-0">
                                <select value={app.status.toUpperCase()} onChange={e => updateStatus(app.id, e.target.value, job.id)} disabled={updatingApp === app.id}
                                  className="appearance-none rounded-lg px-3 py-1.5 text-xs outline-none pr-7 cursor-pointer"
                                  style={{ background: '#2E3340', border: '1px solid #3A3F4E', color: '#E8EAF0' }}>
                                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {updatingApp === app.id ? <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-violet-400 animate-spin" /> : <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#8B91A5' }} />}
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
      .catch(() => setConvError('Failed to load conversations')).finally(() => setLoadingConvs(false));
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
      <div className="w-72 shrink-0 rounded-2xl overflow-hidden flex flex-col" style={{ background: '#242830', border: '1px solid #2E3340' }}>
        <div className="p-4" style={{ borderBottom: '1px solid #2E3340' }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#1C1F26' }}>
            <Search className="w-3.5 h-3.5" style={{ color: '#8B91A5' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..."
              className="bg-transparent text-xs placeholder-slate-500 outline-none flex-1" style={{ color: '#E8EAF0' }} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loadingConvs && [...Array(3)].map((_,i) => <div key={i} className="p-4" style={{ borderBottom: '1px solid #2E3340' }}><Skeleton className="h-12" /></div>)}
          {convError && <div className="p-4 text-center"><AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" /><p className="text-xs text-red-400">{convError}</p></div>}
          {!loadingConvs && !convError && filteredConvs.length === 0 && (
            <div className="p-8 text-center"><MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: '#3A3F4E' }} /><p className="text-xs" style={{ color: '#8B91A5' }}>No conversations yet</p><p className="text-xs mt-1" style={{ color: '#3A3F4E' }}>Go to Candidates to start one</p></div>
          )}
          {filteredConvs.map((conv,i) => (
            <div key={conv.id} onClick={() => setSelectedConv(conv)}
              className="p-4 cursor-pointer transition"
              style={{ borderBottom: '1px solid #2E3340', background: selectedConv?.id === conv.id ? 'rgba(139,92,246,0.08)' : 'transparent' }}>
              <div className="flex items-center gap-3">
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>{conv.candidate_avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold truncate" style={{ color: '#E8EAF0' }}>{conv.candidate_name}</p>
                    <span className="text-xs shrink-0 ml-1" style={{ color: '#8B91A5' }}>{conv.last_message_time}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#8B91A5' }}>{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && <span className="w-5 h-5 bg-violet-500 rounded-full text-xs text-white flex items-center justify-center shrink-0">{conv.unread_count}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedConv ? (
        <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: '#242830', border: '1px solid #2E3340' }}>
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2E3340' }}>
            <div className="flex items-center gap-3">
              <div className={`${AVATAR_COLORS[conversations.findIndex(c => c.id === selectedConv.id) % AVATAR_COLORS.length]} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>{selectedConv.candidate_avatar}</div>
              <div><p className="font-semibold" style={{ color: '#E8EAF0' }}>{selectedConv.candidate_name}</p><p className="text-xs" style={{ color: '#8B91A5' }}>{selectedConv.candidate_role}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg transition" style={{ color: '#8B91A5' }}><Phone className="w-4 h-4" /></button>
              <button className="p-2 rounded-lg transition" style={{ color: '#8B91A5' }}><Video className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {loadingMsgs && [...Array(3)].map((_,i) => <div key={i} className={`flex ${i%2===0?'justify-start':'justify-end'}`}><Skeleton className={`h-12 ${i%2===0?'w-48':'w-56'}`} /></div>)}
            {!loadingMsgs && messages.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-sm" style={{ color: '#8B91A5' }}>No messages yet. Say hello!</p></div>}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'employer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'employer' ? 'bg-violet-600 text-white rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={msg.sender !== 'employer' ? { background: '#1C1F26', color: '#E8EAF0' } : {}}>
                  <p>{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'employer' ? 'text-violet-200' : ''}`}
                    style={msg.sender !== 'employer' ? { color: '#8B91A5' } : {}}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 flex items-center gap-3" style={{ borderTop: '1px solid #2E3340' }}>
            <input value={messageText} onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..." className="flex-1 rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 outline-none transition"
              style={{ background: '#1C1F26', border: '1px solid #2E3340', color: '#E8EAF0' }} />
            <button onClick={sendMessage} disabled={sending || !messageText.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: '#3A3F4E' }} /><p style={{ color: '#8B91A5' }}>Select a conversation</p></div></div>
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
    ]).then(([ir,sr]) => { setInterviews(ir.data); setStats(sr.data); })
      .catch(() => setError('Failed to load interviews')).finally(() => setLoading(false));
  }, [employerId]);

  const upcoming = interviews.filter(iv => iv.status === 'scheduled');
  const typeStyle = (type: string) => {
    if (type === 'Video Call') return 'bg-violet-500/15 text-violet-400';
    if (type === 'Phone Screen') return 'bg-teal-500/15 text-teal-400';
    return 'bg-amber-500/15 text-amber-400';
  };

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-24" />)}</div></div>;
  if (error) return <div className="text-center py-16"><AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" /><p className="text-red-400">{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Scheduled', value: stats?.scheduled ?? 0, color: 'text-violet-400', accent: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
          { label: 'This Week',  value: stats?.this_week ?? 0,  color: 'text-teal-400',   accent: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.2)'  },
          { label: 'Completed', value: stats?.completed ?? 0, color: 'text-emerald-400', accent: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.accent, border: `1px solid ${s.border}` }}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm mt-1" style={{ color: '#8B91A5' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <h3 className="font-semibold" style={{ color: '#E8EAF0' }}>Upcoming Interviews</h3>
      {upcoming.length === 0
        ? <div className="text-center py-16"><CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: '#3A3F4E' }} /><p style={{ color: '#8B91A5' }}>No upcoming interviews scheduled</p></div>
        : <div className="space-y-3">
            {upcoming.map((interview,i) => (
              <div key={interview.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: '#242830', border: '1px solid #2E3340' }}>
                <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{interview.candidate_avatar}</div>
                <div className="flex-1 min-w-0"><p className="font-semibold" style={{ color: '#E8EAF0' }}>{interview.candidate_name}</p><p className="text-sm" style={{ color: '#8B91A5' }}>{interview.candidate_role}</p></div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: '#E8EAF0' }}>{formatInterviewDate(interview.scheduled_at)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${typeStyle(interview.interview_type)}`}>{interview.interview_type}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {interview.interview_type === 'Video Call' && <button className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition"><Video className="w-4 h-4" /></button>}
                  <button className="p-2 rounded-lg transition" style={{ background: '#2E3340', color: '#8B91A5' }}><Calendar className="w-4 h-4" /></button>
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
  "How do I evaluate a candidate's cultural fit?",
  "Help me write a kind rejection email",
  'Competitive salary range for a data scientist in Nairobi?',
  'How do I reduce time-to-hire?',
];

const AiCoachTab = ({ employerId: _employerId }: { employerId: string }) => {
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
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: `You are an expert AI Hiring Coach for TechHire, a tech recruitment platform based in Kenya. Be concise, practical, and actionable.`,
          messages: messages.slice(-10).map(m => ({ role: m.role, content: m.text })).concat([{ role: 'user', content: msg }]),
        }),
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err?.error?.message || `API error ${response.status}`); }
      const data = await response.json();
      const reply = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || "I'm here to help!";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${error.message || "Sorry, I'm having trouble connecting."}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-96 rounded-2xl overflow-hidden" style={{ background: '#242830', border: '1px solid #2E3340' }}>
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #2E3340' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}><Bot className="w-5 h-5 text-violet-400" /></div>
        <div><p className="font-semibold" style={{ color: '#E8EAF0' }}>AI Hiring Coach</p><p className="text-xs text-violet-400">● Online · Powered by Claude</p></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg,i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5" style={{ background: 'rgba(139,92,246,0.15)' }}><Bot className="w-4 h-4 text-violet-400" /></div>}
            <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm' : 'rounded-bl-sm'}`}
              style={msg.role !== 'user' ? { background: '#1C1F26', color: '#E8EAF0' } : {}}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-2" style={{ background: 'rgba(139,92,246,0.15)' }}><Bot className="w-4 h-4 text-violet-400" /></div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2" style={{ background: '#1C1F26' }}>
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {EMPLOYER_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs px-3 py-1.5 rounded-full transition"
              style={{ background: '#1C1F26', border: '1px solid #2E3340', color: '#8B91A5' }}>{s}</button>
          ))}
        </div>
      )}
      <div className="p-4 flex items-center gap-3" style={{ borderTop: '1px solid #2E3340' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask your hiring coach anything..." className="flex-1 rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 outline-none transition"
          style={{ background: '#1C1F26', border: '1px solid #2E3340', color: '#E8EAF0' }} />
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

  const handleCandidateStatusChange = (id: string, newStatus: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault(); setPosting(true); setPostError(null);
    try {
      const [salaryMin, salaryMax] = jobSalary.replace(/\$/g,'').split(/[-–]/).map(s => parseInt(s.replace(/k/i,''))*1000);
      await axios.post(`${API}/employer/jobs`, { employer_id: employerId, title: jobTitle, description: editorContent, location: jobLocation, type: jobType, salary_min: salaryMin||null, salary_max: salaryMax||null, experience_level: jobLevel, category: jobCategory });
      const [jobsRes, statsRes] = await Promise.all([axios.get(`${API}/employer/jobs?employer_id=${employerId}`), axios.get(`${API}/employer/stats?employer_id=${employerId}`)]);
      setJobs(jobsRes.data); setStats(statsRes.data);
      setJobsRefreshKey(prev => prev+1);
      setShowPostForm(false);
      setJobTitle(''); setJobLocation(''); setJobSalary(''); setEditorContent(''); setJobCategory('Engineering & Tech');
      setActiveTab('jobs');
    } catch { setPostError('Failed to post job. Please try again.'); } finally { setPosting(false); }
  };

  const handleStartMessage = (_candidate: Candidate) => { setActiveTab('messages'); };
  const totalPipeline = pipeline.reduce((s,p) => s+p.count, 0);

  const STATS_CONFIG = [
    { label: 'Jobs Posted',      value: stats?.jobs_posted,      delta: 'Total posted',     icon: Briefcase,   accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)'  },
    { label: 'Total Applicants', value: stats?.total_applicants, delta: 'Across all jobs',  icon: Users,       accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)'  },
    { label: 'Jobs Closed',      value: stats?.jobs_closed,      delta: 'Filled positions', icon: CheckCircle, accent: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: 'Hire Success',     value: stats?.hire_success,     delta: 'Offer acceptance', icon: TrendingUp,  accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'candidates': return <CandidatesTab employerId={employerId} candidates={candidates} onStartMessage={handleStartMessage} onStatusChange={handleCandidateStatusChange} />;
      case 'jobs':       return <JobsTab employerId={employerId} onPostJob={() => setShowPostForm(true)} refreshKey={jobsRefreshKey} />;
      case 'messages':   return <MessagesTab employerId={employerId} />;
      case 'interviews': return <InterviewsTab employerId={employerId} />;
      case 'ai':         return <AiCoachTab employerId={employerId} />;
      default:           return null;
    }
  };

  // Inline styles for the root bg
  const rootStyle = { background: '#1C1F26', minHeight: '100vh', color: '#E8EAF0' };
  const sidebarStyle = { background: '#181B21', borderRight: '1px solid #2E3340' };
  const headerStyle = { background: 'rgba(24,27,33,0.85)', borderBottom: '1px solid #2E3340', backdropFilter: 'blur(12px)' };

  return (
    <div className="flex min-h-screen" style={rootStyle}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 py-6 px-3 shrink-0 sticky top-0 h-screen" style={sidebarStyle}>
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#E8EAF0' }}>TechHire Co.</p>
              <p className="text-xs" style={{ color: '#8B91A5' }}>Employer</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={activeTab === tab
                ? { background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderLeft: '2px solid #8b5cf6' }
                : { color: '#8B91A5', borderLeft: '2px solid transparent' }}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>
        <div className="px-3 mt-4">
          <button onClick={() => setShowPostForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
            style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.25)' }}>
            <Plus className="w-4 h-4" /> Post a Job
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30" style={headerStyle}>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold capitalize" style={{ color: '#E8EAF0' }}>
              {activeTab === 'ai' ? 'AI Hiring Coach' : activeTab}
            </h1>
            <span className="hidden md:block text-xs" style={{ color: '#8B91A5' }}>/ Employer Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: '#242830', border: '1px solid #2E3340' }}>
              <Search className="w-3.5 h-3.5" style={{ color: '#8B91A5' }} />
              <input type="text" placeholder="Search candidates, jobs..." className="bg-transparent text-sm placeholder-slate-500 outline-none w-40 lg:w-48" style={{ color: '#E8EAF0' }} />
            </div>
            <button onClick={() => setShowCandidatesDrawer(true)} className="xl:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
              style={{ background: '#242830', border: '1px solid #2E3340', color: '#8B91A5' }}>
              <Users className="w-3.5 h-3.5" /> Candidates
            </button>
            <button className="relative p-2 rounded-lg transition" style={{ color: '#8B91A5' }}>
              <Bell className="w-4 h-4" />
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
                {/* Welcome banner */}
                <div className="relative rounded-2xl p-5 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(20,184,166,0.05) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div className="absolute top-0 right-0 w-64 h-full opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle, #8b5cf6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <p className="text-sm" style={{ color: '#8B91A5' }}>Welcome back 👋</p>
                  <h2 className="text-xl font-bold mt-0.5" style={{ color: '#E8EAF0' }}>Good morning, Employer</h2>
                  <p className="text-sm mt-1" style={{ color: '#8B91A5' }}>
                    You have <span className="text-teal-400 font-semibold">
                      {loadingStats ? '...' : `${pipeline.find(p => p.stage === 'Applied')?.count ?? 0} new applicants`}
                    </span> in your pipeline today.
                  </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {STATS_CONFIG.map(({ label, value, delta, icon: Icon, accent, bg, border }) => (
                    <div key={label} className="rounded-2xl p-4 md:p-5 transition-all hover:scale-[1.02]" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
                          <Icon className="w-4 h-4" style={{ color: accent }} />
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5" style={{ color: accent, opacity: 0.5 }} />
                      </div>
                      {loadingStats ? <Skeleton className="h-8 w-16 mb-1" /> : <p className="text-xl md:text-2xl font-bold" style={{ color: '#E8EAF0' }}>{value ?? '—'}</p>}
                      <p className="text-xs mt-0.5" style={{ color: '#8B91A5' }}>{label}</p>
                      <p className="text-xs mt-1 font-medium" style={{ color: accent }}>{delta}</p>
                    </div>
                  ))}
                </div>

                {/* Pipeline */}
                <div className="rounded-2xl p-5" style={{ background: '#242830', border: '1px solid #2E3340' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold" style={{ color: '#E8EAF0' }}>Hiring Pipeline</h2>
                      <p className="text-xs mt-0.5" style={{ color: '#8B91A5' }}>{totalPipeline} candidates across all stages</p>
                    </div>
                    <button onClick={() => setActiveTab('candidates')}
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 px-3 py-1.5 rounded-lg transition"
                      style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
                      Kanban View <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {loadingPipeline ? <Skeleton className="h-2.5 w-full mb-4" /> : (
                    <>
                      <div className="flex h-2.5 rounded-full overflow-hidden mb-5 gap-0.5">
                        {pipeline.map(({ stage, count }) => {
                          const pc = PIPELINE_COLORS[stage.charAt(0)+stage.slice(1).toLowerCase()] ?? PIPELINE_COLORS['Applied'];
                          return <div key={stage} className={pc.bar} style={{ width: totalPipeline ? `${(count/totalPipeline)*100}%` : '0%', transition: 'width 0.5s ease' }} title={`${stage}: ${count}`} />;
                        })}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {pipeline.map(({ stage, count }) => {
                          const accent = PIPELINE_COLORS[stage.charAt(0)+stage.slice(1).toLowerCase()]?.accent ?? '#64748b';
                          return (
                            <div key={stage} className="text-center rounded-xl py-3" style={{ background: '#1C1F26', border: '1px solid #2E3340' }}>
                              <p className="text-xl font-bold" style={{ color: accent }}>{count}</p>
                              <p className="text-xs mt-1 hidden sm:block" style={{ color: '#8B91A5' }}>{stage}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Charts */}
                {!loadingCandidates && candidates.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <TopCandidateSkills candidates={candidates} />
                    <DiversityMetrics candidates={candidates} />
                  </div>
                )}
                {!loadingJobs && jobs.length > 0 && <JobPostPerformance jobs={jobs} />}

                {/* Recent Jobs */}
                <div className="rounded-2xl p-5" style={{ background: '#242830', border: '1px solid #2E3340' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold" style={{ color: '#E8EAF0' }}>Recent Job Posts</h2>
                    <button onClick={() => setActiveTab('jobs')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  {loadingJobs ? <>{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-16 mb-2" />)}</> :
                    jobs.length === 0
                      ? <div className="text-center py-10"><Briefcase className="w-8 h-8 mx-auto mb-2" style={{ color: '#3A3F4E' }} /><p className="text-sm mb-3" style={{ color: '#8B91A5' }}>No jobs posted yet</p><button onClick={() => setShowPostForm(true)} className="text-xs text-violet-400 hover:text-violet-300">Post your first job →</button></div>
                      : <div className="space-y-2">
                          {jobs.slice(0,5).map(job => (
                            <div key={job.id} onClick={() => setActiveTab('jobs')}
                              className="flex items-center gap-3 md:gap-4 rounded-xl p-3 md:p-4 transition cursor-pointer hover:bg-white/[0.02]"
                              style={{ background: '#1C1F26', border: '1px solid #2E3340' }}>
                              <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                <Briefcase className="w-4 h-4 text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: '#E8EAF0' }}>{job.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs" style={{ color: '#8B91A5' }}>
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                                  <span className="hidden sm:flex items-center gap-1"><Clock className="w-3 h-3" />{job.days_ago}d ago</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right"><p className="text-sm font-bold" style={{ color: '#E8EAF0' }}>{job.applicants}</p><p className="text-xs hidden sm:block" style={{ color: '#8B91A5' }}>applicants</p></div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${job.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : ''}`}
                                  style={!job.active ? { background: '#2E3340', color: '#8B91A5' } : {}}>
                                  {job.active ? '● Active' : 'Closed'}
                                </span>
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
          <aside className="hidden xl:flex flex-col w-80 shrink-0 sticky top-0 h-screen overflow-hidden" style={{ background: '#1E2128', borderLeft: '1px solid #2E3340' }}>
            <div className="p-5" style={{ borderBottom: '1px solid #2E3340' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold" style={{ color: '#E8EAF0' }}>Top Candidates</h2>
                <span className="flex items-center gap-1 text-xs text-amber-400 px-2 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Zap className="w-3 h-3" /> AI Ranked
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: '#242830', border: '1px solid #2E3340' }}>
                <Search className="w-3.5 h-3.5" style={{ color: '#8B91A5' }} />
                <input type="text" placeholder="Filter candidates..." className="bg-transparent text-xs placeholder-slate-500 outline-none flex-1" style={{ color: '#E8EAF0' }} />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CandidateList candidates={candidates} loading={loadingCandidates} error={errorCandidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} />
            </div>
            <div className="p-4" style={{ borderTop: '1px solid #2E3340' }}>
              <button onClick={() => setActiveTab('candidates')}
                className="w-full text-sm rounded-xl py-2.5 transition"
                style={{ border: '1px solid #2E3340', color: '#8B91A5' }}>
                View All Candidates
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom Tab Bar (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2" style={{ background: '#181B21', borderTop: '1px solid #2E3340' }}>
        {NAV_ITEMS.map(({ icon: Icon, label, tab }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
            style={{ color: activeTab === tab ? '#a78bfa' : '#8B91A5' }}>
            <div className="p-1.5 rounded-lg transition-all" style={activeTab === tab ? { background: 'rgba(139,92,246,0.15)' } : {}}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
        <button onClick={() => setShowPostForm(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
          <div className="bg-violet-600 p-2 rounded-xl" style={{ boxShadow: '0 4px 15px rgba(139,92,246,0.35)' }}>
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-medium" style={{ color: '#8B91A5' }}>Post</span>
        </button>
      </nav>

      {/* Candidates Drawer (mobile) */}
      {showCandidatesDrawer && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowCandidatesDrawer(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] flex flex-col" style={{ background: '#1C1F26', borderLeft: '1px solid #2E3340' }} onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2E3340' }}>
              <h2 className="font-bold" style={{ color: '#E8EAF0' }}>Top Candidates</h2>
              <button onClick={() => setShowCandidatesDrawer(false)} className="p-1.5 rounded-lg transition" style={{ color: '#8B91A5' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CandidateList candidates={candidates} loading={loadingCandidates} error={errorCandidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} />
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowPostForm(false)}>
          <div className="rounded-t-2xl sm:rounded-2xl p-5 md:p-6 w-full sm:max-w-2xl space-y-4 max-h-[92vh] overflow-auto" style={{ background: '#1C1F26', border: '1px solid #2E3340' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#E8EAF0' }}>Create Job Posting</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8B91A5' }}>Fill in the details to attract top candidates</p>
              </div>
              <button onClick={() => setShowPostForm(false)} className="p-1.5 rounded-lg transition" style={{ color: '#8B91A5' }}><X className="w-5 h-5" /></button>
            </div>
            {postError && <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}><AlertCircle className="w-4 h-4 shrink-0" /> {postError}</div>}
            <form onSubmit={handlePostJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Job Title *</label>
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required placeholder="e.g. Senior React Developer"
                    className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Location</label>
                  <select value={jobLocation} onChange={e => setJobLocation(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }}>
                    <option value="">Select location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Job Type</label>
                  <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }}>
                    <option>Full Time</option><option>Part Time</option><option>Contract</option><option>Remote</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Category</label>
                  <select value={jobCategory} onChange={e => setJobCategory(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Experience Level</label>
                  <select value={jobLevel} onChange={e => setJobLevel(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }}>
                    <option>Entry Level</option><option>Mid Level</option><option>Senior</option><option>Lead / Manager</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Salary Range (KES)</label>
                  <input type="text" value={jobSalary} onChange={e => setJobSalary(e.target.value)} placeholder="e.g. 80k – 120k"
                    className="w-full rounded-xl px-4 py-3 outline-none transition" style={{ background: '#242830', border: '1px solid #2E3340', color: '#E8EAF0' }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#8B91A5' }}>Job Description</label>
                  <QuillEditor value={editorContent} onChange={setEditorContent} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPostForm(false)}
                  className="flex-1 py-3 rounded-xl transition text-sm font-medium"
                  style={{ border: '1px solid #2E3340', color: '#8B91A5' }}>Cancel</button>
                <button type="submit" disabled={posting}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white py-3 rounded-xl transition text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.25)' }}>
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