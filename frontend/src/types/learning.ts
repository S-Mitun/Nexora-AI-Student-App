export interface Curriculum {
  id: string;
  code: string;
  name: string;
  board_authority: string;
  education_level: string;
  country: string;
  description?: string;
  is_active: boolean;
}

export interface StudyMaterialDocument {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  file_path: string;
  file_size_bytes: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry';
  curriculum_id?: string;
  subject_id?: string;
  language: string;
  version: number;
  progress_percent: number;
  processing_stage: string;
  error_message?: string;
  page_count: number;
  content_hash?: string;
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  curriculum_id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category?: string;
  difficulty_level?: string;
  education_level?: string;
  academic_domain?: string;
  is_system?: boolean;
  is_enrolled?: boolean;
  order_index?: number;
  topic_count?: number;
  concept_count: number;
}

export interface StudentSubject {
  id: string;
  user_id: string;
  subject_id: string;
  enrollment_source: string;
  is_active: boolean;
  subject?: Subject;
}

export interface ProfileCompleteness {
  score: number;
  is_complete: boolean;
  missing_fields: string[];
}

export interface AcademicIdentity {
  education_level: string;
  education_category: string;
  grade_level: string;
  curriculum_id?: string | null;
  curriculum_name?: string | null;
  curriculum_code?: string | null;
  board_authority?: string | null;
  board_type?: string | null;
  stream?: string | null;
  program?: string | null;
  academic_domain: string;
  state_region?: string | null;
  institution?: string | null;
  degree?: string | null;
  department?: string | null;
  specialization?: string | null;
  academic_year?: string | null;
  preferred_language: string;
}

export interface MaterialsSummary {
  total_count: number;
  ready_count: number;
  processing_count: number;
  failed_count: number;
  recent_materials: StudyMaterialDocument[];
}

export interface LearningToolStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  status: 'active' | 'upcoming_prompt' | string;
  phase_label: string;
}

export interface SyllabusVersion {
  id: string;
  syllabus_id: string;
  version_number: number;
  document_id?: string | null;
  raw_extracted_json?: any;
  is_active: boolean;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Syllabus {
  id: string;
  user_id: string;
  title: string;
  academic_level: string;
  institution?: string | null;
  program_degree?: string | null;
  academic_year?: string | null;
  status: 'uploaded' | 'processing' | 'extracted' | 'confirmed' | 'archived' | string;
  created_at: string;
  updated_at: string;
  active_version?: SyllabusVersion | null;
  versions?: SyllabusVersion[];
}

export interface WorkspaceOverview {
  profile_completeness: ProfileCompleteness;
  academic_identity: AcademicIdentity;
  active_syllabus?: Syllabus | null;
  enrolled_subjects: Subject[];
  materials_summary: MaterialsSummary;
  learning_tools: LearningToolStatus[];
  starter_subjects_available: number;
  system_exploration_hint?: string;
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
  has_simulation?: boolean;
  has_visualization?: boolean;
  has_practice?: boolean;
  has_lab?: boolean;
  has_mindmap?: boolean;
  learning_modes?: string[];
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

export interface StudentNote {
  id: string;
  user_id: string;
  academic_level: string;
  subject_id?: string | null;
  concept_id?: string | null;
  lesson_id?: string | null;
  title: string;
  content: string;
  tags: string[];
  source_reference?: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticeQuestion {
  id: string;
  practice_set_id: string;
  concept_id?: string | null;
  lesson_id?: string | null;
  question_text: string;
  options: string[];
  points: number;
  difficulty: string;
  order_index: number;
}

export interface PracticeSet {
  id: string;
  concept_id?: string | null;
  lesson_id?: string | null;
  subject_id?: string | null;
  academic_level: string;
  title: string;
  description?: string | null;
  difficulty: string;
  questions_count: number;
  questions: PracticeQuestion[];
}

export interface QuestionSubmissionResult {
  question_id: string;
  question_text: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
  points_earned: number;
}

export interface PracticeResult {
  set_id: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  passed: boolean;
  results: QuestionSubmissionResult[];
}

export interface AcademicActivityLog {
  id: string;
  activity_type: string;
  academic_level: string;
  subject_id?: string | null;
  concept_id?: string | null;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  meta: Record<string, any>;
  created_at: string;
}

export interface SubjectProgress {
  subject_id: string;
  subject_name: string;
  progress_percent: number;
  completed_topics_count: number;
  total_topics_count: number;
}

export interface AcademicProgressOverview {
  academic_level: string;
  overall_progress_percent: number;
  completed_lessons_count: number;
  completed_quizzes_count: number;
  enrolled_subjects_count: number;
  study_minutes: number;
  subject_progress: SubjectProgress[];
}

