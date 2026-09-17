import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  GraduationCap, 
  Heart, 
  Globe, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Sparkles, 
  ShieldCheck,
  Languages,
  LogOut,
  Mail,
  Fingerprint,
  KeyRound,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Callout } from '../components/ui/Callout';

const AVAILABLE_INTERESTS = [
  'Gaming & Game Dev',
  'Cricket & Sports Physics',
  'Formula 1 & Automotive Engineering',
  'Music Production & Acoustics',
  'Space Exploration & Astronomy',
  'Competitive Coding & Algorithms',
  'Robotics & Drones',
  'AI & Machine Learning',
  'Biotech & Medical Tech',
  'Fintech & Quantitative Trading',
  'Photography & Optics',
  'Design & Digital Art',
  'Fundamental Sciences',
];

const AVAILABLE_LEARNING_PREFERENCES = [
  {
    id: 'visual',
    name: 'Visual Learning',
    shortDesc: 'Interactive visual models, diagrams, and simulations for intuitive spatial understanding.',
  },
  {
    id: 'practical',
    name: 'Practice-Based Learning',
    shortDesc: 'Real-world engineering applications, industry case studies, and hands-on scenarios.',
  },
  {
    id: 'step_by_step',
    name: 'Step-by-Step Explanations',
    shortDesc: 'Structured mathematical derivations, incremental proofs, and guided analytical breakdowns.',
  },
];

const DEFAULT_LEARNING_PREFERENCES = ['visual', 'practical', 'step_by_step'];

const EDUCATION_LEVELS = [
  { id: 'high-school', label: 'High School (Grades 9-12)' },
  { id: 'undergrad', label: 'Undergraduate (Engineering / Science)' },
  { id: 'postgrad', label: 'Postgraduate / Research' },
  { id: 'self-learner', label: 'Self-Taught / Lifelong Learner' },
];

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

export const ProfilePage: React.FC = () => {
  const { 
    user, 
    profile: authProfile, 
    updateProfile, 
    signOut, 
    isSupabaseConnected, 
    identities, 
    primaryProvider,
    hasPasswordAuth,
    updatePassword
  } = useAuth();

  const [fullName, setFullName] = useState(authProfile?.full_name || user?.user_metadata?.full_name || '');
  const [institution, setInstitution] = useState(authProfile?.institution || '');
  const [educationLevel, setEducationLevel] = useState(authProfile?.education_level || 'undergrad');
  const [primaryLanguage, setPrimaryLanguage] = useState(
    authProfile?.preferred_language || localStorage.getItem('nexora_preferred_language') || 'en'
  );
  const [interests, setInterests] = useState<string[]>(authProfile?.interests || ['Space Exploration & Astronomy', 'Gaming & Game Dev']);
  const [customInterests, setCustomInterests] = useState<string[]>(authProfile?.custom_interests || []);
  const [newCustomInterest, setNewCustomInterest] = useState<string>('');
  const [learningPreferences, setLearningPreferences] = useState<string[]>(
    authProfile?.learning_preferences && authProfile.learning_preferences.length > 0
      ? authProfile.learning_preferences
      : DEFAULT_LEARNING_PREFERENCES
  );
  const [preferenceWarning, setPreferenceWarning] = useState<string | null>(null);
  const [enableCodeMixing, setEnableCodeMixing] = useState(authProfile?.enable_code_mixing ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Security password management state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordFormMode, setPasswordFormMode] = useState<'set' | 'change'>('set');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsPasswordUpdating(true);
    const { error } = await updatePassword(newPassword);
    setIsPasswordUpdating(false);

    if (error) {
      setPasswordError(error.message || 'Password could not be updated. Please try again.');
    } else {
      setPasswordSuccess(
        passwordFormMode === 'set'
          ? 'Password successfully configured! You can now log in using either Google or your email and password.'
          : 'Password successfully changed!'
      );
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(null);
      }, 4000);
    }
  };

  // Sync state if authProfile loads asynchronously
  useEffect(() => {
    if (authProfile) {
      if (authProfile.full_name) setFullName(authProfile.full_name);
      if (authProfile.institution) setInstitution(authProfile.institution);
      if (authProfile.education_level) setEducationLevel(authProfile.education_level);
      if (authProfile.preferred_language) {
        setPrimaryLanguage(authProfile.preferred_language);
      }
      if (authProfile.interests) setInterests(authProfile.interests);
      if (authProfile.custom_interests) setCustomInterests(authProfile.custom_interests);
      if (authProfile.learning_preferences && authProfile.learning_preferences.length > 0) {
        setLearningPreferences(authProfile.learning_preferences);
      } else if (authProfile.preferred_learning_style) {
        const mapped = authProfile.preferred_learning_style === 'theoretical' ? 'step_by_step' : authProfile.preferred_learning_style;
        setLearningPreferences([mapped]);
      } else {
        setLearningPreferences(DEFAULT_LEARNING_PREFERENCES);
      }
      if (authProfile.enable_code_mixing !== undefined) setEnableCodeMixing(authProfile.enable_code_mixing);
    }
  }, [authProfile]);

  const toggleInterest = (interest: string) => {
    setInterests(prev => {
      const exists = prev.includes(interest);
      return exists ? prev.filter(i => i !== interest) : [...prev, interest];
    });
  };

  const toggleLearningPreference = (prefId: string) => {
    if (learningPreferences.includes(prefId)) {
      // Minimum One Preference Rule
      if (learningPreferences.length <= 1) {
        setPreferenceWarning('Keep at least one learning preference enabled.');
        setTimeout(() => setPreferenceWarning(null), 3500);
        return;
      }
      setPreferenceWarning(null);
      setLearningPreferences(prev => prev.filter(p => p !== prefId));
    } else {
      setPreferenceWarning(null);
      setLearningPreferences(prev => [...prev, prefId]);
    }
  };

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCustomInterest.trim().replace(/[^\w\s&+\-.,/()]/g, '').slice(0, 40);
    if (!clean) return;
    if (
      !customInterests.some(i => i.toLowerCase() === clean.toLowerCase()) &&
      !interests.some(i => i.toLowerCase() === clean.toLowerCase())
    ) {
      setCustomInterests(prev => [...prev, clean]);
    }
    setNewCustomInterest('');
  };

  const handleRemoveCustomInterest = (item: string) => {
    setCustomInterests(prev => prev.filter(i => i !== item));
  };

  const handleResetPreferences = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiService.resetPreferences();
      setInterests([]);
      setCustomInterests([]);
      setLearningPreferences(DEFAULT_LEARNING_PREFERENCES);
      setPreferenceWarning(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset learning preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (learningPreferences.length < 1) {
      setPreferenceWarning('Keep at least one learning preference enabled.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await updateProfile({
      full_name: fullName.trim() || undefined,
      institution: institution.trim() || undefined,
      education_level: educationLevel,
      preferred_language: primaryLanguage,
      interests,
      custom_interests: customInterests,
      learning_preferences: learningPreferences,
      preferred_learning_style: learningPreferences[0] || 'visual',
      enable_code_mixing: enableCodeMixing,
    });

    setIsSaving(false);

    if (error) {
      setSaveError(error.message || 'Failed to save profile updates.');
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Personalized Learning Profile
            </span>
            <span className="text-xs text-nexora-text-muted">Master Prompt 03 Authenticated Student</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            Profile & Personalization
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            Tailor how NEXORA explains complex concepts. Our cognitive engine adapts analogies, difficulty levels, and linguistic tone to match who you are.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="md"
            icon={<LogOut className="w-4 h-4 text-rose-400" />}
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
          <Button 
            variant="primary" 
            size="md"
            icon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
            onClick={handleSave}
          >
            Save Preferences
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Your personalization settings have been updated and synchronized with your student profile!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. Basic Information */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-nexora-primary" />
              Student Identity & Verified Credentials
            </CardTitle>
            <Badge variant="success" dot>
              Verified Student Account
            </Badge>
          </div>
          <CardDescription>
            Your registered student profile details and academic preferences.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
                Full Display Name
              </label>
              <Input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Full Name"
                icon={<User className="w-4 h-4 text-nexora-text-muted" />}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
                Account Email (Read-Only)
              </label>
              <Input 
                value={user?.email || 'student@nexora.dev'}
                disabled
                icon={<Mail className="w-4 h-4 text-nexora-text-muted" />}
                className="opacity-70 cursor-not-allowed bg-nexora-surface/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
              College / University / School / Organization
            </label>
            <Input 
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Department of Computer Science & Engineering"
            />
          </div>


        </CardContent>
      </Card>

      {/* 2. Education Level Calibration */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-nexora-accent" />
            Academic Depth & Rigor
          </CardTitle>
          <CardDescription>
            Select your baseline so NEXORA provides appropriate mathematical rigor without overwhelming or condescending.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EDUCATION_LEVELS.map((level) => {
              const isSelected = educationLevel === level.id;
              return (
                <div
                  key={level.id}
                  onClick={() => setEducationLevel(level.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                    isSelected 
                      ? 'bg-nexora-primary/10 border-nexora-primary shadow-glow-sm' 
                      : 'bg-nexora-surface/40 border-nexora-border/60 hover:bg-nexora-surface-hover/50 hover:border-nexora-border'
                  }`}
                >
                  <span className={`text-sm font-medium ${isSelected ? 'text-nexora-primary' : 'text-nexora-text'}`}>
                    {level.label}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-nexora-primary shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Interests & Learning Preferences */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Interests & Learning Preferences
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {interests.length + customInterests.length} Selected
              </Badge>
              {(interests.length > 0 || customInterests.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  disabled={isSaving}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline cursor-pointer"
                >
                  Reset Preferences
                </button>
              )}
            </div>
          </div>
          <CardDescription>
            Choose what you enjoy outside class. NEXORA uses your passions to connect abstract physics formulas and algorithms to relatable real-world systems.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Primary Curated Passions */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-nexora-text-muted block mb-2.5">
              Select Your Learning Passions & Hobbies (Optional)
            </label>
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Learning interests">
              {AVAILABLE_INTERESTS.map((interest) => {
                const active = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={active}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-nexora-primary/50 ${
                      active 
                        ? 'bg-nexora-primary/20 border-nexora-primary text-white shadow-glow-sm scale-[1.02]' 
                        : 'bg-nexora-surface/60 border-nexora-border/60 text-nexora-text-muted hover:border-nexora-primary/40 hover:text-nexora-text'
                    }`}
                  >
                    <span>{interest}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-nexora-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Write-In Interests */}
          <div className="pt-4 border-t border-nexora-border/40">
            <label className="text-xs font-semibold uppercase tracking-wider text-nexora-text-muted block mb-2">
              Add Your Own Interest or Specialty (Write-in)
            </label>
            <form onSubmit={handleAddCustomInterest} className="flex gap-2 max-w-md">
              <Input
                value={newCustomInterest}
                onChange={(e) => setNewCustomInterest(e.target.value)}
                placeholder="e.g. Photography, Chess, Drone Racing..."
                maxLength={40}
                className="text-xs"
              />
              <Button type="submit" variant="secondary" size="sm" disabled={!newCustomInterest.trim()}>
                Add
              </Button>
            </form>

            {customInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customInterests.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomInterest(item)}
                      className="text-indigo-400 hover:text-white transition-colors cursor-pointer text-xs"
                      aria-label={`Remove ${item}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Learning Preferences Multi-Select */}
          <div className="pt-5 border-t border-nexora-border/40">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-nexora-text-muted block">
                  Learning Preferences
                </label>
                <span className="text-[11px] text-nexora-text-muted">
                  {learningPreferences.length} of {AVAILABLE_LEARNING_PREFERENCES.length} enabled
                </span>
              </div>
              <p className="text-xs text-nexora-subtext mt-1 leading-relaxed">
                These preferences customize <strong>how</strong> NEXORA helps you learn. They do not restrict what subjects or academic topics you can study — all curriculum content remains fully accessible.
              </p>
            </div>

            {preferenceWarning && (
              <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{preferenceWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AVAILABLE_LEARNING_PREFERENCES.map((pref) => {
                const isEnabled = learningPreferences.includes(pref.id);
                return (
                  <div
                    key={pref.id}
                    onClick={() => toggleLearningPreference(pref.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isEnabled
                        ? 'bg-nexora-primary/15 border-nexora-primary text-white shadow-glow-sm'
                        : 'bg-nexora-surface/30 border-nexora-border/50 text-nexora-text-muted opacity-60 hover:opacity-100 hover:border-nexora-border'
                    }`}
                    role="checkbox"
                    aria-checked={isEnabled}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleLearningPreference(pref.id);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold ${isEnabled ? 'text-white' : 'text-nexora-text-muted'}`}>
                          {pref.name}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors ${
                            isEnabled
                              ? 'bg-nexora-primary border-nexora-primary text-white'
                              : 'border-nexora-border bg-nexora-surface text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-nexora-text-muted leading-relaxed">
                        {pref.shortDesc}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-nexora-border/30 flex items-center justify-between text-[10px]">
                      <span className={isEnabled ? 'text-nexora-accent font-semibold' : 'text-nexora-text-muted'}>
                        {isEnabled ? '✓ Enabled' : 'Disabled'}
                      </span>
                      <span className="text-nexora-text-muted">Click to toggle</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Callout type="tip" title="Academic Rigor Safeguard">
            <p className="text-xs leading-relaxed text-nexora-subtext">
              Personalization only adapts introductory motivation, intuitive analogies, and real-world engineering contexts. Mathematical formulas and formal scientific laws remain factually exact and identical.
            </p>
          </Callout>
        </CardContent>
      </Card>

      {/* 4. Multilingual & Regional Foundation */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="w-4 h-4 text-emerald-400" />
            Multilingual & Code-Mixing Foundation
          </CardTitle>
          <CardDescription>
            Switch primary explanation language or enable conversational bilingual support for effortless intuition.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LANGUAGES.map((lang) => {
              const isSelected = primaryLanguage === lang.id;
              return (
                <div
                  key={lang.id}
                  onClick={() => setPrimaryLanguage(lang.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer text-center transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold shadow-glow-sm' 
                      : 'bg-nexora-surface/40 border-nexora-border/60 text-nexora-text-muted hover:border-nexora-border'
                  }`}
                >
                  <p className="text-sm font-medium text-nexora-text">{lang.native}</p>
                  <span className="text-[11px] text-nexora-text-subtle">{lang.label}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-nexora-border/40 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-nexora-text">
                Enable Conversational Code-Mixing (Tanglish / Tenglish / Hinglish)
              </h4>
              <p className="text-xs text-nexora-text-muted mt-0.5">
                Explains difficult engineering formulas using natural conversational vernacular without sacrificing technical terms.
              </p>
            </div>
            <input 
              type="checkbox" 
              checked={enableCodeMixing}
              onChange={(e) => setEnableCodeMixing(e.target.checked)}
              className="w-5 h-5 rounded border-nexora-border accent-nexora-primary cursor-pointer"
            />
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-nexora-surface-hover/20 border-t border-nexora-border/40 flex justify-end">
          <Button 
            variant="primary" 
            size="md" 
            icon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
            onClick={handleSave}
          >
            Save All Preferences
          </Button>
        </CardFooter>
      </Card>

      {/* 5. Security & Authentication Methods */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-nexora-accent" />
              Security & Authentication Methods
            </CardTitle>
            <Badge variant={hasPasswordAuth && identities.includes('google') ? 'accent' : 'primary'} size="sm">
              {hasPasswordAuth && identities.includes('google') ? 'Multi-Provider Enabled' : 'Single Identity Active'}
            </Badge>
          </div>
          <CardDescription>
            You can access your account using either Google Sign-In or your student password. Both methods connect to your same learning history and notes.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Google OAuth Status */}
            <div className="p-4 rounded-xl bg-nexora-surface/60 border border-nexora-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Google OAuth</h4>
                  <p className="text-[11px] text-nexora-text-muted">Connected Google Account</p>
                </div>
              </div>
              {identities.includes('google') ? (
                <Badge variant="success" size="sm" dot>Connected</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Available</Badge>
              )}
            </div>

            {/* Email & Password Status & Action */}
            <div className="p-4 rounded-xl bg-nexora-surface/60 border border-nexora-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Email & Password</h4>
                  <p className="text-[11px] text-nexora-text-muted">{user?.email || 'Registered email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPasswordAuth ? (
                  <>
                    <Badge variant="success" size="sm" dot>Configured</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm);
                        setPasswordFormMode('change');
                        setPasswordError(null);
                        setPasswordSuccess(null);
                      }}
                      className="text-xs py-1 px-2.5"
                    >
                      Change Password
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="warning" size="sm">Not Configured</Badge>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm);
                        setPasswordFormMode('set');
                        setPasswordError(null);
                        setPasswordSuccess(null);
                      }}
                      className="text-xs py-1 px-2.5"
                    >
                      Set Password
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Set / Change Password Form */}
          {showPasswordForm && (
            <div className="p-5 rounded-2xl bg-nexora-surface/90 border border-indigo-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-nexora-border/40">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-nexora-accent" />
                  <h4 className="text-sm font-bold text-white">
                    {passwordFormMode === 'set' ? 'Set Account Password' : 'Change Account Password'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="text-xs text-nexora-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-nexora-text-muted leading-relaxed">
                {passwordFormMode === 'set'
                  ? 'Adding a password to your Google account allows you to sign in with your email address anytime. Both Google and Email/Password authenticate to the same student profile.'
                  : 'Update your student account password. Your Google OAuth login will continue to work seamlessly.'}
              </p>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-nexora-text-muted">
                    New Password (min 6 characters)
                  </label>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    icon={<Lock className="w-4 h-4 text-nexora-text-muted" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="p-1 rounded-md text-nexora-muted hover:text-white transition-colors focus:outline-none"
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-nexora-text-muted">
                    Confirm New Password
                  </label>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    icon={<Lock className="w-4 h-4 text-nexora-text-muted" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-1 rounded-md text-nexora-muted hover:text-white transition-colors focus:outline-none"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordForm(false)}
                    disabled={isPasswordUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isPasswordUpdating}
                  >
                    {passwordFormMode === 'set' ? 'Set Password' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

