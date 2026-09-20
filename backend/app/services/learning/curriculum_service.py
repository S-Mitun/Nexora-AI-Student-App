from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import or_
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson, Curriculum
from app.core.logging import logger


class CurriculumService:
    """
    Curriculum Data Access & Navigation Service.
    Provides eager-loaded, N+1 safe queries for the 5-tier academic hierarchy:
    Subject -> Topic -> Concept -> LearningModule -> Lesson.
    """

    @staticmethod
    def get_subjects(
        db: Session,
        active_only: bool = True,
        curriculum_id: Optional[str] = None,
        education_level: Optional[str] = None,
    ) -> List[Subject]:
        """Returns all subjects ordered by order_index with eager-loaded topics."""
        query = db.query(Subject).options(
            joinedload(Subject.curriculum),
            selectinload(Subject.topics).selectinload(Topic.concepts)
        )
        if active_only:
            query = query.filter(Subject.is_active == True)
        if curriculum_id:
            query = query.filter(Subject.curriculum_id == curriculum_id)
        if education_level:
            lvl = education_level.strip().lower()
            norm = lvl.replace("-", " ").replace("–", " ").replace("_", " ")
            if any(k in norm for k in ["primary", "class 1 5", "1 5", "k 5", "elementary"]):
                query = query.filter(Subject.education_level.in_(["primary", "class-1-5", "Primary (Class 1-5)"]))
            elif any(k in norm for k in ["higher secondary", "class 11 12", "11 12", "senior secondary"]):
                query = query.filter(Subject.education_level.in_(["higher_secondary", "class-11-12", "Higher Secondary (Class 11-12)"]))
            elif any(k in norm for k in ["secondary", "class 6 10", "6 10", "middle", "6 to 10"]):
                query = query.filter(Subject.education_level.in_(["secondary", "class-6-10", "Secondary (Class 6-10)"]))
            elif any(k in norm for k in ["undergraduate", "university", "college", "ug", "b.tech", "btech", "b.e", "b.sc", "higher education"]):
                query = query.filter(Subject.education_level.in_(["undergraduate", "higher education / university", "Higher Education / University"]))
            elif any(k in norm for k in ["postgraduate", "research", "pg", "master", "phd"]):
                query = query.filter(Subject.education_level.in_(["postgraduate", "research", "Higher Education / University"]))
            else:
                query = query.filter(Subject.education_level.ilike(f"%{education_level}%"))
        return query.order_by(Subject.order_index.asc(), Subject.name.asc()).all()

    @staticmethod
    def get_subject(db: Session, identifier: str) -> Optional[Subject]:
        """Looks up a subject by UUID id or unique slug."""
        return (
            db.query(Subject)
            .options(
                selectinload(Subject.topics)
                .selectinload(Topic.concepts)
                .selectinload(Concept.learning_modules)
            )
            .filter(or_(Subject.id == identifier, Subject.slug == identifier))
            .first()
        )

    @staticmethod
    def get_topics_for_subject(db: Session, subject_identifier: str) -> List[Topic]:
        """Returns all topics for a given subject identifier (id or slug)."""
        subject = CurriculumService.get_subject(db, subject_identifier)
        if not subject:
            return []
        return (
            db.query(Topic)
            .options(selectinload(Topic.concepts))
            .filter(Topic.subject_id == subject.id, Topic.is_active == True)
            .order_by(Topic.order_index.asc())
            .all()
        )

    @staticmethod
    def get_topic(db: Session, identifier: str) -> Optional[Topic]:
        """Looks up a topic by UUID id or slug."""
        return (
            db.query(Topic)
            .options(
                joinedload(Topic.subject),
                selectinload(Topic.concepts).selectinload(Concept.learning_modules),
            )
            .filter(or_(Topic.id == identifier, Topic.slug == identifier))
            .first()
        )

    @staticmethod
    def get_concepts_for_topic(db: Session, topic_identifier: str) -> List[Concept]:
        """Returns all concepts for a given topic identifier."""
        topic = CurriculumService.get_topic(db, topic_identifier)
        if not topic:
            return []
        return (
            db.query(Concept)
            .options(selectinload(Concept.learning_modules))
            .filter(Concept.topic_id == topic.id, Concept.is_active == True)
            .order_by(Concept.order_index.asc())
            .all()
        )

    @staticmethod
    def get_concept(db: Session, identifier: str) -> Optional[Concept]:
        """Looks up a concept by UUID id or unique slug."""
        return (
            db.query(Concept)
            .options(
                joinedload(Concept.topic).joinedload(Topic.subject),
                selectinload(Concept.learning_modules).selectinload(LearningModule.lessons),
            )
            .filter(or_(Concept.id == identifier, Concept.slug == identifier))
            .first()
        )

    @staticmethod
    def get_modules_for_concept(db: Session, concept_identifier: str) -> List[LearningModule]:
        """Returns all learning modules for a given concept identifier."""
        concept = CurriculumService.get_concept(db, concept_identifier)
        if not concept:
            return []
        return (
            db.query(LearningModule)
            .options(selectinload(LearningModule.lessons))
            .filter(LearningModule.concept_id == concept.id, LearningModule.is_active == True)
            .order_by(LearningModule.order_index.asc())
            .all()
        )

    @staticmethod
    def get_module(db: Session, identifier: str) -> Optional[LearningModule]:
        """Looks up a learning module by UUID id or slug."""
        return (
            db.query(LearningModule)
            .options(
                joinedload(LearningModule.concept).joinedload(Concept.topic).joinedload(Topic.subject),
                selectinload(LearningModule.lessons),
            )
            .filter(or_(LearningModule.id == identifier, LearningModule.slug == identifier))
            .first()
        )

    @staticmethod
    def get_lessons_for_module(db: Session, module_identifier: str) -> List[Lesson]:
        """Returns all lessons for a given module identifier."""
        module = CurriculumService.get_module(db, module_identifier)
        if not module:
            return []
        return (
            db.query(Lesson)
            .filter(Lesson.module_id == module.id, Lesson.is_active == True)
            .order_by(Lesson.order_index.asc())
            .all()
        )

    @staticmethod
    def get_lesson(db: Session, identifier: str) -> Optional[Tuple[Lesson, Optional[Lesson], Optional[Lesson]]]:
        """
        Looks up a lesson by UUID id or slug.
        Returns a tuple of (current_lesson, previous_lesson, next_lesson) within the same module.
        """
        lesson = (
            db.query(Lesson)
            .options(
                joinedload(Lesson.learning_module)
                .joinedload(LearningModule.concept)
                .joinedload(Concept.topic)
                .joinedload(Topic.subject)
            )
            .filter(or_(Lesson.id == identifier, Lesson.slug == identifier))
            .first()
        )
        if not lesson:
            return None

        # Fetch sibling lessons for navigation
        all_module_lessons = (
            db.query(Lesson)
            .filter(Lesson.module_id == lesson.module_id, Lesson.is_active == True)
            .order_by(Lesson.order_index.asc())
            .all()
        )

        prev_lesson = None
        next_lesson = None
        for idx, item in enumerate(all_module_lessons):
            if item.id == lesson.id:
                if idx > 0:
                    prev_lesson = all_module_lessons[idx - 1]
                if idx < len(all_module_lessons) - 1:
                    next_lesson = all_module_lessons[idx + 1]
                break

        return lesson, prev_lesson, next_lesson


class CurriculumSeedService:
    """
    Idempotently seeds initial academic starter curriculum if subjects table is empty.
    Ensures seamless execution across both local SQLite dev/test and remote Supabase PostgreSQL.
    """

    @staticmethod
    def seed_if_empty(db: Session) -> bool:
        # Seed standard curricula if empty
        if db.query(Curriculum).count() == 0:
            logger.info("Curricula table is empty. Seeding standard academic boards & curricula...")
            curricula = [
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000001",
                    code="cbse-primary",
                    name="CBSE Primary (Classes 1–5)",
                    board_authority="Central Board of Secondary Education",
                    education_level="class-1-5",
                    country="India",
                    description="Foundational literacy, numeracy, environmental studies, and basic sciences.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000002",
                    code="cbse-secondary",
                    name="CBSE Secondary (Classes 6–10)",
                    board_authority="Central Board of Secondary Education",
                    education_level="class-6-10",
                    country="India",
                    description="Standard secondary curriculum covering General Science, Mathematics, and Social Science.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000003",
                    code="cbse-higher-sec",
                    name="CBSE Higher Secondary (Classes 11–12)",
                    board_authority="Central Board of Secondary Education",
                    education_level="class-11-12",
                    country="India",
                    description="Specialized streams: Physics, Chemistry, Mathematics, Biology, Computer Science, and Commerce.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000004",
                    code="icse-secondary",
                    name="ICSE Secondary (Classes 6–10)",
                    board_authority="Council for the Indian School Certificate Examinations",
                    education_level="class-6-10",
                    country="India",
                    description="Comprehensive science, mathematics, and humanities curriculum.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000005",
                    code="tn-state-board",
                    name="Tamil Nadu State Board (Classes 6–10)",
                    board_authority="Tamil Nadu State Board of School Examination",
                    education_level="class-6-10",
                    country="India",
                    description="State board bilingual science, mathematics, and social studies curriculum.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000006",
                    code="univ-eng-cse",
                    name="University Engineering (Computer Science & IT)",
                    board_authority="Autonomous & Affiliated Engineering Colleges",
                    education_level="undergraduate",
                    country="India",
                    description="Undergraduate engineering core: algorithms, operating systems, databases, and networks.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000007",
                    code="univ-sciences",
                    name="University Natural Sciences (B.Sc)",
                    board_authority="Collegiate & Central Universities",
                    education_level="undergraduate",
                    country="India",
                    description="Undergraduate physics, chemistry, biology, and applied mathematics.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000008",
                    code="postgrad-advanced",
                    name="Postgraduate & Research Sciences",
                    board_authority="Research Institutes & Universities",
                    education_level="research",
                    country="India",
                    description="Advanced graduate research, machine learning, quantum physics, and experimental labs.",
                    is_active=True,
                ),
                Curriculum(
                    id="cur-00000000-0000-0000-0000-000000000009",
                    code="custom-independent",
                    name="Independent & Self-Directed Study",
                    board_authority="Independent Learner",
                    education_level="custom",
                    country="Global",
                    description="Student-curated academic study driven directly by uploaded textbooks and papers.",
                    is_active=True,
                ),
            ]
            for c in curricula:
                db.add(c)
            db.commit()

        # 1. Update any existing legacy subjects so CSE starter subjects are strictly marked "undergraduate"
        legacy_cs_slugs = [
            "computer-science", "data-structures-algorithms", "operating-systems",
            "database-management-systems", "computer-networks", "artificial-intelligence-machine-learning"
        ]
        for slug in legacy_cs_slugs:
            existing = db.query(Subject).filter(Subject.slug == slug).first()
            if existing and existing.education_level != "undergraduate":
                existing.education_level = "undergraduate"
                existing.is_system = True
                existing.academic_domain = "Computer Science & Engineering"

        # Update physics to higher secondary if currently all-levels
        phys = db.query(Subject).filter(Subject.slug == "physics").first()
        if phys and phys.education_level == "all-levels":
            phys.education_level = "class-11-12"
            phys.academic_domain = "Natural Sciences"

        db.commit()

        def get_or_create_subject(sub: Subject) -> Subject:
            existing = db.query(Subject).filter((Subject.id == sub.id) | (Subject.slug == sub.slug)).first()
            if existing:
                existing.education_level = sub.education_level
                existing.academic_domain = sub.academic_domain
                existing.is_system = sub.is_system
                existing.category = sub.category
                existing.name = sub.name
                existing.description = sub.description
                existing.icon = sub.icon
                if sub.curriculum_id:
                    existing.curriculum_id = sub.curriculum_id
                return existing
            db.add(sub)
            db.flush()
            return sub

        def get_or_create_topic(top: Topic) -> Topic:
            existing = db.query(Topic).filter((Topic.id == top.id) | (Topic.slug == top.slug)).first()
            if existing:
                return existing
            db.add(top)
            db.flush()
            return top

        def get_or_create_concept(con: Concept) -> Concept:
            existing = db.query(Concept).filter((Concept.id == con.id) | (Concept.slug == con.slug)).first()
            if existing:
                return existing
            db.add(con)
            db.flush()
            return con

        def get_or_create_module(mod: LearningModule) -> LearningModule:
            existing = db.query(LearningModule).filter((LearningModule.id == mod.id) | (LearningModule.slug == mod.slug)).first()
            if existing:
                return existing
            db.add(mod)
            db.flush()
            return mod

        def get_or_create_lesson(les: Lesson) -> Lesson:
            existing = db.query(Lesson).filter((Lesson.id == les.id) | (Lesson.slug == les.slug)).first()
            if existing:
                return existing
            db.add(les)
            db.flush()
            return les

        logger.info("Seeding / updating curriculum subjects across all education levels...")
        try:
            # Undergraduate CSE Subjects
            sub_cs = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000000",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Computer Science Foundations",
                slug="computer-science",
                description="Core computation theory, discrete structures, and systems engineering.",
                icon="Cpu",
                category="Computer Science & Engineering",
                difficulty_level="all-levels",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=0,
                is_active=True,
            ))
            sub_dsa = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000001",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Data Structures & Algorithms",
                slug="data-structures-algorithms",
                description="Master asymptotic analysis, memory contiguity, tree traversals, and dynamic graph algorithms.",
                icon="Cpu",
                category="Computer Science & Engineering",
                difficulty_level="all-levels",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=1,
                is_active=True,
            ))
            sub_os = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000002",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Operating Systems",
                slug="operating-systems",
                description="Processes, CPU scheduling algorithms, virtual memory paging, and concurrency primitives.",
                icon="FolderKanban",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=2,
                is_active=True,
            ))
            sub_dbms = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000003",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Database Management Systems",
                slug="database-management-systems",
                description="Relational algebra, ACID transactions, B-Tree indexes, and normal forms.",
                icon="Binary",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=3,
                is_active=True,
            ))
            sub_cn = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000004",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Computer Networks",
                slug="computer-networks",
                description="The OSI stack, TCP congestion control, IP subnetting, and socket architectures.",
                icon="Zap",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=4,
                is_active=True,
            ))
            sub_ai = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000005",
                curriculum_id="cur-00000000-0000-0000-0000-000000000006",
                name="Artificial Intelligence & Machine Learning",
                slug="artificial-intelligence-machine-learning",
                description="Gradient descent, neural network architectures, loss landscapes, and model evaluation.",
                icon="Sparkles",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                education_level="undergraduate",
                academic_domain="Computer Science & Engineering",
                is_system=True,
                order_index=5,
                is_active=True,
            ))

            # Senior Secondary (Class 11-12)
            sub_physics = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000006",
                curriculum_id="cur-00000000-0000-0000-0000-000000000003",
                name="Physics",
                slug="physics",
                description="Wave mechanics, kinematics, Doppler shifts, electromagnetism, and orbital dynamics.",
                icon="Zap",
                category="Natural Sciences",
                difficulty_level="advanced",
                education_level="class-11-12",
                academic_domain="Natural Sciences",
                is_system=True,
                order_index=6,
                is_active=True,
            ))
            sub_hs_chemistry = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000014",
                curriculum_id="cur-00000000-0000-0000-0000-000000000003",
                name="Higher Secondary Chemistry",
                slug="cbse-hs-chemistry",
                description="Organic, Inorganic, and Physical Chemistry for Senior Secondary.",
                icon="FlaskConical",
                category="Natural Sciences",
                difficulty_level="advanced",
                education_level="class-11-12",
                academic_domain="Chemistry",
                is_system=True,
                order_index=11,
                is_active=True,
            ))
            sub_hs_biology = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000015",
                curriculum_id="cur-00000000-0000-0000-0000-000000000003",
                name="Higher Secondary Biology",
                slug="cbse-hs-biology",
                description="Cell biology, genetics, human physiology, and ecology.",
                icon="Dna",
                category="Natural Sciences",
                difficulty_level="advanced",
                education_level="class-11-12",
                academic_domain="Biology",
                is_system=True,
                order_index=12,
                is_active=True,
            ))

            # Secondary K-12 Subjects (CBSE Classes 6-10)
            sub_sec_science = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000010",
                curriculum_id="cur-00000000-0000-0000-0000-000000000002",
                name="General Science",
                slug="cbse-sec-science",
                description="Foundational Physics, Chemistry, and Life Sciences for secondary school education.",
                icon="FlaskConical",
                category="Natural Sciences",
                difficulty_level="intermediate",
                education_level="class-6-10",
                academic_domain="General Science",
                is_system=True,
                order_index=7,
                is_active=True,
            ))
            sub_sec_math = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000011",
                curriculum_id="cur-00000000-0000-0000-0000-000000000002",
                name="Secondary Mathematics",
                slug="cbse-sec-mathematics",
                description="Algebra, Geometry, Trigonometry, Statistics and Number Systems.",
                icon="Binary",
                category="Mathematics",
                difficulty_level="intermediate",
                education_level="class-6-10",
                academic_domain="Mathematics",
                is_system=True,
                order_index=8,
                is_active=True,
            ))
            sub_sec_social = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000012",
                curriculum_id="cur-00000000-0000-0000-0000-000000000002",
                name="Social Science",
                slug="cbse-sec-social-science",
                description="History, Democratic Politics, Geography, and Economic Development.",
                icon="Globe",
                category="Humanities",
                difficulty_level="beginner",
                education_level="class-6-10",
                academic_domain="Social Science",
                is_system=True,
                order_index=9,
                is_active=True,
            ))
            sub_sec_english = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000013",
                curriculum_id="cur-00000000-0000-0000-0000-000000000002",
                name="English Language & Literature",
                slug="cbse-sec-english",
                description="Reading comprehension, writing skills, grammar, and literature studies.",
                icon="BookOpen",
                category="Languages",
                difficulty_level="beginner",
                education_level="class-6-10",
                academic_domain="Languages",
                is_system=True,
                order_index=10,
                is_active=True,
            ))

            # Primary K-5 Subjects (CBSE Classes 1-5)
            sub_prim_evs = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000030",
                curriculum_id="cur-00000000-0000-0000-0000-000000000001",
                name="Environmental Studies (EVS)",
                slug="cbse-prim-evs",
                description="Living things, our natural surroundings, plants, animals, and conservation.",
                icon="Leaf",
                category="General Science",
                difficulty_level="beginner",
                education_level="primary",
                academic_domain="Environmental Studies",
                is_system=True,
                order_index=13,
                is_active=True,
            ))
            sub_prim_math = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000031",
                curriculum_id="cur-00000000-0000-0000-0000-000000000001",
                name="Primary Mathematics",
                slug="cbse-prim-mathematics",
                description="Counting, addition, subtraction, basic shapes, money, and measurement.",
                icon="Binary",
                category="Mathematics",
                difficulty_level="beginner",
                education_level="primary",
                academic_domain="Mathematics",
                is_system=True,
                order_index=14,
                is_active=True,
            ))
            sub_prim_english = get_or_create_subject(Subject(
                id="sub-00000000-0000-0000-0000-000000000032",
                curriculum_id="cur-00000000-0000-0000-0000-000000000001",
                name="Primary English",
                slug="cbse-prim-english",
                description="Letters, phonics, everyday vocabulary, simple stories, and sentence building.",
                icon="BookOpen",
                category="Languages",
                difficulty_level="beginner",
                education_level="primary",
                academic_domain="Languages",
                is_system=True,
                order_index=15,
                is_active=True,
            ))

            # Foundational Topic and Concept for Secondary Science
            top_force = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000020",
                subject_id=sub_sec_science.id,
                name="Force & Pressure",
                slug="force-pressure",
                description="Explores push and pull dynamics, contact vs non-contact forces, and pressure exerted by fluids.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000020",
                topic_id=top_force.id,
                name="Force and Pressure Dynamics",
                slug="force-pressure-dynamics",
                summary="A force is an interaction that causes a change in an object's state of motion, shape, or direction. Pressure measures force applied per unit area ($P = F / A$). Newton's second law states that the net force equals mass times acceleration: $F = ma$.",
                short_description="Definition, units (Newton, Pascal), contact forces, and fluid pressure.",
                difficulty="beginner",
                difficulty_level="beginner",
                order_index=1,
                is_active=True,
                has_simulation=True,
                has_visualization=True,
                has_practice=True,
                has_mindmap=True,
                learning_modes=["learn", "ask", "practice", "notes"],
            ))

            # Foundational Topic and Concept for Secondary Math
            top_sec_math = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000021",
                subject_id=sub_sec_math.id,
                name="Algebra & Linear Equations",
                slug="algebra-linear-equations",
                description="Variables, linear equations in one and two variables, and coordinate lines.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000021",
                topic_id=top_sec_math.id,
                name="Linear Equations and Slope",
                slug="linear-equations-slope",
                summary="A linear equation in standard form is $ax + by = c$. In slope-intercept form, it is written as $y = mx + c$, where $m = \\frac{\\Delta y}{\\Delta x}$ is the slope and $c$ is the y-intercept. For a right-angled triangle, the Pythagorean theorem states $a^2 + b^2 = c^2$.",
                short_description="Linear equations in two variables, slope calculation, and coordinate geometry.",
                difficulty="intermediate",
                difficulty_level="intermediate",
                order_index=1,
                is_active=True,
                has_simulation=True,
                has_visualization=True,
                has_practice=True,
                has_mindmap=True,
                learning_modes=["learn", "ask", "practice", "notes"],
            ))

            # Foundational Topic and Concept for Primary Math
            top_prim_math = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000031",
                subject_id=sub_prim_math.id,
                name="Numbers & Basic Arithmetic",
                slug="numbers-basic-arithmetic",
                description="Introduction to numbers, counting, and simple addition and subtraction.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000031",
                topic_id=top_prim_math.id,
                name="Addition and Subtraction",
                slug="addition-and-subtraction",
                summary="Addition combines two groups of items into a single total. For example: $3 + 4 = 7$. Subtraction is taking away items to find what remains: $10 - 4 = 6$.",
                short_description="Foundational arithmetic operations, combining numbers, and difference calculations.",
                difficulty="beginner",
                difficulty_level="beginner",
                order_index=1,
                is_active=True,
                has_simulation=False,
                has_visualization=True,
                has_practice=True,
                has_mindmap=True,
                learning_modes=["learn", "ask", "practice", "notes"],
            ))

            # Foundational Topic and Concept for Primary EVS
            top_prim_evs = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000030",
                subject_id=sub_prim_evs.id,
                name="Plants & Environment",
                slug="plants-environment",
                description="Understanding plants, living organisms, and our natural surroundings.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000030",
                topic_id=top_prim_evs.id,
                name="Living and Non-Living Things",
                slug="living-and-non-living-things",
                summary="Living things breathe, grow, eat, and reproduce. Plants use sunlight, water ($H_2O$), and air ($CO_2$) to make food. Non-living things do not grow or move on their own.",
                short_description="Characteristics of living organisms and the environment.",
                difficulty="beginner",
                difficulty_level="beginner",
                order_index=1,
                is_active=True,
                has_simulation=False,
                has_visualization=True,
                has_practice=True,
                has_mindmap=True,
                learning_modes=["learn", "ask", "practice", "notes"],
            ))

            # Topics for DSA
            top_arr = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000001",
                subject_id=sub_dsa.id,
                name="Arrays & Search",
                slug="arrays-search",
                description="Contiguous memory layout, cache locality, and logarithmic search patterns.",
                order_index=1,
                is_active=True,
            ))
            top_ll = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000002",
                subject_id=sub_dsa.id,
                name="Linked Lists",
                slug="linked-lists",
                description="Non-contiguous pointer nodes, pointer manipulation, and cycle detection.",
                order_index=2,
                is_active=True,
            ))
            top_tree = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000003",
                subject_id=sub_dsa.id,
                name="Trees & Hierarchies",
                slug="trees-hierarchies",
                description="Binary trees, balanced search trees, heaps, and recursive traversals.",
                order_index=3,
                is_active=True,
            ))
            top_graph = get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000004",
                subject_id=sub_dsa.id,
                name="Graphs & Networks",
                slug="graphs-networks",
                description="Adjacency structures, topological ordering, shortest paths, and spanning trees.",
                order_index=4,
                is_active=True,
            ))

            # Topics for OS
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000005",
                subject_id=sub_os.id,
                name="Processes & Threads",
                slug="processes-threads",
                description="Address spaces, PCB structures, context switching, and POSIX threads.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000006",
                subject_id=sub_os.id,
                name="CPU Scheduling",
                slug="cpu-scheduling",
                description="Preemptive vs non-preemptive schedulers, Round Robin, and Multi-Level Feedback Queues.",
                order_index=2,
                is_active=True,
            ))
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000007",
                subject_id=sub_os.id,
                name="Memory Management",
                slug="memory-management",
                description="Paging, TLB caches, page faults, and virtual address translation.",
                order_index=3,
                is_active=True,
            ))

            # Topics for DBMS
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000008",
                subject_id=sub_dbms.id,
                name="Relational Model & SQL",
                slug="relational-model-sql",
                description="Relational schemas, foreign keys, declarative querying, and joins.",
                order_index=1,
                is_active=True,
            ))
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000009",
                subject_id=sub_dbms.id,
                name="Normalization & Design",
                slug="normalization-design",
                description="Functional dependencies, 1NF through BCNF, and lossless decomposition.",
                order_index=2,
                is_active=True,
            ))
            get_or_create_topic(Topic(
                id="top-00000000-0000-0000-0000-000000000010",
                subject_id=sub_dbms.id,
                name="Transactions & Concurrency",
                slug="transactions-concurrency",
                description="ACID properties, Write-Ahead Logging, and 2-Phase Locking.",
                order_index=3,
                is_active=True,
            ))

            # DSA Concepts
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000001",
                topic_id=top_arr.id,
                name="Binary Search",
                slug="binary-search",
                summary="A divide-and-conquer algorithm that finds the position of a target value within a sorted array in logarithmic time.",
                short_description="Logarithmic search dividing the search space in half each comparison step.",
                difficulty="intermediate",
                difficulty_level="intermediate",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000002",
                topic_id=top_arr.id,
                name="Two-Pointer Technique",
                slug="two-pointer-technique",
                summary="An algorithmic pattern using two pointers to scan an array from opposite ends or at differing speeds.",
                short_description="Efficient array scanning avoiding nested O(N^2) loops.",
                difficulty="intermediate",
                difficulty_level="intermediate",
                order_index=2,
                is_active=True,
            ))
            con_bst = get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000003",
                topic_id=top_tree.id,
                name="Binary Search Tree",
                slug="binary-search-tree",
                summary="A node-based binary tree data structure where each node has a key greater than all keys in its left subtree and less than those in its right.",
                short_description="Ordered binary tree enabling O(log N) average insertions, deletions, and lookups.",
                difficulty="intermediate",
                difficulty_level="intermediate",
                order_index=1,
                is_active=True,
            ))
            get_or_create_concept(Concept(
                id="con-00000000-0000-0000-0000-000000000004",
                topic_id=top_tree.id,
                name="Tree Traversals",
                slug="tree-traversals",
                summary="Systematic ways of visiting all nodes in a hierarchical tree: In-Order, Pre-Order, Post-Order, and Level-Order.",
                short_description="Systematic depth-first and breadth-first exploration patterns for tree nodes.",
                difficulty="beginner",
                difficulty_level="beginner",
                order_index=2,
                is_active=True,
            ))

            # Learning Module for BST
            mod_bst = get_or_create_module(LearningModule(
                id="mod-00000000-0000-0000-0000-000000000001",
                concept_id=con_bst.id,
                title="Foundations of Binary Search Trees",
                slug="bst-foundations",
                description="Understand the fundamental BST ordering invariant and how pointers maintain ordered hierarchies.",
                learning_objective="Understand how the BST invariant enables logarithmic search over dynamic data.",
                difficulty_level="intermediate",
                estimated_minutes=20,
                order_index=1,
                is_active=True,
                why_it_matters="Arrays provide fast binary search but slow O(N) insertions. Linked lists allow fast insertions but slow O(N) searches. Binary Search Trees combine the benefits of both, providing O(log N) search, insertion, and deletion.",
                simple_explanation="A Binary Search Tree is like an organized library where every book to your left has a smaller number, and every book to your right has a bigger number. You never have to search the whole room—you just pick left or right at each shelf.",
                technical_explanation="A Binary Search Tree (BST) is an asymmetric tree structure satisfying the BST invariant: for every node N with key K, all nodes in the left subtree have keys strictly less than K, and all nodes in the right subtree have keys strictly greater than K. Average-case time complexity for search, insert, and delete is O(h) where h is the tree height. For balanced trees, h = floor(log2 N).",
                visualization_type="interactive-tree",
                experiment_type="parameter-tuning",
                simulation_config={"root": 50, "default_values": [30, 70, 20, 40, 60, 80]},
                application_notes="Relational database indexes (B-Trees) and compiler symbol tables derive directly from hierarchical binary search tree principles.",
                prerequisites=["Pointers & Memory", "Recursion Basics"],
            ))

            # Lessons
            les_1 = get_or_create_lesson(Lesson(
                id="les-00000000-0000-0000-0000-000000000001",
                module_id=mod_bst.id,
                title="The BST Invariant & Structural Mechanics",
                slug="the-bst-invariant",
                content_type="explanation",
                content=(
                    "### What is the BST Invariant?\n\n"
                    "The defining characteristic of a Binary Search Tree is the **BST Invariant**:\n"
                    "- For any given node `X`, every key in its **left subtree** is strictly smaller than `X.key`.\n"
                    "- Every key in its **right subtree** is strictly greater than `X.key`.\n"
                    "- Both the left and right subtrees must also be valid binary search trees.\n\n"
                    "```\n"
                    "       50\n"
                    "     /    \\\n"
                    "   30      70\n"
                    "  /  \\    /  \\\n"
                    " 20  40  60  80\n"
                    "```\n\n"
                    "### Why Do We Need BSTs?\n"
                    "Consider the fundamental tradeoff in core data structures:\n"
                    "1. **Sorted Array**: Search is fast ($O(\\log N)$ via Binary Search), but insertion requires shifting memory, taking $O(N)$ time.\n"
                    "2. **Linked List**: Insertion at pointer is $O(1)$, but search requires linear traversal, taking $O(N)$ time.\n"
                    "3. **Binary Search Tree**: By combining pointer-based node allocation with hierarchical binary partitioning, both search and insertion achieve $O(\\log N)$ on average."
                ),
                order_index=1,
                estimated_minutes=7,
                is_active=True,
            ))
            les_2 = get_or_create_lesson(Lesson(
                id="les-00000000-0000-0000-0000-000000000002",
                module_id=mod_bst.id,
                title="Search & Insertion Walkthrough",
                slug="search-insertion-walkthrough",
                content_type="example",
                content=(
                    "### How BST Search Operates\n\n"
                    "When searching for key `target` starting from node `current`:\n"
                    "1. If `current == null`, the key does not exist in the tree.\n"
                    "2. If `target == current.key`, the search succeeds!\n"
                    "3. If `target < current.key`, recursively search `current.left`.\n"
                    "4. If `target > current.key`, recursively search `current.right`.\n\n"
                    "```python\n"
                    "def bst_search(node, target):\n"
                    "    if not node or node.key == target:\n"
                    "        return node\n"
                    "    if target < node.key:\n"
                    "        return bst_search(node.left, target)\n"
                    "    return bst_search(node.right, target)\n"
                    "```\n\n"
                    "### Worst-Case Degeneracy\n"
                    "If keys are inserted in strictly sorted order (e.g., `10, 20, 30, 40, 50`), each new node becomes a right child of the previous one. The tree degenerates into a singly linked list with height $O(N)$, causing search time to degrade to $O(N)$. This motivates self-balancing structures like AVL Trees and Red-Black Trees."
                ),
                order_index=2,
                estimated_minutes=8,
                is_active=True,
            ))
            les_3 = get_or_create_lesson(Lesson(
                id="les-00000000-0000-0000-0000-000000000003",
                module_id=mod_bst.id,
                title="Core Takeaways & Complexity Reference",
                slug="core-takeaways-complexity",
                content_type="key_points",
                content=(
                    "### Key Points to Remember\n\n"
                    "- **Search Time**: $O(\\log N)$ average, $O(N)$ worst-case (skewed).\n"
                    "- **Insertion Time**: $O(\\log N)$ average, $O(N)$ worst-case.\n"
                    "- **In-Order Traversal Property**: Performing an in-order traversal (Left $\\to$ Root $\\to$ Right) on any valid BST always yields keys in strictly sorted ascending order.\n"
                    "- **Space Complexity**: $O(N)$ total memory, plus $O(h)$ auxiliary stack frames during recursive operations.\n\n"
                    "### Practical Engineering Insight\n"
                    "In production systems, raw unbalanced BSTs are rarely used directly because real-world workloads often contain pre-sorted sequences. Instead, databases and runtime standard libraries employ balanced variants (B-Trees in PostgreSQL/SQLite, Red-Black Trees in C++ `std::map` and Java `TreeMap`)."
                ),
                order_index=3,
                estimated_minutes=5,
                is_active=True,
            ))

            # Seed Starter Practice Sets and Questions across Academic Levels
            from app.models.learning import PracticeSet, PracticeQuestion

            def seed_ps_if_missing(ps_obj, questions_data):
                existing_ps = db.query(PracticeSet).filter(PracticeSet.id == ps_obj.id).first()
                if not existing_ps:
                    db.add(ps_obj)
                    db.flush()
                    for idx, q_data in enumerate(questions_data):
                        q = PracticeQuestion(
                            id=f"{ps_obj.id}-q{idx+1}",
                            practice_set_id=ps_obj.id,
                            concept_id=ps_obj.concept_id,
                            lesson_id=ps_obj.lesson_id,
                            question_text=q_data["text"],
                            options=q_data["options"],
                            correct_index=q_data["correct"],
                            explanation=q_data["explanation"],
                            difficulty=q_data.get("difficulty", "intermediate"),
                            points=10,
                            order_index=idx + 1,
                        )
                        db.add(q)

            # 1. Class 6-10: Force & Pressure Dynamics
            seed_ps_if_missing(
                PracticeSet(
                    id="ps-00000000-0000-0000-0000-000000000001",
                    concept_id="con-00000000-0000-0000-0000-000000000020",
                    subject_id="sub-00000000-0000-0000-0000-000000000010",
                    academic_level="class_6_10",
                    title="Force, Acceleration & Pressure Practice Set",
                    description="Test your understanding of Newton's second law ($F = ma$) and hydraulic pressure ($P = F / A$).",
                    difficulty="intermediate",
                    questions_count=5,
                ),
                [
                    {
                        "text": "According to Newton's Second Law, what happens to acceleration ($a$) if net force ($F$) is tripled on a constant mass ($m$)?",
                        "options": ["Acceleration triples ($a = 3 \\cdot \\frac{F}{m}$)", "Acceleration decreases by 3x", "Acceleration remains identical", "Acceleration increases ninefold"],
                        "correct": 0,
                        "explanation": "Newton's second law states $F = ma$, meaning $a = \\frac{F}{m}$. When mass is constant, acceleration is directly proportional to net force.",
                    },
                    {
                        "text": "What is the SI unit of pressure ($P = \\frac{F}{A}$)?",
                        "options": ["Pascal ($N/m^2$)", "Joule ($N \\cdot m$)", "Watt ($J/s$)", "Newton ($kg \\cdot m/s^2$)"],
                        "correct": 0,
                        "explanation": "Pressure is force per unit area. One Pascal equals one Newton per square meter ($1\\text{ Pa} = 1\\text{ N/m}^2$).",
                    },
                    {
                        "text": "Why do sharp knives cut vegetables more effectively than dull knives?",
                        "options": ["Smaller contact area creates vastly higher pressure for the same applied force", "Sharp knives produce greater friction", "Sharp knives have larger mass", "Dull knives defy Newton's laws"],
                        "correct": 0,
                        "explanation": "Because $P = \\frac{F}{A}$, decreasing edge surface area $A$ concentrates force into tremendous pressure $P$.",
                    },
                ],
            )

            # 2. Class 1-5: Primary Addition
            seed_ps_if_missing(
                PracticeSet(
                    id="ps-00000000-0000-0000-0000-000000000002",
                    concept_id="con-00000000-0000-0000-0000-000000000031",
                    subject_id="sub-00000000-0000-0000-0000-000000000031",
                    academic_level="class_1_5",
                    title="Basic Addition and Subtraction Practice",
                    description="Fun foundational arithmetic with visual examples.",
                    difficulty="beginner",
                    questions_count=3,
                ),
                [
                    {
                        "text": "If Maya has 4 green apples and picks 3 more, how many apples does she have in total?",
                        "options": ["7 apples ($4 + 3 = 7$)", "6 apples", "8 apples", "1 apple"],
                        "correct": 0,
                        "explanation": "Addition brings quantities together: $4 + 3 = 7$.",
                    },
                    {
                        "text": "Rohan had 10 color pencils. He gave 4 pencils to his sister. How many pencils are left?",
                        "options": ["6 pencils ($10 - 4 = 6$)", "7 pencils", "5 pencils", "14 pencils"],
                        "correct": 0,
                        "explanation": "Subtraction takes away items: $10 - 4 = 6$.",
                    },
                ],
            )

            # 3. Undergraduate: Binary Search Trees
            seed_ps_if_missing(
                PracticeSet(
                    id="ps-00000000-0000-0000-0000-000000000003",
                    concept_id="con-00000000-0000-0000-0000-000000000003",
                    subject_id="sub-00000000-0000-0000-0000-000000000001",
                    academic_level="undergraduate",
                    title="Binary Search Tree Invariants & In-Order Traversal",
                    description="Rigorous algorithmic analysis of tree bounds and traversal properties.",
                    difficulty="intermediate",
                    questions_count=4,
                ),
                [
                    {
                        "text": "What traversal order on a valid Binary Search Tree always outputs keys in strictly sorted ascending order?",
                        "options": ["In-order traversal (Left, Root, Right)", "Pre-order traversal (Root, Left, Right)", "Post-order traversal (Left, Right, Root)", "Level-order traversal (Breadth-First)"],
                        "correct": 0,
                        "explanation": "By definition of the BST invariant ($L < R < Right$), visiting left subtree, current node, and then right subtree produces sorted monotonic sequence.",
                    },
                    {
                        "text": "What is the worst-case lookup time complexity in an unbalanced binary search tree with $N$ keys?",
                        "options": ["$O(N)$", "$O(\\log N)$", "$O(1)$", "$O(N \\log N)$"],
                        "correct": 0,
                        "explanation": "When keys are inserted in sorted order, an unbalanced BST degenerates into a linear linked list of depth $N$, yielding $O(N)$ search.",
                    },
                ],
            )

            db.commit()
            logger.info("Curriculum starter data seeded/updated successfully.")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error seeding starter curriculum: {str(e)}")
            return False
