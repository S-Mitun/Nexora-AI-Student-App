import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const MindMapPage: React.FC = () => {
  return (
    <ComingSoon
      title="Interactive Knowledge Graph & Mind Map"
      stageBadge="Master Prompt 23 Graph"
      description="Visualize how concepts interlock. Understand prerequisites, explore dependencies, and identify exactly what fundamental knowledge you need to tackle advanced topics."
      upcomingFeatures={[
        'Interactive React Flow node-link concept tree',
        'Prerequisite chains & dependency detection',
        'Mastery heatmaps showing strong and weak areas',
        'Direct navigation to any concept node in the graph',
      ]}
    />
  );
};
