export interface ProfileCompletionData {
  full_name?: string | null;
  education_level?: string | null;
  education_category?: string | null;
  grade_level?: string | null;
  curriculum_id?: string | null;
  board_type?: string | null;
  state_region?: string | null;
  degree?: string | null;
  department?: string | null;
  program?: string | null;
  stream?: string | null;
  specialization?: string | null;
  academic_year?: string | null;
  institution?: string | null;
}

export interface ProfileCompletionDetails {
  score: number;
  completion_percentage: number;
  is_complete: boolean;
  required_fields: string[];
  completed_fields: string[];
  missing_fields: string[];
}

const HIGHER_ED_CATEGORIES = new Set([
  'undergraduate',
  'postgraduate',
  'research',
  'higher_ed',
  'university',
  'college',
]);

const SCHOOL_CATEGORIES = new Set([
  'primary',
  'middle',
  'secondary',
  'higher_secondary',
  'school',
  'k12',
  'class-1-5',
  'class-6-10',
  'class-11-12',
]);

function isFilled(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return Boolean(val);
}

/**
 * Single Canonical Source of Truth for Profile Completion in the Client.
 * Exactly matches backend ProfileCompletionService.
 */
export function resolveProfileCompletion(profile: ProfileCompletionData): ProfileCompletionDetails {
  const category = (profile.education_category || '').trim().toLowerCase();
  const level = (profile.education_level || '').trim().toLowerCase();
  const effectiveCategory = category || level;

  const isHigherEd = HIGHER_ED_CATEGORIES.has(effectiveCategory) || HIGHER_ED_CATEGORIES.has(level);
  const isSchool = SCHOOL_CATEGORIES.has(effectiveCategory) || SCHOOL_CATEGORIES.has(level);

  const requiredFields: string[] = [];
  const completedFields: string[] = [];

  if (isHigherEd) {
    // Higher Ed: name, academic level, degree/program, department/major, year/semester
    // Specialization, institution, interests are explicitly OPTIONAL.
    requiredFields.push('full_name', 'academic_level', 'degree_program', 'department', 'academic_year');

    if (isFilled(profile.full_name)) completedFields.push('full_name');
    if (isFilled(profile.education_level) || isFilled(profile.education_category)) completedFields.push('academic_level');
    if (isFilled(profile.degree) || isFilled(profile.program)) completedFields.push('degree_program');
    if (isFilled(profile.department) || isFilled(profile.stream)) completedFields.push('department');
    if (isFilled(profile.academic_year) || isFilled(profile.grade_level)) completedFields.push('academic_year');
  } else if (isSchool) {
    // School: name, academic level, grade, board (+ state if state board)
    // University-only fields (degree, department, specialization) NOT required.
    requiredFields.push('full_name', 'academic_level', 'grade_level', 'board');

    const isStateBoard =
      (profile.board_type || '').toLowerCase() === 'state' ||
      (profile.curriculum_id && profile.curriculum_id.toLowerCase().includes('state'));

    if (isStateBoard) {
      requiredFields.push('state_region');
    }

    if (isFilled(profile.full_name)) completedFields.push('full_name');
    if (isFilled(profile.education_level) || isFilled(profile.education_category)) completedFields.push('academic_level');
    if (isFilled(profile.grade_level)) completedFields.push('grade_level');
    if (isFilled(profile.curriculum_id) || isFilled(profile.board_type)) completedFields.push('board');
    if (isStateBoard && isFilled(profile.state_region)) completedFields.push('state_region');
  } else {
    // Initial/Baseline profile
    requiredFields.push('full_name', 'academic_level', 'grade_or_year', 'board_or_program');

    if (isFilled(profile.full_name)) completedFields.push('full_name');
    if (isFilled(profile.education_level) || isFilled(profile.education_category)) completedFields.push('academic_level');
    if (isFilled(profile.grade_level) || isFilled(profile.academic_year)) completedFields.push('grade_or_year');
    if (isFilled(profile.curriculum_id) || isFilled(profile.degree) || isFilled(profile.department)) completedFields.push('board_or_program');
  }

  const missingFields = requiredFields.filter((f) => !completedFields.includes(f));
  const score = requiredFields.length > 0 ? Math.round((completedFields.length / requiredFields.length) * 100) : 100;
  const isComplete = missingFields.length === 0;

  return {
    score,
    completion_percentage: score,
    is_complete: isComplete,
    required_fields: requiredFields,
    completed_fields: completedFields,
    missing_fields: missingFields,
  };
}
