import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  GraduationCap, 
  Heart, 
  Globe, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck,
  Languages,
  BookOpen
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Callout } from '../components/ui/Callout';

interface StudentProfile {
  name: string;
  email: string;
  institution: string;
  educationLevel: string;
  interests: string[];
  primaryLanguage: string;
  enableCodeMixing: boolean;
}

const AVAILABLE_INTERESTS = [
  'Gaming & Game Dev',
  'Cricket & Sports Physics',
  'Space Exploration & Astronomy',
  'Competitive Coding & Algorithms',
  'Robotics & Drones',
  'Formula 1 & Automotive Engineering',
  'Music Production & Acoustics',
  'Biotech & Medical Tech',
  'Fintech & Quantitative Trading',
];

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
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem('nexora_student_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      name: 'Alex Rivera',
      email: 'alex.rivera@nexora.edu',
      institution: 'Department of Computer Science & Engineering',
      educationLevel: 'undergrad',
      interests: ['Space Exploration & Astronomy', 'Gaming & Game Dev', 'Competitive Coding & Algorithms'],
      primaryLanguage: 'en',
      enableCodeMixing: true,
    };
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleInterest = (interest: string) => {
    setProfile(prev => {
      const exists = prev.interests.includes(interest);
      const updated = exists 
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: updated };
    });
  };

  const handleSave = () => {
    localStorage.setItem('nexora_student_profile', JSON.stringify(profile));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Personalized Learning Profile
            </span>
            <span className="text-xs text-nexora-text-muted">Master Prompt 05 Context Adaptor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            Profile & Personalization
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            Tailor how NEXORA explains complex concepts. Our cognitive engine adapts analogies, difficulty levels, and linguistic tone to match who you are.
          </p>
        </div>
        <Button 
          variant="primary" 
          icon={<Save className="w-4 h-4" />}
          onClick={handleSave}
        >
          Save Preferences
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Your personalization settings have been updated! All future AI explanations will reflect these preferences.</span>
        </div>
      )}

      {/* 1. Basic Information */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-nexora-primary" />
            Student Identity
          </CardTitle>
          <CardDescription>
            Basic details used to calibrate your curriculum track and certificates.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
                Full Name
              </label>
              <Input 
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
                Email Address
              </label>
              <Input 
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="you@institution.edu"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-nexora-text-muted block mb-1.5">
              College / School / Organization
            </label>
            <Input 
              value={profile.institution}
              onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
              placeholder="e.g. National Institute of Technology"
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
              const isSelected = profile.educationLevel === level.id;
              return (
                <div
                  key={level.id}
                  onClick={() => setProfile({ ...profile, educationLevel: level.id })}
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

      {/* 3. Interest-Based Analogy Personalization */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-3 border-b border-nexora-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Interest-Based Analogy Generator
            </CardTitle>
            <Badge variant="primary" size="sm">
              {profile.interests.length} Selected
            </Badge>
          </div>
          <CardDescription>
            NEXORA uses these passions to ground abstract physics and algorithm equations into relatable real-world models.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {AVAILABLE_INTERESTS.map((interest) => {
              const active = profile.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                    active 
                      ? 'bg-nexora-primary/20 border-nexora-primary text-white shadow-glow-sm scale-[1.02]' 
                      : 'bg-nexora-surface/60 border-nexora-border/60 text-nexora-text-muted hover:border-nexora-primary/40 hover:text-nexora-text'
                  }`}
                >
                  <span>{interest}</span>
                  {active && <CheckCircle2 className="w-3 h-3 text-nexora-primary" />}
                </button>
              );
            })}
          </div>

          <Callout variant="tip" title="How This Personalizes Your Experience">
            <p className="text-xs leading-relaxed">
              When explaining <strong>Binary Search</strong>, NEXORA will frame it as searching an inventory in a game engine or hunting player stats in a cricket database. For <strong>Doppler Effect</strong>, it will reference F1 car telemetry or space redshift.
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
              const isSelected = profile.primaryLanguage === lang.id;
              return (
                <div
                  key={lang.id}
                  onClick={() => setProfile({ ...profile, primaryLanguage: lang.id })}
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
              checked={profile.enableCodeMixing}
              onChange={(e) => setProfile({ ...profile, enableCodeMixing: e.target.checked })}
              className="w-5 h-5 rounded border-nexora-border accent-nexora-primary cursor-pointer"
            />
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-nexora-surface-hover/20 border-t border-nexora-border/40 flex justify-end">
          <Button 
            variant="primary" 
            size="sm" 
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSave}
          >
            Save All Preferences
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
