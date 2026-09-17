export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category?: string;
  difficulty_level?: string;
  order_index?: number;
  topic_count?: number;
  concept_count: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  content_type: 'explanation' | 'example' | 'definition' | 'key_points' | 'visual' | 'exercise' | 'reading' | string;
  order_index: number;
  estimated_minutes: number;
  is_active: boolean;
}

export interface LessonDetail extends Lesson {
  content: string;
  module_title?: string;
  concept_name?: string;
  concept_slug?: string;
  subject_name?: string;
  subject_slug?: string;
  previous_lesson_slug?: string | null;
  next_lesson_slug?: string | null;
  personalized_context?: PersonalizedContext | null;
}

export interface LearningModule {
  id: string;
  concept_id: string;
  title: string;
  slug: string;
  description?: string;
  learning_objective?: string;
  difficulty_level: string;
  estimated_minutes: number;
  order_index: number;
  lesson_count: number;
  prerequisites: string[];
}

export interface LearningModuleDetail extends LearningModule {
  why_it_matters: string;
  simple_explanation: string;
  technical_explanation: string;
  visualization_type: string;
  experiment_type: string;
  simulation_config: Record<string, any>;
  application_notes: string;
  lessons: Lesson[];
  concept_name?: string;
  concept_slug?: string;
  subject_name?: string;
  subject_slug?: string;
}

export interface Concept {
  id: string;
  topic_id: string;
  name: string;
  slug: string;
  summary: string;
  short_description?: string;
  difficulty: string;
  difficulty_level?: string;
  order_index: number;
  module_count: number;
}

export interface ConceptDetail extends Concept {
  modules: LearningModule[];
  topic_name?: string;
  topic_slug?: string;
  subject_name?: string;
  subject_slug?: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description?: string;
  order_index: number;
  concept_count: number;
  concepts?: Concept[];
}

export interface TopicDetail extends Topic {
  concepts: Concept[];
  subject_name?: string;
  subject_slug?: string;
}

export interface SubjectDetail extends Subject {
  topics: TopicDetail[];
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
