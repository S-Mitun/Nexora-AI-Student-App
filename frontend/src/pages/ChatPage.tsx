import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const ChatPage: React.FC = () => {
  return (
    <ComingSoon
      title="RAG AI Tutor & Learning Companion"
      stageBadge="Master Prompt 06 Chatbot"
      description="Engage in deep, contextual Socratic dialogue. NEXORA's AI Tutor references your uploaded materials, answers difficult questions with verified citations, and asks probing follow-ups to ensure true understanding."
      upcomingFeatures={[
        'Grounded RAG retrieval with textbook citations',
        'Socratic questioning & teach-back verification',
        'Misconception detection and targeted hints',
        'Full session persistence across devices',
      ]}
    />
  );
};
