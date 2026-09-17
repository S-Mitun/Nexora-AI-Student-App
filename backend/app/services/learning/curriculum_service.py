from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import or_
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson
from app.core.logging import logger


class CurriculumService:
    """
    Curriculum Data Access & Navigation Service.
    Provides eager-loaded, N+1 safe queries for the 5-tier academic hierarchy:
    Subject -> Topic -> Concept -> LearningModule -> Lesson.
    """

    @staticmethod
    def get_subjects(db: Session, active_only: bool = True) -> List[Subject]:
        """Returns all subjects ordered by order_index with eager-loaded topics."""
        query = db.query(Subject).options(
            selectinload(Subject.topics).selectinload(Topic.concepts)
        )
        if active_only:
            query = query.filter(Subject.is_active == True)
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
        if db.query(Subject).count() > 0:
            return False

        logger.info("Subjects table is empty. Seeding initial starter curriculum...")
        try:
            # 1. Subjects
            sub_cs = Subject(
                id="sub-00000000-0000-0000-0000-000000000000",
                name="Computer Science Foundations",
                slug="computer-science",
                description="Core computation theory, discrete structures, and systems engineering.",
                icon="Cpu",
                category="Computer Science & Engineering",
                difficulty_level="all-levels",
                order_index=0,
                is_active=True,
            )
            sub_dsa = Subject(
                id="sub-00000000-0000-0000-0000-000000000001",
                name="Data Structures & Algorithms",
                slug="data-structures-algorithms",
                description="Master asymptotic analysis, memory contiguity, tree traversals, and dynamic graph algorithms.",
                icon="Cpu",
                category="Computer Science & Engineering",
                difficulty_level="all-levels",
                order_index=1,
                is_active=True,
            )
            sub_os = Subject(
                id="sub-00000000-0000-0000-0000-000000000002",
                name="Operating Systems",
                slug="operating-systems",
                description="Processes, CPU scheduling algorithms, virtual memory paging, and concurrency primitives.",
                icon="FolderKanban",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                order_index=2,
                is_active=True,
            )
            sub_dbms = Subject(
                id="sub-00000000-0000-0000-0000-000000000003",
                name="Database Management Systems",
                slug="database-management-systems",
                description="Relational algebra, ACID transactions, B-Tree indexes, and normal forms.",
                icon="Binary",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                order_index=3,
                is_active=True,
            )
            sub_cn = Subject(
                id="sub-00000000-0000-0000-0000-000000000004",
                name="Computer Networks",
                slug="computer-networks",
                description="The OSI stack, TCP congestion control, IP subnetting, and socket architectures.",
                icon="Zap",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                order_index=4,
                is_active=True,
            )
            sub_ai = Subject(
                id="sub-00000000-0000-0000-0000-000000000005",
                name="Artificial Intelligence & Machine Learning",
                slug="artificial-intelligence-machine-learning",
                description="Gradient descent, neural network architectures, loss landscapes, and model evaluation.",
                icon="Sparkles",
                category="Computer Science & Engineering",
                difficulty_level="intermediate",
                order_index=5,
                is_active=True,
            )
            sub_physics = Subject(
                id="sub-00000000-0000-0000-0000-000000000006",
                name="Physics",
                slug="physics",
                description="Wave mechanics, kinematics, Doppler shifts, electromagnetism, and orbital dynamics.",
                icon="Zap",
                category="Natural Sciences",
                difficulty_level="all-levels",
                order_index=6,
                is_active=True,
            )
            db.add_all([sub_cs, sub_dsa, sub_os, sub_dbms, sub_cn, sub_ai, sub_physics])
            db.flush()

            # 2. Topics for DSA
            top_arr = Topic(
                id="top-00000000-0000-0000-0000-000000000001",
                subject_id=sub_dsa.id,
                name="Arrays & Search",
                slug="arrays-search",
                description="Contiguous memory layout, cache locality, and logarithmic search patterns.",
                order_index=1,
                is_active=True,
            )
            top_ll = Topic(
                id="top-00000000-0000-0000-0000-000000000002",
                subject_id=sub_dsa.id,
                name="Linked Lists",
                slug="linked-lists",
                description="Non-contiguous pointer nodes, pointer manipulation, and cycle detection.",
                order_index=2,
                is_active=True,
            )
            top_tree = Topic(
                id="top-00000000-0000-0000-0000-000000000003",
                subject_id=sub_dsa.id,
                name="Trees & Hierarchies",
                slug="trees-hierarchies",
                description="Binary trees, balanced search trees, heaps, and recursive traversals.",
                order_index=3,
                is_active=True,
            )
            top_graph = Topic(
                id="top-00000000-0000-0000-0000-000000000004",
                subject_id=sub_dsa.id,
                name="Graphs & Networks",
                slug="graphs-networks",
                description="Adjacency structures, topological ordering, shortest paths, and spanning trees.",
                order_index=4,
                is_active=True,
            )
            # Topics for OS
            top_proc = Topic(
                id="top-00000000-0000-0000-0000-000000000005",
                subject_id=sub_os.id,
                name="Processes & Threads",
                slug="processes-threads",
                description="Address spaces, PCB structures, context switching, and POSIX threads.",
                order_index=1,
                is_active=True,
            )
            top_sched = Topic(
                id="top-00000000-0000-0000-0000-000000000006",
                subject_id=sub_os.id,
                name="CPU Scheduling",
                slug="cpu-scheduling",
                description="Preemptive vs non-preemptive schedulers, Round Robin, and Multi-Level Feedback Queues.",
                order_index=2,
                is_active=True,
            )
            top_mem = Topic(
                id="top-00000000-0000-0000-0000-000000000007",
                subject_id=sub_os.id,
                name="Memory Management",
                slug="memory-management",
                description="Paging, TLB caches, page faults, and virtual address translation.",
                order_index=3,
                is_active=True,
            )
            # Topics for DBMS
            top_sql = Topic(
                id="top-00000000-0000-0000-0000-000000000008",
                subject_id=sub_dbms.id,
                name="Relational Model & SQL",
                slug="relational-model-sql",
                description="Relational schemas, foreign keys, declarative querying, and joins.",
                order_index=1,
                is_active=True,
            )
            top_norm = Topic(
                id="top-00000000-0000-0000-0000-000000000009",
                subject_id=sub_dbms.id,
                name="Normalization & Design",
                slug="normalization-design",
                description="Functional dependencies, 1NF through BCNF, and lossless decomposition.",
                order_index=2,
                is_active=True,
            )
            top_acid = Topic(
                id="top-00000000-0000-0000-0000-000000000010",
                subject_id=sub_dbms.id,
                name="Transactions & Concurrency",
                slug="transactions-concurrency",
                description="ACID properties, Write-Ahead Logging, and 2-Phase Locking.",
                order_index=3,
                is_active=True,
            )
            db.add_all([top_arr, top_ll, top_tree, top_graph, top_proc, top_sched, top_mem, top_sql, top_norm, top_acid])
            db.flush()

            # 3. Concepts
            con_bs = Concept(
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
            )
            con_tp = Concept(
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
            )
            con_bst = Concept(
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
            )
            con_trav = Concept(
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
            )
            db.add_all([con_bs, con_tp, con_bst, con_trav])
            db.flush()

            # 4. Learning Modules
            mod_bst = LearningModule(
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
            )
            db.add(mod_bst)
            db.flush()

            # 5. Lessons
            les_1 = Lesson(
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
            )
            les_2 = Lesson(
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
            )
            les_3 = Lesson(
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
            )
            db.add_all([les_1, les_2, les_3])
            db.commit()
            logger.info("Curriculum starter data seeded successfully.")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error seeding starter curriculum: {str(e)}")
            return False
