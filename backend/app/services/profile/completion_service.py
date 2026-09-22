from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class ProfileCompletionResult(BaseModel):
    """Canonical profile completion calculation schema."""
    score: int = Field(..., description="Completion percentage 0-100")
    completion_percentage: int = Field(..., description="Alias for score")
    is_complete: bool = Field(..., description="True if all required fields are satisfied")
    required_fields: List[str] = Field(default_factory=list, description="Fields required for the user's academic stage")
    completed_fields: List[str] = Field(default_factory=list, description="Fields currently completed")
    missing_fields: List[str] = Field(default_factory=list, description="Fields still requiring input")


class ProfileCompletionService:
    """
    Single Source of Truth for Student Profile Completeness Resolution.
    Evaluates required fields deterministically based on academic level/category.
    Ensures Home, Profile, and API endpoints consume identical results.
    """

    HIGHER_ED_CATEGORIES = {
        "undergraduate",
        "postgraduate",
        "research",
        "higher_ed",
        "university",
        "college",
    }

    SCHOOL_CATEGORIES = {
        "primary",
        "middle",
        "secondary",
        "higher_secondary",
        "school",
        "k12",
        "class-1-5",
        "class-6-10",
        "class-11-12",
    }

    @staticmethod
    def _is_filled(val: Any) -> bool:
        if val is None:
            return False
        if isinstance(val, str):
            return bool(val.strip())
        if isinstance(val, (list, dict)):
            return len(val) > 0
        return bool(val)

    @classmethod
    def calculate_completion(cls, profile: Any) -> ProfileCompletionResult:
        """
        Calculates canonical profile completion for a UserProfile model instance or dict.
        """
        def get_field(name: str) -> Any:
            if isinstance(profile, dict):
                return profile.get(name)
            return getattr(profile, name, None)

        full_name = get_field("full_name")
        education_level = (get_field("education_level") or "").strip().lower()
        education_category = (get_field("education_category") or "").strip().lower()
        effective_category = education_category or education_level

        grade_level = get_field("grade_level")
        curriculum_id = get_field("curriculum_id")
        board_type = (get_field("board_type") or "").strip().lower()
        state_region = get_field("state_region")

        degree = get_field("degree")
        department = get_field("department")
        program = get_field("program")
        stream = get_field("stream")
        academic_year = get_field("academic_year")

        required_fields: List[str] = []
        completed_fields: List[str] = []

        is_higher_ed = (
            effective_category in cls.HIGHER_ED_CATEGORIES
            or education_level in cls.HIGHER_ED_CATEGORIES
        )
        is_school = (
            effective_category in cls.SCHOOL_CATEGORIES
            or education_level in cls.SCHOOL_CATEGORIES
        )

        if is_higher_ed:
            # HIGHER EDUCATION REQUIREMENTS
            # Required: name, academic level, degree/program, department/major, year/semester
            # Specialization, institution, interests are OPTIONAL.
            required_fields = [
                "full_name",
                "academic_level",
                "degree_program",
                "department",
                "academic_year",
            ]

            if cls._is_filled(full_name):
                completed_fields.append("full_name")
            if cls._is_filled(education_level) or cls._is_filled(education_category):
                completed_fields.append("academic_level")
            if cls._is_filled(degree) or cls._is_filled(program):
                completed_fields.append("degree_program")
            if cls._is_filled(department) or cls._is_filled(stream):
                completed_fields.append("department")
            if cls._is_filled(academic_year) or cls._is_filled(grade_level):
                completed_fields.append("academic_year")

        elif is_school:
            # SCHOOL REQUIREMENTS
            # Required: name, academic level, grade, board (+ state if state board)
            # Irrelevant higher-ed fields (degree, department, specialization) NOT required.
            required_fields = [
                "full_name",
                "academic_level",
                "grade_level",
                "board",
            ]

            is_state_board = (
                board_type == "state"
                or (curriculum_id and "state" in str(curriculum_id).lower())
            )
            if is_state_board:
                required_fields.append("state_region")

            if cls._is_filled(full_name):
                completed_fields.append("full_name")
            if cls._is_filled(education_level) or cls._is_filled(education_category):
                completed_fields.append("academic_level")
            if cls._is_filled(grade_level):
                completed_fields.append("grade_level")
            if cls._is_filled(curriculum_id) or cls._is_filled(board_type):
                completed_fields.append("board")
            if is_state_board and cls._is_filled(state_region):
                completed_fields.append("state_region")

        else:
            # Baseline / Unconfigured profile
            required_fields = [
                "full_name",
                "academic_level",
                "grade_or_year",
                "board_or_program",
            ]
            if cls._is_filled(full_name):
                completed_fields.append("full_name")
            if cls._is_filled(education_level) or cls._is_filled(education_category):
                completed_fields.append("academic_level")
            if cls._is_filled(grade_level) or cls._is_filled(academic_year):
                completed_fields.append("grade_or_year")
            if cls._is_filled(curriculum_id) or cls._is_filled(degree) or cls._is_filled(department):
                completed_fields.append("board_or_program")

        missing_fields = [f for f in required_fields if f not in completed_fields]
        score = int((len(completed_fields) / len(required_fields)) * 100) if required_fields else 100
        is_complete = len(missing_fields) == 0

        return ProfileCompletionResult(
            score=score,
            completion_percentage=score,
            is_complete=is_complete,
            required_fields=required_fields,
            completed_fields=completed_fields,
            missing_fields=missing_fields,
        )
