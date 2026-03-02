import React from 'react';
import { X, MapPin, DollarSign, Briefcase, Calendar, CheckCircle2 } from 'lucide-react';

interface JobDetailModalProps {
    job: any;
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
    applying: boolean;
    applied: boolean;
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onApply, applying, applied }) => {
    if (!isOpen || !job) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-ui-card border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold font-accent text-white">{job.title}</h2>
                        <p className="text-accent-teal font-medium">{job.company}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-center">
                            <Briefcase className="mx-auto mb-2 text-slate-400" size={18} />
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Type</p>
                            <p className="text-sm text-slate-200">{job.type}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-center">
                            <MapPin className="mx-auto mb-2 text-slate-400" size={18} />
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Location</p>
                            <p className="text-sm text-slate-200">{job.location}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-center">
                            <DollarSign className="mx-auto mb-2 text-slate-400" size={18} />
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Salary</p>
                            <p className="text-sm text-slate-200">{job.salary}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-center">
                            <Calendar className="mx-auto mb-2 text-slate-400" size={18} />
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Posted</p>
                            <p className="text-sm text-slate-200">2 days ago</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3">About the Role</h3>
                        <div
                            className="text-slate-300 space-y-4 leading-relaxed job-description-rich"
                            dangerouslySetInnerHTML={{ __html: job.description || '<p>Detailed description is coming soon...</p>' }}
                        />
                    </div>

                    {/* AI Insights (Mock) */}
                    <div className="bg-primary-violet/10 border border-primary-violet/30 rounded-xl p-6">
                        <h4 className="flex items-center gap-2 text-primary-violet font-bold mb-2">
                            <CheckCircle2 size={18} /> TechHire Match Analysis
                        </h4>
                        <p className="text-slate-300 text-sm">
                            Your profile matches <span className="text-accent-teal font-bold">{job.match}%</span> of this role's requirements.
                            Key matches: React, TypeScript, and 3+ years of frontend experience.
                        </p>
                    </div>
                </div>

                {/* Footer / Application Area */}
                <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="text-slate-400 text-sm italic">
                        {applied ? "You have already applied for this position." : "Applications close in 5 days."}
                    </div>
                    <button
                        onClick={onApply}
                        disabled={applied || applying}
                        className={`w-full md:w-auto px-12 py-3 rounded-xl font-bold transition-all shadow-lg ${applied
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 cursor-default"
                            : "bg-primary-violet hover:bg-violet-700 text-white hover:scale-105 active:scale-95 disabled:opacity-50"
                            }`}
                    >
                        {applying ? "Submitting..." : applied ? "✓ Applied" : "Submit Application"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobDetailModal;
