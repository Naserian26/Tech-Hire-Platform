import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const TAGS = ['Creative', 'Developers', 'Growth', 'Product Teams', 'Data Science', 'Business Ops', 'Sales & Partnerships', 'Support Teams'];

const LandingPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    if (search.trim()) navigate(`/auth?mode=register&q=${encodeURIComponent(search)}`);
    else navigate('/auth?mode=register');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1a1a1a] flex flex-col font-sans">

      {/* Header */}
      <header className="px-8 py-5 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-black tracking-tight text-[#1a1a1a]">
          Tech<span className="text-orange-500">Hire</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#555]">
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Explore</a>
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">For Employers</a>
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/auth')}
            className="text-[#555] hover:text-[#1a1a1a] transition-colors text-sm font-medium"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/auth?mode=register')}
            className="bg-[#1a1a1a] hover:bg-[#333] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
          >
            Join Free
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 pt-10 pb-20 grid md:grid-cols-2 gap-12 items-center">

        {/* Left: Text + Search */}
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">
              ✦ AI-Powered Matching
            </span>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tight text-[#1a1a1a]">
              Hire Great<br />People.<br />
              <span className="text-orange-500">Faster.</span> Smarter.
            </h1>
            <p className="text-[#666] text-lg leading-relaxed max-w-md">
              Find, vet, and onboard top talent in one seamless platform built for speed and scale. AI matches your job instantly with the most suitable candidates.
            </p>
          </div>

          {/* Search Bar */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1a1a1a] uppercase tracking-wider">Find Talent Here:</p>
            <div className="flex items-center bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search for any role or skill..."
                className="flex-1 px-5 py-4 text-sm text-[#1a1a1a] placeholder-[#aaa] outline-none bg-transparent"
              />
              <button
                onClick={handleSearch}
                className="m-2 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </button>
            </div>

            {/* Tag Pills */}
            <div className="space-y-1">
              <p className="text-xs text-[#aaa] font-medium">Popular Search:</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setSearch(tag); navigate(`/auth?mode=register&q=${encodeURIComponent(tag)}`); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#e0e0e0] bg-white hover:border-orange-400 hover:text-orange-500 text-[#555] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Glassmorphism Orbs */}
        <div className="relative hidden md:flex items-center justify-center">
          <div className="relative w-full h-[480px] rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fdf4ff 100%)' }}
          >
            {/* Orbs */}
            <div className="absolute w-64 h-64 rounded-full"
              style={{ top: '-40px', left: '-40px', background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0.05) 70%)', filter: 'blur(2px)' }} />
            <div className="absolute w-72 h-72 rounded-full"
              style={{ bottom: '-60px', right: '-40px', background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, rgba(20,184,166,0.04) 70%)', filter: 'blur(2px)' }} />
            <div className="absolute w-48 h-48 rounded-full"
              style={{ top: '30%', right: '10%', background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0.04) 70%)', filter: 'blur(1px)' }} />
            <div className="absolute w-40 h-40 rounded-full"
              style={{ bottom: '20%', left: '12%', background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.04) 70%)', filter: 'blur(1px)' }} />

            {/* Glass cards */}
            <div className="absolute top-8 left-8 right-8 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
            >
              <p className="text-[11px] font-bold text-[#888] uppercase tracking-widest mb-3">Top Matches Today</p>
              <div className="space-y-2.5">
                {[
                  { role: 'Senior React Developer', match: '97%', color: '#8b5cf6' },
                  { role: 'Product Designer', match: '94%', color: '#14b8a6' },
                  { role: 'Data Engineer', match: '91%', color: '#3b82f6' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1a1a1a]">{item.role}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: item.color }}>{item.match}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom glass card */}
            <div className="absolute bottom-8 left-8 right-8 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#888] uppercase tracking-widest">Active Roles Filled</p>
                  <p className="text-3xl font-black text-[#1a1a1a] mt-1">12,400+</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-[#888] uppercase tracking-widest">Avg. Time to Hire</p>
                  <p className="text-3xl font-black text-[#1a1a1a] mt-1">3 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it works strip */}
      <section className="border-t border-[#ebebeb] bg-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-black text-[#1a1a1a]">A Better Way to Build Your Team</h2>
            <p className="text-[#888] text-sm">This is how it works</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 'Step 1', title: 'Post & Match', desc: 'AI matches your job instantly with the most suitable candidates.', icon: '⚡' },
              { step: 'Step 2', title: 'Screen Effortlessly', desc: 'Auto-score resumes, assess skills, and get deeper insights in seconds.', icon: '🔍' },
              { step: 'Step 3', title: 'Hire & Onboard', desc: 'Send offers, sign documents, and onboard in one click.', icon: '🎉' },
            ].map((item, i) => (
              <div key={i} className="bg-[#FAF8F5] rounded-2xl p-8 space-y-3 border border-[#ebebeb]">
                <p className="text-xs font-bold text-[#aaa] uppercase tracking-widest">{item.step}</p>
                <div className="text-3xl">{item.icon}</div>
                <h3 className="text-xl font-black text-[#1a1a1a]">{item.title}</h3>
                <p className="text-sm text-[#777] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#1a1a1a] py-16 px-8 text-center space-y-6">
        <h2 className="text-4xl font-black text-white">Ready to hire smarter?</h2>
        <p className="text-[#999] text-sm">No credit card required · Works for job seekers & employers</p>
        <button
          onClick={() => navigate('/auth?mode=register')}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-full text-lg transition"
        >
          Get Started Free →
        </button>
      </section>
    </div>
  );
};

export default LandingPage;