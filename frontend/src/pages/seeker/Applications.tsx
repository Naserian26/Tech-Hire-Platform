import React from 'react';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

const Applications = () => {
  const apps = [
    { id: 1, company: "TechFlow", role: "Senior Frontend", stage: "INTERVIEW", date: "2 days ago" },
    { id: 2, company: "DataSystems", role: "Backend Dev", stage: "APPLIED", date: "1 week ago" },
    { id: 3, company: "OldCorp", role: "Junior Dev", stage: "REJECTED", date: "2 weeks ago" },
  ];

  const getStageIcon = (stage: string) => {
    switch(stage) {
      case 'INTERVIEW': return <CheckCircle className="text-accent-teal" />;
      case 'APPLIED': return <Clock className="text-yellow-500" />;
      case 'REJECTED': return <XCircle className="text-rose-500" />;
      default: return <FileText className="text-slate-400" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-ui-bg text-white">
      <h1 className="text-3xl font-bold mb-6">My Applications</h1>
      
      <div className="bg-ui-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-slate-400 text-sm uppercase">
            <tr>
              <th className="p-4">Company</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Applied</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {apps.map((app) => (
              <tr key={app.id} className="hover:bg-slate-800/50 transition">
                <td className="p-4 font-bold text-white">{app.company}</td>
                <td className="p-4 text-slate-300">{app.role}</td>
                <td className="p-4">
                  <span className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold w-fit ${
                    app.stage === 'INTERVIEW' ? 'bg-teal-500/20 text-teal-400' :
                    app.stage === 'APPLIED' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {getStageIcon(app.stage)} {app.stage}
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">{app.date}</td>
                <td className="p-4 text-right">
                  <button className="text-primary-violet hover:text-white text-sm font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Applications;