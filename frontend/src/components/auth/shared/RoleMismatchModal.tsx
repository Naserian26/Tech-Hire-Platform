import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

interface RoleMismatchModalProps {
  isOpen: boolean;
  actualRole: 'seeker' | 'employer';
  onClose: () => void;
  onSwitch: () => void;
}

const RoleMismatchModal: React.FC<RoleMismatchModalProps> = ({ isOpen, actualRole, onClose, onSwitch }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-ui-card border border-rose-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
            <AlertTriangle className="text-rose-500 w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Wrong Portal Detected</h2>
          <p className="text-slate-300 mb-6">
            It looks like this account is registered as a <strong className="text-accent-teal capitalize">{actualRole}</strong>, but you are trying to log in as a <strong className="text-slate-200">{actualRole === 'seeker' ? 'Employer' : 'Job Seeker'}</strong>.
          </p>
          
          <div className="w-full space-y-3">
            <button 
              onClick={onSwitch}
              className="w-full bg-primary-violet hover:bg-violet-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              Go to {actualRole === 'seeker' ? 'Seeker' : 'Employer'} Portal <ArrowRight size={18} />
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg transition"
            >
              Cancel & Try Different Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleMismatchModal;