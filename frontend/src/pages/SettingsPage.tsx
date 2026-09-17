import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Globe,
  Bell,
  User,
  Shield,
  CheckCircle2,
  LogOut,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'system'>('dark');
  const [language, setLanguage] = useState(
    profile?.preferred_language || localStorage.getItem('nexora_preferred_language') || 'en'
  );
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (profile?.preferred_language) {
      setLanguage(profile.preferred_language);
    }
  }, [profile?.preferred_language]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    localStorage.setItem(
      'nexora_student_settings',
      JSON.stringify({
        theme,
        language,
        emailNotifications,
        studyReminders,
      })
    );
    if (updateProfile) {
      await updateProfile({ preferred_language: language });
    }
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Settings &amp; Preferences
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Customize your learning environment, notifications, and student account.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Appearance */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="w-4 h-4 text-nexora-primary" />
              Interface Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred visual theme for reading and lessons.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'dark'
                    ? 'bg-nexora-primary/15 border-nexora-primary text-white shadow-glow/30'
                    : 'bg-nexora-surface border-nexora-border text-nexora-muted hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold">Dark Theme</h4>
                  <p className="text-[10px] text-nexora-muted">Calm, low-glare reading</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  theme === 'system'
                    ? 'bg-nexora-primary/15 border-nexora-primary text-white shadow-glow/30'
                    : 'bg-nexora-surface border-nexora-border text-nexora-muted hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold">System Default</h4>
                  <p className="text-[10px] text-nexora-muted">Matches operating system</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Language & Locale */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-nexora-accent" />
              Language &amp; Explanations
            </CardTitle>
            <CardDescription>
              Select your preferred language for concept explanations and interface text.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="max-w-md">
              <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                Primary Learning Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-nexora-primary"
              >
                <option value="en">English (Standard)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 3. Learning Notifications */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notifications &amp; Reminders
            </CardTitle>
            <CardDescription>
              Control email updates for curriculum milestones and study reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <label className="flex items-center justify-between p-3 rounded-xl bg-nexora-bg border border-nexora-border/70 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Course Progress &amp; Milestone Alerts
                </span>
                <span className="text-[11px] text-nexora-muted">
                  Receive notifications when you complete modules or lessons
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-nexora-bg border border-nexora-border/70 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Daily Study Reminders
                </span>
                <span className="text-[11px] text-nexora-muted">
                  A gentle daily reminder to continue your active courses
                </span>
              </div>
              <input
                type="checkbox"
                checked={studyReminders}
                onChange={(e) => setStudyReminders(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>
          </CardContent>
        </Card>

        {/* 4. Student Account & Security Quick Link */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              Student Account &amp; Security
            </CardTitle>
            <CardDescription>
              Manage your credentials, linked Google account, and password settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-white font-medium block">
                {user?.email || 'student@nexora.dev'}
              </span>
              <span className="text-[11px] text-nexora-muted">
                Student Profile, Academic Preferences &amp; Authentication Methods
              </span>
            </div>
            <div className="flex gap-2.5">
              <Link to="/profile">
                <Button variant="outline" size="sm" leftIcon={<Shield className="w-3.5 h-3.5" />}>
                  Manage Security &amp; Password
                </Button>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-rose-400 hover:bg-rose-500/10"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />}>
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
