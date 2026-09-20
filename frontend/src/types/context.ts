export interface KnowledgeScope {
  baseline: boolean;
  board_overlay: boolean;
  user_materials: boolean;
  external_verified: boolean;
}

export interface AcademicContextResponse {
  user_id: string;
  context_id: string; // Canonical deterministic context partition identifier
  context_fingerprint: string; // Verification hash of resolved context parameters
  academic_level: string; // class_1_5, class_6_10, class_11_12, undergraduate, postgraduate, research, custom
  education_category: string;
  
  // Board & Curriculum
  curriculum_id?: string | null;
  curriculum_code?: string | null;
  curriculum_name?: string | null;
  board_authority?: string | null;
  board_type?: string | null;
  stream?: string | null;
  program?: string | null;
  
  // Secondary attributes
  grade_level: string;
  academic_domain: string;
  state_region?: string | null;
  
  // Higher ed attributes
  degree?: string | null;
  department?: string | null;
  specialization?: string | null;
  academic_year?: string | null;
  institution?: string | null;
  
  // Preferences & language
  preferred_language: string;
  learning_preferences: string[];
  
  // Active learning pointers
  active_subject_id?: string | null;
  active_subject_slug?: string | null;
  active_subject_name?: string | null;
  active_topic_slug?: string | null;
  active_concept_slug?: string | null;
  
  // Scoped IDs
  enrolled_subject_ids: string[];
  available_material_ids: string[];
  
  // Knowledge scope
  knowledge_scope: KnowledgeScope;
  resolved_at: string;
}
