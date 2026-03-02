import React, { useEffect, useState } from 'react';
import { MapPin, DollarSign, Briefcase, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import JobDetailModal from '../../components/jobs/JobDetailModal';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  match: number;
  description?: string;
}

const BrowseJobs = () => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]); // Track applied job IDs in session

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/jobs');
        setJobs(response.data);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleViewDetails = async (job: Job) => {
    setSelectedJob(job);
    setIsModalOpen(true);

    // Fetch full description if not already present
    if (!job.description) {
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/jobs/${job.id}`);
        setSelectedJob({ ...job, description: response.data.description });
      } catch (err) {
        console.error("Error fetching job details:", err);
      }
    }
  };

  const handleApply = async () => {
    if (!selectedJob || !user) return;

    setApplying(true);
    try {
      await axios.post(`http://localhost:8000/api/v1/jobs/${selectedJob.id}/apply?seeker_id=${user.id}`);
      setAppliedJobs(prev => [...prev, selectedJob.id]);
    } catch (err) {
      console.error("Error applying for job:", err);
      alert("Failed to submit application. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-ui-bg text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Browse Jobs</h1>
        <div className="flex gap-4">
          <input type="text" placeholder="Search jobs..." className="bg-ui-card border border-slate-700 rounded-lg px-4 py-2 w-full md:w-1/2 focus:border-accent-teal outline-none" />
          <select className="bg-ui-card border border-slate-700 rounded-lg px-4 py-2 text-slate-300">
            <option>Remote</option>
            <option>On-site</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-accent-teal mb-4" size={48} />
          <p className="text-slate-400">Finding the best matches for you...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
          >
            Retry
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">No jobs found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-ui-card border border-slate-700 p-6 rounded-xl hover:border-accent-teal/50 transition group relative overflow-hidden">
              {/* Match Score Background */}
              <div className="absolute top-0 right-0 bg-accent-teal text-slate-900 text-xs font-bold px-2 py-1 rounded-bl-lg">
                {job.match}% Match
              </div>

              <h3 className="text-xl font-bold mb-1 group-hover:text-accent-teal transition">{job.title}</h3>
              <p className="text-slate-400 font-medium mb-4">{job.company}</p>

              <div className="space-y-2 text-sm text-slate-300 mb-6">
                <div className="flex items-center gap-2">
                  <Briefcase size={14} /> {job.type}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} /> {job.location}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} /> {job.salary}
                </div>
              </div>

              <button
                onClick={() => handleViewDetails(job)}
                className="w-full bg-slate-800 hover:bg-accent-teal hover:text-slate-900 border border-slate-600 hover:border-accent-teal py-2 rounded-lg transition font-medium"
              >
                {appliedJobs.includes(job.id) ? "Applied" : "View Details"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApply={handleApply}
        applying={applying}
        applied={selectedJob ? appliedJobs.includes(selectedJob.id) : false}
      />
    </div>
  );
};

export default BrowseJobs;
