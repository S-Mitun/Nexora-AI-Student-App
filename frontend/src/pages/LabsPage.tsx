import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const LabsPage: React.FC = () => {
  return (
    <ComingSoon
      title="Virtual Laboratories & Simulations"
      stageBadge="Master Prompts 10–12 Labs"
      description="Interactive virtual laboratory environments designed for experiential discovery. Experiment with CNN feature maps, Autoencoder latent manifolds, digital circuits, and physics simulators."
      upcomingFeatures={[
        'Interactive CNN feature map visualizer',
        'Autoencoder latent space dimension sliders',
        'Physics & mechanics virtual experiments',
        'Old vs New Technology comparison lab',
      ]}
    />
  );
};
