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
import { useAcademicContext } from '../context/AcademicContext';
import { apiService } from '../services/api';
import { studentActivityService } from '../services/studentActivity';
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
  { id: 'class-1-5', label: 'Class 1–5 (Primary Education)' },
  { id: 'class-6-10', label: 'Class 6–10 (Secondary Education)' },
  { id: 'class-11-12', label: 'Class 11–12 (Higher Secondary)' },
  { id: 'undergraduate', label: 'Undergraduate (Collegiate / Degree)' },
  { id: 'postgraduate', label: 'Postgraduate (Master\'s / Specialist)' },
  { id: 'research', label: 'Research / Advanced Scholar (Ph.D.)' },
  { id: 'custom', label: 'Custom / Self-Directed Learner' },
];

export const EDUCATION_CATEGORIES = [
  { id: 'primary', label: 'Primary School', sub: 'Class 1–5', level: 'class-1-5' },
  { id: 'middle', label: 'Middle School', sub: 'Class 6–8', level: 'class-6-10' },
  { id: 'secondary', label: 'Secondary School', sub: 'Class 9–10', level: 'class-6-10' },
  { id: 'higher_secondary', label: 'Higher Secondary', sub: 'Class 11–12', level: 'class-11-12' },
  { id: 'undergraduate', label: 'Undergraduate', sub: 'B.Tech, B.Sc, B.Com', level: 'undergraduate' },
  { id: 'postgraduate', label: 'Postgraduate', sub: 'M.Tech, M.S., M.Sc', level: 'postgraduate' },
  { id: 'research', label: 'Research / Advanced', sub: 'Ph.D. & Scholar', level: 'research' },
  { id: 'custom', label: 'Custom / Independent', sub: 'Self-Directed', level: 'custom' },
];

export const GRADE_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  primary: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
  middle: ['Class 6', 'Class 7', 'Class 8'],
  secondary: ['Class 9', 'Class 10'],
  higher_secondary: ['Class 11', 'Class 12'],
  undergraduate: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
  postgraduate: ['Year 1', 'Year 2'],
  research: ['Doctoral Candidate', 'Postdoctoral Scholar', 'Independent Researcher'],
  custom: ['Self-Directed Learner', 'Continuous Professional Study'],
};

const STANDARD_BOARDS = [
  { id: 'cur-00000000-0000-0000-0000-000000000002', label: 'CBSE (Central Board of Secondary Education)' },
  { id: 'cur-00000000-0000-0000-0000-000000000004', label: 'ICSE (Council for the Indian School Certificate Examinations)' },
  { id: 'cur-00000000-0000-0000-0000-000000000005', label: 'Tamil Nadu State Board' },
  { id: 'cur-00000000-0000-0000-0000-000000000006', label: 'University Engineering (Computer Science & IT)' },
  { id: 'cur-00000000-0000-0000-0000-000000000007', label: 'University Natural Sciences (B.Sc / M.Sc)' },
  { id: 'cur-00000000-0000-0000-0000-000000000009', label: 'Custom / Self-Directed Academic Study' },
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
  const { refreshAcademicContext } = useAcademicContext();

  const [fullName, setFullName] = useState(authProfile?.full_name || user?.user_metadata?.full_name || '');
  const [institution, setInstitution] = useState(authProfile?.institution || '');
  const [educationLevel, setEducationLevel] = useState(authProfile?.education_level || 'undergraduate');
  const [educationCategory, setEducationCategory] = useState(authProfile?.education_category || 'undergraduate');
  const [curriculumId, setCurriculumId] = useState(authProfile?.curriculum_id || 'cur-00000000-0000-0000-0000-000000000002');
  const [gradeLevel, setGradeLevel] = useState(authProfile?.grade_level || 'Class 10');
  const [academicDomain, setAcademicDomain] = useState(authProfile?.academic_domain || 'General Studies');
  const [stateRegion, setStateRegion] = useState(authProfile?.state_region || '');
  const [degree, setDegree] = useState(authProfile?.degree || '');
  const [department, setDepartment] = useState(authProfile?.department || '');
  const [specialization, setSpecialization] = useState(authProfile?.specialization || '');
  const [academicYear, setAcademicYear] = useState(authProfile?.academic_year || '');
  const [boardType, setBoardType] = useState(authProfile?.board_type || 'national');
  const [stream, setStream] = useState(authProfile?.stream || '');
  const [program, setProgram] = useState(authProfile?.program || '');
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

  const calculateCompleteness = () => {
    let score = 0;
    if (fullName.trim()) score += 20;
    if (educationCategory) score += 20;
    if (gradeLevel.trim()) score += 20;
    if (curriculumId) score += 20;
    if (academicDomain.trim()) score += 20;
    return score;
  };
  const completeness = calculateCompleteness();

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
      if (authProfile.education_category) setEducationCategory(authProfile.education_category);
      if (authProfile.curriculum_id) setCurriculumId(authProfile.curriculum_id);
      if (authProfile.grade_level) setGradeLevel(authProfile.grade_level);
      if (authProfile.academic_domain) setAcademicDomain(authProfile.academic_domain);
      if (authProfile.state_region) setStateRegion(authProfile.state_region);
      if (authProfile.degree) setDegree(authProfile.degree);
      if (authProfile.department) setDepartment(authProfile.department);
      if (authProfile.specialization) setSpecialization(authProfile.specialization);
      if (authProfile.academic_year) setAcademicYear(authProfile.academic_year);
      if (authProfile.board_type) setBoardType(authProfile.board_type);
      if (authProfile.stream) setStream(authProfile.stream);
      if (authProfile.program) setProgram(authProfile.program);
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
      education_category: educationCategory,
      curriculum_id: curriculumId,
      board_type: boardType,
      stream: stream.trim() || undefined,
      program: program.trim() || undefined,
      grade_level: gradeLevel,
      academic_domain: academicDomain,
      state_region: stateRegion.trim() || undefined,
      degree: degree.trim() || undefined,
      department: department.trim() || undefined,
      specialization: specialization.trim() || undefined,
      academic_year: academicYear.trim() || undefined,
      profile_completed: true,
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
      // Prevent stale CSE active course from persisting if student switched to primary or secondary
      const isK12 = educationCategory === 'primary' || educationCategory === 'secondary' || educationLevel.toLowerCase().includes('class');
      if (isK12) {
        studentActivityService.clearActiveCourse();
      }
      studentActivityService.clearActivities();
      await refreshAcademicContext();
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

      {/* Profile Completeness Status */}
      <Card className="border-nexora-border/80 bg-gradient-to-r from-nexora-surface/90 to-nexora-bg/90">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                completeness === 100 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {completeness}%
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {completeness === 100 ? 'Academic Profile Complete' : 'Complete Your Academic Profile'}
                </h3>
                <p className="text-xs text-nexora-muted">
                  {completeness === 100 
                    ? 'Your academic workspace is fully configured with your board and grade level.'
                    : 'Configure your education category, board, and grade level to personalize your syllabus.'}
                </p>
              </div>
            </div>
            <Badge variant={completeness === 100 ? 'success' : 'warning'} size="sm">
              {completeness === 100 ? 'Fully Verified' : `${100 - completeness}% Incomplete`}
            </Badge>
          </div>
          <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                completeness === 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </CardContent>
      </Card>

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
              placeholder="e.g. National Public School / Anna University / IIT Madras"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Education Level Calibration & Curriculum */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-nexora-accent" />
            Academic Level & Curriculum Board
          </CardTitle>
          <CardDescription>
            Configure your curriculum board, grade level, and academic domain so NEXORA grounds learning in your actual syllabus instead of generic engineering content.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Education Category Grid */}
          <div>
            <label className="text-xs font-semibold text-nexora-text block mb-1">
              1. Education Stage / Category
            </label>
            <p className="text-xs text-nexora-muted mb-3">
              Select your current academic stage to unlock appropriate board standards.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {EDUCATION_CATEGORIES.map((cat) => {
                const isSelected = educationCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setEducationCategory(cat.id);
                      setEducationLevel(cat.level);
                      const availableGrades = GRADE_OPTIONS_BY_CATEGORY[cat.id] || [];
                      if (availableGrades.length > 0 && !availableGrades.includes(gradeLevel)) {
                        setGradeLevel(availableGrades[0]);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-nexora-primary/10 border-nexora-primary shadow-glow-sm' 
                        : 'bg-nexora-surface/40 border-nexora-border/60 hover:bg-nexora-surface-hover/50 hover:border-nexora-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-nexora-primary' : 'text-white'}`}>
                        {cat.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-nexora-primary shrink-0" />}
                    </div>
                    <span className="text-[11px] text-nexora-muted">{cat.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Class / Grade Selector */}
          <div className="pt-4 border-t border-nexora-border/50">
            <label className="text-xs font-semibold text-nexora-text block mb-1">
              2. Specific Class / Grade / Year
            </label>
            <p className="text-xs text-nexora-muted mb-2.5">
              Select your specific level or type a custom grade below.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(GRADE_OPTIONS_BY_CATEGORY[educationCategory] || []).map((grade) => {
                const isSelected = gradeLevel === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setGradeLevel(grade)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-nexora-accent/15 border-nexora-accent text-nexora-accent font-semibold shadow-glow-sm'
                        : 'bg-nexora-bg/80 border-nexora-border text-nexora-subtext hover:border-nexora-border/90 hover:text-white'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
            <Input 
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="e.g. Class 8, Class 10, Year 2"
            />
          </div>

          {/* Board Authority Type: National vs State for School Levels */}
          {(educationCategory === 'primary' || educationCategory === 'middle' || educationCategory === 'secondary' || educationCategory === 'higher_secondary') && (
            <div className="pt-4 border-t border-nexora-border/50 space-y-3">
              <label className="text-xs font-semibold text-nexora-text block">
                3. Board Authority Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBoardType('national')}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    boardType === 'national'
                      ? 'bg-nexora-primary/15 border-nexora-primary text-white font-semibold'
                      : 'bg-nexora-surface/40 border-nexora-border/60 text-nexora-muted hover:text-white'
                  }`}
                >
                  National Board (CBSE / ICSE)
                </button>
                <button
                  type="button"
                  onClick={() => setBoardType('state')}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    boardType === 'state'
                      ? 'bg-nexora-primary/15 border-nexora-primary text-white font-semibold'
                      : 'bg-nexora-surface/40 border-nexora-border/60 text-nexora-muted hover:text-white'
                  }`}
                >
                  State Board (Regional Syllabus)
                </button>
              </div>

              {boardType === 'state' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="text-xs font-medium text-nexora-text-muted block mb-1">
                    State / Region
                  </label>
                  <Input
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="e.g. Tamil Nadu, Karnataka, Maharashtra, Kerala"
                  />
                </div>
              )}

              {/* Stream Selector for Higher Secondary (Class 11-12) */}
              {educationCategory === 'higher_secondary' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="text-xs font-semibold text-nexora-text block mb-1.5">
                    Academic Stream (Class 11–12)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Science (PCM)', 'Science (PCB)', 'Commerce', 'Arts / Humanities'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStream(s)}
                        className={`py-2 px-2.5 rounded-lg border text-xs transition-all ${
                          stream === s
                            ? 'bg-nexora-accent/15 border-nexora-accent text-nexora-accent font-semibold'
                            : 'bg-nexora-surface/40 border-nexora-border/60 text-nexora-muted hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Curriculum / Board Selection */}
          <div className="pt-4 border-t border-nexora-border/50">
            <label className="text-xs font-semibold text-nexora-text block mb-1">
              4. Prescribed Educational Board / Curriculum Reference
            </label>
            <p className="text-xs text-nexora-muted mb-2.5">
              Choose your governing curriculum board to align topics and exam patterns.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STANDARD_BOARDS.map((board) => {
                const isSelected = curriculumId === board.id;
                return (
                  <div
                    key={board.id}
                    onClick={() => setCurriculumId(board.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-500/15 border-indigo-500 shadow-glow-sm' 
                        : 'bg-nexora-surface/40 border-nexora-border/60 hover:bg-nexora-surface-hover/50 hover:border-nexora-border'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-indigo-300' : 'text-nexora-text'}`}>
                      {board.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conditional Higher Ed Details */}
          {(educationCategory === 'undergraduate' || educationCategory === 'postgraduate' || educationCategory === 'research') && (
            <div className="pt-4 border-t border-nexora-border/50 space-y-4 animate-fadeIn">
              <label className="text-xs font-semibold text-nexora-accent block">
                Higher Education Degree & Specialization Details
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-nexora-text-muted block mb-1">
                    Degree Program
                  </label>
                  <Input 
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. B.Tech / B.Sc / M.S."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-nexora-text-muted block mb-1">
                    Department / Major
                  </label>
                  <Input 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science / Physics"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-nexora-text-muted block mb-1">
                    Specialization / Focus
                  </label>
                  <Input 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                  />
                </div>
              </div>
            </div>
          )}

          {/* State / Region if State Board */}
          {curriculumId === 'cur-00000000-0000-0000-0000-000000000005' && (
            <div className="pt-4 border-t border-nexora-border/50 animate-fadeIn">
              <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
                State / Regional Jurisdiction
              </label>
              <Input 
                value={stateRegion}
                onChange={(e) => setStateRegion(e.target.value)}
                placeholder="e.g. Tamil Nadu, Karnataka, Maharashtra"
              />
            </div>
          )}

          {/* Academic Domain */}
          <div className="pt-4 border-t border-nexora-border/50">
            <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
              Primary Academic Discipline / Domain
            </label>
            <Input 
              value={academicDomain}
              onChange={(e) => setAcademicDomain(e.target.value)}
              placeholder="e.g. General Science & Mathematics, Computer Science & Engineering, Humanities"
            />
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

