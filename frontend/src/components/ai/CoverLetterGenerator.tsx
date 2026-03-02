import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';

interface CoverLetterGeneratorProps {
  jobDescription: string;
  onGenerate: (letter: string) => void;
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({ jobDescription, onGenerate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState('professional');

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Mock API Call
    setTimeout(() => {
      const mockLetter = `Dear Hiring Manager,\n\nI am writing to express my strong interest in the [Role] position. With my experience in Tech, I am confident I can contribute effectively...\n\n(Based on selected tone: ${tone})`;
      onGenerate(mockLetter);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mt-4">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Wand2 className="text-accent-teal" /> AI Cover Letter Assistant
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Tone</label>
          <select 
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white outline-none focus:border-accent-teal"
          >
            <option value="professional">Professional</option>
            <option value="enthusiastic">Enthusiastic</option>
            <option value="confident">Confident</option>
          </select>
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary-violet to-accent-teal text-white font-bold py-3 rounded-lg hover:opacity-90 transition flex justify-center items-center gap-2"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
          {isGenerating ? "Writing Magic..." : "Generate Cover Letter"}
        </button>
      </div>
    </div>
  );
};

export default CoverLetterGenerator;