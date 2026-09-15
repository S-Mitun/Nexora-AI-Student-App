import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const ProfilePage: React.FC = () => {
  return (
    <ComingSoon
      title="Student Profile & Supabase Auth"
      stageBadge="Master Prompt 03 Authentication"
      description="Personalize your learning companion with your current grade level, target exam, language preference, and hobbies. In Stage 03, Supabase Auth secures your documents, notes, and progress records."
      upcomingFeatures={[
        'Supabase Auth (Magic Link, Google, GitHub)',
        'Education level & course syllabus alignment',
        'Multilingual preference (English, Tamil, Telugu - Stage 15)',
        'Personal interest & hobby personalization (Stage 04)',
      ]}
    />
  );
};
