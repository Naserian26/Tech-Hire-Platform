import React from 'react';
import { Briefcase, MapPin } from 'lucide-react';

const JobRecsWidget = () => {
  const jobs = [
    { id: 1, title: "Senior React Dev", company: "TechFlow", match: 95, location: "Remote" },
    { id: 2, title: "Backend Engineer", company: "DataSystems", match: 88, location: "NYC" },
  ];

  return (
    <div className="bg-ui-card border border-slate-700 p-4 rounded-xl backdrop-blur-sm">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Briefcase className="text-accent-teal" /> AI Job Matches
      </h3>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-slate-800/50 p-3 rounded-lg hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-accent-teal/30">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white">{job.title}</h4>
                <p className="text-sm text-slate-400">{job.company}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin size={12} /> {job.location}
                </div>
              </div>
              <div className="bg-accent-teal/20 text-accent-teal px-2 py-1 rounded text-xs font-bold">
                {job.match}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobRecsWidget;