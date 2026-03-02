import React, { useState } from 'react';
import { Bell, Mail, Smartphone, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? 'bg-accent-teal' : 'bg-slate-700'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const NotificationPreferences = () => {
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState({
    emailJobAlerts: true,
    emailApplicationUpdates: true,
    emailMessages: false,
    emailInterviews: true,
    pushJobAlerts: true,
    pushApplicationUpdates: true,
    pushMessages: true,
    pushInterviews: true,
    smsInterviews: false,
    smsApplicationUpdates: false,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-accent-teal/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent-teal" />
        </div>
        <h2 className="text-white font-semibold text-base">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Row = ({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
      </div>
      <Toggle enabled={enabled} onChange={onToggle} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">Notification Preferences</h1>
          <p className="text-slate-400 text-sm">Control how and when we contact you</p>
        </div>
      </div>

      <Section icon={Mail} title="Email Notifications">
        <Row label="Job Alerts" desc="New jobs matching your profile" enabled={prefs.emailJobAlerts} onToggle={() => toggle('emailJobAlerts')} />
        <div className="border-t border-slate-800" />
        <Row label="Application Updates" desc="Status changes on your applications" enabled={prefs.emailApplicationUpdates} onToggle={() => toggle('emailApplicationUpdates')} />
        <div className="border-t border-slate-800" />
        <Row label="Messages" desc="New messages from employers" enabled={prefs.emailMessages} onToggle={() => toggle('emailMessages')} />
        <div className="border-t border-slate-800" />
        <Row label="Interview Reminders" desc="Upcoming interview notifications" enabled={prefs.emailInterviews} onToggle={() => toggle('emailInterviews')} />
      </Section>

      <Section icon={Bell} title="Push Notifications">
        <Row label="Job Alerts" desc="Instant alerts for new job matches" enabled={prefs.pushJobAlerts} onToggle={() => toggle('pushJobAlerts')} />
        <div className="border-t border-slate-800" />
        <Row label="Application Updates" desc="Real-time application status" enabled={prefs.pushApplicationUpdates} onToggle={() => toggle('pushApplicationUpdates')} />
        <div className="border-t border-slate-800" />
        <Row label="Messages" desc="Instant message notifications" enabled={prefs.pushMessages} onToggle={() => toggle('pushMessages')} />
        <div className="border-t border-slate-800" />
        <Row label="Interview Reminders" desc="Push reminders before interviews" enabled={prefs.pushInterviews} onToggle={() => toggle('pushInterviews')} />
      </Section>

      <Section icon={Smartphone} title="SMS Notifications">
        <Row label="Interview Reminders" desc="Text reminders for upcoming interviews" enabled={prefs.smsInterviews} onToggle={() => toggle('smsInterviews')} />
        <div className="border-t border-slate-800" />
        <Row label="Application Updates" desc="Critical application status via SMS" enabled={prefs.smsApplicationUpdates} onToggle={() => toggle('smsApplicationUpdates')} />
      </Section>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
          saved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-accent-teal text-slate-900 hover:opacity-90'
        }`}
      >
        {saved ? '✓ Preferences Saved' : 'Save Preferences'}
      </button>
    </div>
  );
};

export default NotificationPreferences;