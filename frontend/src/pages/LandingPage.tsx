import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ui-bg text-white flex flex-col">
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-violet to-accent-teal">
          TechHire
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-slate-300 hover:text-white transition-colors text-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="bg-primary-violet hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            Find your dream job<br />with <span className="text-accent-teal">AI</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-xl mx-auto">
            The first platform that matches candidates based on vector similarity, not just keywords.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="bg-accent-teal hover:opacity-90 text-slate-900 font-bold px-10 py-3 rounded-xl text-lg transition"
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-10 py-3 rounded-xl text-lg transition"
          >
            Sign In
          </button>
        </div>

        <p className="text-slate-500 text-sm">
          No credit card required · Works for job seekers & employers
        </p>
      </main>
    </div>
  );
};

export default LandingPage;