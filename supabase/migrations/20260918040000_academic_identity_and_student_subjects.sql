-- ==============================================================================
-- NEXORA MIGRATION 20260918040000
-- Stage 06: Academic Foundation, Education-Level Intelligence & Student Subjects
-- ==============================================================================

-- 1. Extend profiles table with comprehensive academic identity attributes
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS education_category VARCHAR(50) DEFAULT 'undergraduate',
    ADD COLUMN IF NOT EXISTS state_region VARCHAR(100),
    ADD COLUMN IF NOT EXISTS degree VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50),
    ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- 2. Extend subjects table with system vs student provenance and educational level
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS education_level VARCHAR(50) DEFAULT 'all-levels',
    ADD COLUMN IF NOT EXISTS academic_domain VARCHAR(100) DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_education_level ON public.subjects(education_level);
CREATE INDEX IF NOT EXISTS idx_subjects_academic_domain ON public.subjects(academic_domain);

-- 3. Create student_subjects association table (decouples student from global starter subjects)
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    enrollment_source VARCHAR(50) NOT NULL DEFAULT 'student_selected', -- curriculum_prescribed, student_selected, material_discovered, starter_explore
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_subjects UNIQUE(user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_subjects_user_id ON public.student_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject_id ON public.student_subjects(subject_id);

-- Enable RLS on student_subjects
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrolled subjects" ON public.student_subjects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can enroll in subjects" ON public.student_subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own enrollment" ON public.student_subjects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Students can unenroll from subjects" ON public.student_subjects
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Extend concepts table with capability flags for concept-aware learning
ALTER TABLE public.concepts
    ADD COLUMN IF NOT EXISTS has_simulation BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_visualization BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_practice BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS has_lab BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS has_mindmap BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS learning_modes JSONB DEFAULT '["learn", "ask", "practice", "notes"]'::jsonb;

-- 5. Classify existing engineering starter subjects as Undergraduate CSE
UPDATE public.subjects
SET 
    is_system = TRUE,
    education_level = 'undergraduate',
    academic_domain = 'Computer Science & Engineering'
WHERE slug IN (
    'data-structures-algorithms', 
    'operating-systems', 
    'database-management-systems', 
    'computer-networks', 
    'artificial-intelligence-machine-learning'
);

-- Classify Physics as foundational/all-levels
UPDATE public.subjects
SET
    is_system = TRUE,
    education_level = 'all-levels',
    academic_domain = 'Natural Sciences'
WHERE slug = 'physics';

-- 6. Seed Legitimate Standard K-12 and Secondary School Subjects
-- CBSE Secondary (Class 6-10) Subjects
INSERT INTO public.subjects (id, curriculum_id, name, slug, description, icon, category, difficulty_level, is_system, education_level, academic_domain, order_index, is_active)
VALUES
    ('sub-00000000-0000-0000-0000-000000000010', 'cur-00000000-0000-0000-0000-000000000002', 'General Science', 'cbse-sec-science', 'Physics, Chemistry, and Biology concepts for secondary school students.', 'FlaskConical', 'Natural Sciences', 'intermediate', TRUE, 'class-6-10', 'General Science', 1, TRUE),
    ('sub-00000000-0000-0000-0000-000000000011', 'cur-00000000-0000-0000-0000-000000000002', 'Secondary Mathematics', 'cbse-sec-mathematics', 'Algebra, Geometry, Trigonometry, Statistics and Number Systems.', 'Binary', 'Mathematics', 'intermediate', TRUE, 'class-6-10', 'Mathematics', 2, TRUE),
    ('sub-00000000-0000-0000-0000-000000000012', 'cur-00000000-0000-0000-0000-000000000002', 'Social Science', 'cbse-sec-social-science', 'History, Democratic Politics, Geography, and Economic Development.', 'Globe', 'Humanities', 'beginner', TRUE, 'class-6-10', 'Social Science', 3, TRUE),
    ('sub-00000000-0000-0000-0000-000000000013', 'cur-00000000-0000-0000-0000-000000000002', 'English Language & Literature', 'cbse-sec-english', 'Reading comprehension, writing skills, grammar, and literature studies.', 'BookOpen', 'Languages', 'beginner', TRUE, 'class-6-10', 'Languages', 4, TRUE),

    -- CBSE Higher Secondary (Class 11-12) Subjects
    ('sub-00000000-0000-0000-0000-000000000014', 'cur-00000000-0000-0000-0000-000000000003', 'Higher Secondary Chemistry', 'cbse-hs-chemistry', 'Organic, Inorganic, and Physical Chemistry for Senior Secondary.', 'FlaskConical', 'Natural Sciences', 'advanced', TRUE, 'class-11-12', 'Chemistry', 1, TRUE),
    ('sub-00000000-0000-0000-0000-000000000015', 'cur-00000000-0000-0000-0000-000000000003', 'Higher Secondary Biology', 'cbse-hs-biology', 'Cell biology, genetics, human physiology, and ecology.', 'Dna', 'Natural Sciences', 'advanced', TRUE, 'class-11-12', 'Biology', 2, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    curriculum_id = EXCLUDED.curriculum_id,
    education_level = EXCLUDED.education_level,
    academic_domain = EXCLUDED.academic_domain;
