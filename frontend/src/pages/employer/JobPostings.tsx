import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import QuillEditor from '../../components/editor/QuillEditor';

const JobPostings = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [content, setContent] = useState('');

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-ui-bg text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Postings</h1>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-primary-violet hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={18} /> {isCreating ? 'Cancel' : 'New Posting'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-ui-card border border-slate-700 p-6 rounded-xl mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold mb-4">Create Job Posting</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Job Title" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3" />
            <QuillEditor value={content} onChange={setContent} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-400 hover:text-white">Discard</button>
              <button className="bg-accent-teal text-slate-900 font-bold px-6 py-2 rounded-lg hover:bg-teal-400">Publish Job</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Existing Job Card */}
        <div className="bg-ui-card border border-slate-700 p-6 rounded-xl relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
            <button className="p-2 bg-slate-800 rounded hover:text-primary-violet"><Edit size={16} /></button>
            <button className="p-2 bg-slate-800 rounded hover:text-rose-500"><Trash2 size={16} /></button>
          </div>
          <h3 className="text-xl font-bold mb-2">Senior React Developer</h3>
          <p className="text-slate-400 text-sm mb-4">Posted 2 days ago • 12 Applicants</p>
          <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-accent-teal w-3/4"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Pipeline Strength: 75%</p>
        </div>
      </div>
    </div>
  );
};

export default JobPostings;