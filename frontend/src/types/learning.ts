export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  concept_count: number;
}

export interface SimulationControl {
  id: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default: any;
  options?: string[];
}

export interface InteractiveSimulation {
  simulation_type: string;
  parameters: Record<string, any>;
  controls: SimulationControl[];
}

export interface PersonalizedContext {
  interest: string;
  domain: string;
  headline: string;
  analogy_explanation: string;
  real_world_application: string;
  related_domains: string[];
  relevance_score?: number;
}

export interface RecommendedTopic {
  concept: string;
  subject: string;
  slug: string;
  matched_interest: string;
  headline: string;
  summary: string;
  target_url: string;
}

export interface ConceptExploreResult {
  concept: string;
  domain: string;
  tagline: string;
  why_it_matters: string;
  simple_explanation: string;
  technical_explanation: string;
  simulation: InteractiveSimulation;
  practical_application: string;
  quick_check_question: string;
  quick_check_options: string[];
  quick_check_answer_index: number;
  personalized_context?: PersonalizedContext | null;
  available_perspectives?: PersonalizedContext[];
}

export interface BackendHealth {
  status: string;
  timestamp: string;
  project: string;
  tagline: string;
  system: {
    api: string;
    database: string;
    environment: string;
    version: string;
  };
  capabilities: Record<string, boolean>;
}
