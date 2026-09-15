import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const NotesPage: React.FC = () => {
  return (
    <ComingSoon
      title="Personal Notes & Learning Journal"
      stageBadge="Master Prompt 09 Journal"
      description="Your personal repository of reflections, insights, and revision cards. Export clean summary PDFs that synthesize your own thoughts rather than generic AI text dumps."
      upcomingFeatures={[
        'Concept-linked note annotations',
        'Personal PDF journey export (DocumentExportService)',
        'Spaced revision card generation',
        'Markdown note editor with formula formatting',
      ]}
    />
  );
};
