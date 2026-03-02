import React, { useEffect, useState } from 'react';
import { MoreVertical, Mail, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: string;
  match: number;
  email?: string;
}

const Candidates = () => {
  const user = useAuthStore((state) => state.user);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await axios.get(`${API}/employer/candidates`, {
          params: { employer_id: user?.id }
        });
        setCandidates(res.data);
      } catch {
        // Fallback to dummy data if API not available
        setCandidates([
          { id: '1', name: 'Alice Johnson', role: 'Frontend Dev', stage: 'Interview', match: 98 },
          { id: '2', name: 'Bob Smith', role: 'Full Stack', stage: 'Screening', match: 92 },
          { id: '3', name: 'Charlie Davis', role: 'Backend Dev', stage: 'Applied', match: 85 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [user?.id]);

  const handleMessage = async (candidate: Candidate) => {
    setMessagingId(candidate.id);
    try {
      await axios.post(`${API}/employer/conversations/start`, {
        employer_id: user?.id,
        candidate_id: candidate.id,
        initial_message: `Hi ${candidate.name}, I came across your profile and I'm interested in discussing an opportunity with you.`
      });
      setSuccessId(candidate.id);
      setTimeout(() => setSuccessId(null), 3000);
    } catch {
      setError(`Failed to start conversation with ${candidate.name}`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setMessagingId(null);
    }
  };

  const handleStageChange = async (candidateId: string, stage: string) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage } : c));
    try {
      await axios.patch(`${API}/employer/candidates/${candidateId}/stage`, { stage });
    } catch {
      // silently fail, UI already updated
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <Loader2 className="w-8 h-8 text-primary-violet animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-ui-bg text-white">
      <h1 className="text-3xl font-bold mb-2">Candidate Pipeline</h1>
      <p className="text-slate-400 text-sm mb-6">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found</p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {candidates.map((c) => (
          <div key={c.id} className="bg-ui-card border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 hover:border-primary-violet/50 transition">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg">{c.name}</h3>
                <p className="text-slate-400 text-sm">{c.role} • Match: <span className="text-accent-teal">{c.match}%</span></p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <select
                value={c.stage}
                onChange={(e) => handleStageChange(c.id, e.target.value)}
                className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1 outline-none focus:border-primary-violet"
              >
                <option>Applied</option>
                <option>Screening</option>
                <option>Interview</option>
                <option>Offer</option>
              </select>

              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition" title="Email">
                  <Mail size={18} />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition" title="Schedule Interview">
                  <Calendar size={18} />
                </button>
                <button
                  onClick={() => handleMessage(c)}
                  disabled={messagingId === c.id}
                  title="Send Message"
                  className={`p-2 rounded transition flex items-center justify-center ${
                    successId === c.id
                      ? 'bg-green-500/20 text-green-400'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-accent-teal'
                  }`}
                >
                  {messagingId === c.id
                    ? <Loader2 size={18} className="animate-spin" />
                    : successId === c.id
                    ? <span className="text-xs px-1">✓ Sent</span>
                    : <MessageSquare size={18} />
                  }
                </button>
                <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {candidates.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p>No candidates yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Candidates;