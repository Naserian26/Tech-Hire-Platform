import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useUiStore } from './store/ui.store';
import LandingPage from './pages/LandingPage';
import UnifiedAuthPage from './pages/auth/UnifiedAuthPage';
import SeekerDashboard from './pages/seeker/SeekerDashboard';
import SeekerProfile from './pages/seeker/SeekerProfile';
import BrowseJobs from './pages/seeker/BrowseJobs';
import EmployerDashboard from './pages/employer/EmployerDashboard';
import EmployerProfile from './pages/employer/EmployerProfile';
import NotificationPreferences from './pages/shared/NotificationPreferences';
import PrivacySecurity from './pages/shared/PrivacySecurity';
import NotificationBell from './components/notifications/NotificationBell';
import { useWebSocket } from './hooks/useWebSocket';
import { Settings, LogOut, Sun, Moon, User, Shield, Bell, ChevronDown } from 'lucide-react';

const SettingsDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { theme, setTheme } = useUiStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goToProfile = () => {
    navigate(user?.role === 'seeker' ? '/seeker/profile' : '/employer/profile');
    setOpen(false);
  };

  const goToNotifications = () => {
    navigate(user?.role === 'seeker' ? '/seeker/notifications' : '/employer/notifications');
    setOpen(false);
  };

  const goToPrivacy = () => {
    navigate(user?.role === 'seeker' ? '/seeker/privacy' : '/employer/privacy');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">

          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-violet/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-violet" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.email}</p>
                <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="px-2 py-2 border-b border-slate-800">
            <p className="text-xs text-slate-500 px-2 py-1 uppercase tracking-wider">Appearance</p>
            <div className="flex gap-1 p-1">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition ${
                  theme === 'dark' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition ${
                  theme === 'light' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
            </div>
          </div>

          {/* Menu items */}
          <div className="px-2 py-2 border-b border-slate-800">
            <p className="text-xs text-slate-500 px-2 py-1 uppercase tracking-wider">Account</p>
            <button
              onClick={goToProfile}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <User className="w-4 h-4" /> My Profile
            </button>
            <button
              onClick={goToNotifications}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Bell className="w-4 h-4" /> Notification Preferences
            </button>
            <button
              onClick={goToPrivacy}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <Shield className="w-4 h-4" /> Privacy & Security
            </button>
          </div>

          {/* Sign out */}
          <div className="px-2 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  useWebSocket();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center">
        <div
          className="text-xl font-bold text-white cursor-pointer hover:opacity-80 transition"
          onClick={() => navigate(user?.role === 'seeker' ? '/seeker' : '/employer')}
        >
          TechHire <span className="text-primary-violet">TH</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <SettingsDropdown />
        </div>
      </header>
      {children}
    </div>
  );
};

const App = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<UnifiedAuthPage />} />
        <Route path="/auth/seeker" element={<Navigate to="/auth" replace />} />
        <Route path="/auth/employer" element={<Navigate to="/auth" replace />} />

        {/* Seeker Routes */}
        <Route path="/seeker" element={
          user?.role === 'seeker' ? <Layout><SeekerDashboard /></Layout> : <Navigate to="/" />
        } />
        <Route path="/seeker/jobs" element={
          user?.role === 'seeker' ? <Layout><BrowseJobs /></Layout> : <Navigate to="/" />
        } />
        <Route path="/seeker/profile" element={
          user?.role === 'seeker' ? <Layout><SeekerProfile /></Layout> : <Navigate to="/" />
        } />
        <Route path="/seeker/notifications" element={
          user?.role === 'seeker' ? <Layout><NotificationPreferences /></Layout> : <Navigate to="/" />
        } />
        <Route path="/seeker/privacy" element={
          user?.role === 'seeker' ? <Layout><PrivacySecurity /></Layout> : <Navigate to="/" />
        } />

        {/* Employer Routes */}
        <Route path="/employer" element={
          user?.role === 'employer' ? <Layout><EmployerDashboard /></Layout> : <Navigate to="/" />
        } />
        <Route path="/employer/profile" element={
          user?.role === 'employer' ? <Layout><EmployerProfile /></Layout> : <Navigate to="/" />
        } />
        <Route path="/employer/notifications" element={
          user?.role === 'employer' ? <Layout><NotificationPreferences /></Layout> : <Navigate to="/" />
        } />
        <Route path="/employer/privacy" element={
          user?.role === 'employer' ? <Layout><PrivacySecurity /></Layout> : <Navigate to="/" />
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;