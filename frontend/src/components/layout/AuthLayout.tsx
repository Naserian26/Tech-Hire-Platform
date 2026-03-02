import React from 'react';
import { cn } from '../../utils/cn'; // Assuming you have the utility, else use clsx

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#4c1d95 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      <div className="z-10 w-full max-w-6xl bg-ui-card rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-700">
        {/* Left: Form Area */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          {children}
        </div>
        
        {/* Right: Visual/Branding */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-primary-violet to-primary-dark items-center justify-center p-12 relative">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="z-10 text-center text-white">
            <h1 className="text-5xl font-bold mb-4 tracking-tighter">TechHire</h1>
            <p className="text-xl text-slate-300">AI-Powered Career Intelligence</p>
            <div className="mt-8 flex justify-center gap-2">
               <div className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{animationDelay: '0s'}}></div>
               <div className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{animationDelay: '0.2s'}}></div>
               <div className="w-2 h-2 rounded-full bg-accent-teal animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;