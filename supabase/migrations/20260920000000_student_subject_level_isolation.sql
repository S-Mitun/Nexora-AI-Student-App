-- Migration: 20260920000000_student_subject_level_isolation.sql
-- Master Prompt 06R: Academic Context Hardening and StudentSubject Level Isolation

-- 1. Add academic_level column to student_subjects
ALTER TABLE public.student_subjects 
ADD COLUMN IF NOT EXISTS academic_level VARCHAR(50) DEFAULT 'undergraduate' NOT NULL;

-- 2. Create composite index on (user_id, academic_level) for instant context-scoped lookup
CREATE INDEX IF NOT EXISTS ix_student_subjects_user_level 
ON public.student_subjects (user_id, academic_level);

-- 3. Backfill legacy enrollments from linked subject education_level
UPDATE public.student_subjects 
SET academic_level = (
    SELECT CASE 
        WHEN s.education_level IN ('primary', 'class-1-5') THEN 'class_1_5'
        WHEN s.education_level IN ('secondary', 'class-6-10') THEN 'class_6_10'
        WHEN s.education_level IN ('higher_secondary', 'class-11-12') THEN 'class_11_12'
        ELSE 'undergraduate'
    END
    FROM public.subjects s 
    WHERE s.id = public.student_subjects.subject_id
)
WHERE academic_level IS NULL OR academic_level = 'undergraduate';

-- 4. Enable RLS and verify policies
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own student_subjects" ON public.student_subjects;
CREATE POLICY "Users can read own student_subjects"
ON public.student_subjects
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own student_subjects" ON public.student_subjects;
CREATE POLICY "Users can insert own student_subjects"
ON public.student_subjects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own student_subjects" ON public.student_subjects;
CREATE POLICY "Users can update own student_subjects"
ON public.student_subjects
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own student_subjects" ON public.student_subjects;
CREATE POLICY "Users can delete own student_subjects"
ON public.student_subjects
FOR DELETE
USING (auth.uid() = user_id);
