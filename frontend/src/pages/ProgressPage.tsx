import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const ProgressPage: React.FC = () => {
  return (
    <ComingSoon
      title="Mastery Tracking & Spaced Repetition"
      stageBadge="Master Prompt 18 Mastery"
      description="Track your true conceptual retention. NEXORA measures depth of understanding through experimentation and practical application rather than simple multiple-choice memorization."
      upcomingFeatures={[
        'Concept mastery scores and retention decay modeling',
        'Adaptive review prompts based on spaced repetition',
        'Study streak & active comprehension telemetry',
        'Personal learning analytics dashboard',
      ]}
    />
  );
};
