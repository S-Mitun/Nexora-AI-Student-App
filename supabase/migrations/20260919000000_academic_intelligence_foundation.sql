-- ==============================================================================
-- NEXORA MIGRATION 20260919000000
-- Stage 06: Academic Intelligence Core, Level Isolation, Board Hierarchy & Scalable Learning Foundation
-- ==============================================================================

-- 1. Extend curricula table with Board Type, State/Region, and Stream/Program
ALTER TABLE public.curricula
    ADD COLUMN IF NOT EXISTS board_type VARCHAR(50) DEFAULT 'national_board', -- national_board, state_board, international_board, university_degree, research, custom
    ADD COLUMN IF NOT EXISTS state_region VARCHAR(100),
    ADD COLUMN IF NOT EXISTS stream VARCHAR(100),
    ADD COLUMN IF NOT EXISTS program VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_curricula_board_type ON public.curricula(board_type);
CREATE INDEX IF NOT EXISTS idx_curricula_state_region ON public.curricula(state_region);

-- Update starter curricula with proper board types and states
UPDATE public.curricula SET board_type = 'national_board', state_region = 'All India' WHERE code IN ('cbse-primary', 'cbse-secondary', 'cbse-higher-sec', 'icse-secondary');
UPDATE public.curricula SET board_type = 'state_board', state_region = 'Tamil Nadu' WHERE code = 'tn-state-board';
UPDATE public.curricula SET board_type = 'university_degree', program = 'B.Tech / B.E.' WHERE code = 'univ-eng-cse';
UPDATE public.curricula SET board_type = 'university_degree', program = 'B.Sc / M.Sc' WHERE code = 'univ-sciences';
UPDATE public.curricula SET board_type = 'research', program = 'Ph.D. / Advanced Scholar' WHERE code = 'postgrad-advanced';
UPDATE public.curricula SET board_type = 'custom', program = 'Self-Directed' WHERE code = 'custom-independent';

-- 2. Extend profiles table with Board Type, Stream, and Program
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS board_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS stream VARCHAR(100),
    ADD COLUMN IF NOT EXISTS program VARCHAR(100);

-- 3. Enhance user_progress table for strict Academic Level Isolation
ALTER TABLE public.user_progress
    ADD COLUMN IF NOT EXISTS academic_level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.learning_modules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_progress_user_level ON public.user_progress(user_id, academic_level);

-- 4. Enhance quiz_attempts table for Academic Level Isolation
ALTER TABLE public.quiz_attempts
    ADD COLUMN IF NOT EXISTS academic_level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_level ON public.quiz_attempts(user_id, academic_level);

-- 5. Enhance notes table for Academic Level Isolation & Provenance
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS academic_level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.learning_modules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_reference VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_notes_user_level ON public.notes(user_id, academic_level);

-- 6. Create learning_activity_logs table for event-driven academic history
CREATE TABLE IF NOT EXISTS public.learning_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
    curriculum_id UUID REFERENCES public.curricula(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    module_id UUID REFERENCES public.learning_modules(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- viewed_subject, opened_module, opened_lesson, completed_lesson, started_practice, completed_practice, created_note, edited_note, uploaded_material, viewed_material, opened_lab, opened_simulation
    title VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- subject, module, lesson, note, material, practice, lab
    entity_id VARCHAR(100),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_level ON public.learning_activity_logs(user_id, academic_level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.learning_activity_logs(created_at DESC);

ALTER TABLE public.learning_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own activity logs" ON public.learning_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own activity logs" ON public.learning_activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Create practice_sets and practice_questions tables
CREATE TABLE IF NOT EXISTS public.practice_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_level VARCHAR(50) NOT NULL DEFAULT 'undergraduate',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(50) DEFAULT 'intermediate',
    questions_count INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_sets_academic_level ON public.practice_sets(academic_level);
CREATE INDEX IF NOT EXISTS idx_practice_sets_lesson_id ON public.practice_sets(lesson_id);
CREATE INDEX IF NOT EXISTS idx_practice_sets_concept_id ON public.practice_sets(concept_id);

ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for practice sets" ON public.practice_sets
    FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_set_id UUID NOT NULL REFERENCES public.practice_sets(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'intermediate',
    points INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_questions_set_id ON public.practice_questions(practice_set_id);

ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for practice questions" ON public.practice_questions
    FOR SELECT USING (true);
