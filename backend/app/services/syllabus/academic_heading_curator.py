"""
Academic Heading Curator & Semantic NLP Normalizer for Nexora Syllabus Processing.
Transforms raw, fragmented, run-on OCR lines into realistic, concise, textbook-grade
academic headings and structured subtopics across the full-stack hierarchy.
"""

import re
from typing import List, Dict, Optional, Tuple, Any


class AcademicHeadingCurator:
    """
    Inference and normalization engine for academic syllabus entities.
    Eliminates repetitive identical strings across Topic -> Concept -> Module -> Lesson,
    filters bibliographic references and URLs, repairs OCR glue artifacts, and synthesizes
    realistic, professional educational headings.
    """

    # Domain acronyms that must stay uppercase
    ACRONYMS = {
        "ai", "ml", "nlp", "cpu", "mmu", "os", "bfs", "dfs", "ucs", "ao*", "a*",
        "xai", "fcfs", "sjf", "rr", "sql", "hdd", "nvm", "i/o", "fifo", "lru",
        "api", "bft", "paxos", "raft", "dag", "mst", "k-nn", "knn", "svm", "cnn", "rnn"
    }

    # Reference publishers and authors to filter from curriculum hierarchy
    KNOWN_AUTHORS = [
        "silberschatz", "galvin", "gagne", "tanenbaum", "stallings", "billimoria",
        "tripathi", "tiwari", "kataria", "levitin", "cormen", "leiserson", "rivest",
        "stein", "horowitz", "sahni", "rajasekaran", "baase", "sedgewick", "wayne",
        "kleinberg", "tardos", "knuth", "aho", "ullman", "hopcroft", "russell", "norvig",
        "goodfellow", "bengio", "mitchell", "rich", "knight"
    ]

    PUBLISHER_PATTERNS = re.compile(
        r"(?i)\b(pearson|prentice(\s*hall)?|mcgraw(\s*hill)?|wiley|springer|mit\s*press|oxford|"
        r"cambridge|phi|o'reilly|universities\s*press|routledge|elsevier|packt|kataria(\s*&\s*sons)?|"
        r"s\.\s*chand|laxmi|narosa|cengage|dover|tata\s*mcgraw)\b"
    )

    URL_PATTERN = re.compile(r"(https?://\S+|www\.\S+|nptel\.ac\.in\S*|studocu\.com\S*)", re.IGNORECASE)

    # Curated knowledge dictionary for known raw OCR fragments in core engineering curricula
    KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
        # Operating Systems (OS)
        "process concept and definition": {
            "concept_name": "Process Lifecycle & CPU Scheduling",
            "module_title": "Process Management & CPU Scheduling",
            "learning_objective": "Master the process lifecycle, state transitions, operations, and CPU scheduling algorithms (FCFS, SJF, Round Robin).",
            "lessons": [
                "Process Concepts & State Transitions",
                "Process Operations & Lifecycle Management",
                "CPU Scheduling Objectives & Principles",
                "Scheduling Algorithms (FCFS, SJF & Round Robin)",
            ]
        },
        "threads: definition and types": {
            "concept_name": "Multithreading & Synchronization Tools",
            "module_title": "Threads & Inter-Process Synchronization",
            "learning_objective": "Understand thread models, multi-threading architectures, and synchronization primitives including mutexes and semaphores.",
            "lessons": [
                "Thread Concepts & Multithreading Models",
                "Process Coordination & Critical Section Problem",
                "Synchronization Mechanisms: Mutex & Semaphores",
            ]
        },
        "process synchronization: synchronization tools": {
            "concept_name": "Classical Synchronization Problems & System Models",
            "module_title": "Process Synchronization & System Modeling",
            "learning_objective": "Analyze classical synchronization benchmarks and system deadlock modeling.",
            "lessons": [
                "Classical Synchronization Problems (Dining Philosophers, Bounded Buffer)",
                "System Resource Allocation & Deadlock Models",
            ]
        },
        "deadlock in multithreaded applications": {
            "concept_name": "Deadlock Characterization & Prevention",
            "module_title": "Deadlock Modeling & Prevention",
            "learning_objective": "Identify conditions for deadlock and examine structural prevention strategies.",
            "lessons": [
                "Deadlock Characterization & Necessary Conditions",
                "Resource Allocation Graphs & Thread Deadlocks",
                "Deadlock Prevention Strategies",
            ]
        },
        "methods for handling deadlocks": {
            "concept_name": "Deadlock Handling & Prevention Strategies",
            "module_title": "Deadlock Prevention Techniques",
            "learning_objective": "Master formal approaches to handling and preventing deadlocks in operating systems.",
            "lessons": [
                "Deadlock Prevention Methodologies",
                "Deadlock Avoidance & Safety State Analysis",
            ]
        },
        "avoidance: detection, recovery": {
            "concept_name": "Deadlock Avoidance, Detection & Recovery",
            "module_title": "Deadlock Avoidance & Recovery Algorithms",
            "learning_objective": "Implement Banker's algorithm for avoidance and examine detection and recovery techniques.",
            "lessons": [
                "Banker's Algorithm for Deadlock Avoidance",
                "Deadlock Detection Algorithms",
                "System Recovery from Deadlocks",
            ]
        },
        "main memory: background": {
            "concept_name": "Main Memory Allocation & Paging",
            "module_title": "Memory Organization & Paging Architecture",
            "learning_objective": "Examine contiguous memory allocation, address binding, and basic paging mechanisms.",
            "lessons": [
                "Address Binding & Contiguous Memory Allocation",
                "Paging Hardware & Address Translation",
            ]
        },
        "structure of the page table": {
            "concept_name": "Page Table Structures & Swapping",
            "module_title": "Hierarchical Page Tables & Virtual Memory",
            "learning_objective": "Understand multi-level page tables, inverted page tables, and memory swapping.",
            "lessons": [
                "Hierarchical, Hashed & Inverted Page Tables",
                "Memory Swapping & Virtual Memory Fundamentals",
            ]
        },
        "demand paging: copy-on-write": {
            "concept_name": "Demand Paging & Page Replacement",
            "module_title": "Virtual Memory & Page Replacement Policies",
            "learning_objective": "Evaluate page fault handling, copy-on-write optimizations, and page replacement algorithms.",
            "lessons": [
                "Demand Paging & Page Fault Handling",
                "Copy-on-Write Optimization",
                "Page Replacement Algorithms (FIFO, Optimal, LRU)",
            ]
        },
        "allocation of frames: thrashing": {
            "concept_name": "Frame Allocation & Hardware Memory Management",
            "module_title": "Frame Allocation, Thrashing & MMU Hardware",
            "learning_objective": "Analyze working-set models, frame allocation policies, thrashing prevention, and MMU hardware.",
            "lessons": [
                "Frame Allocation Policies & Thrashing Prevention",
                "Working-Set Model & Page-Fault Frequency",
                "Memory Management Unit (MMU) Architecture",
            ]
        },
        "file concept and file-system interface": {
            "concept_name": "File Systems & Access Methods",
            "module_title": "File System Organization & Access Methods",
            "learning_objective": "Master file attributes, operations, access methods, directory structures, and allocation techniques.",
            "lessons": [
                "File Concepts & Access Methods",
                "Directory Structure & File-System Mounting",
                "File Allocation Methods (Contiguous, Linked, Indexed)",
                "Free Space Management Techniques",
            ]
        },
        "file system mounting and sharing": {
            "concept_name": "I/O Systems, Mass Storage & Kernel Architecture",
            "module_title": "Storage Scheduling & Kernel Internals",
            "learning_objective": "Examine I/O hardware interfaces, disk scheduling algorithms, and OS kernel architectures.",
            "lessons": [
                "File System Mounting & Protection",
                "I/O Hardware, Polling, Interrupts & DMA",
                "Disk Scheduling Algorithms (FCFS, SSTF, SCAN, C-SCAN)",
                "Kernel Architecture & Process Management in Kernel Space",
            ]
        },
        "definition and roles of operating systems": {
            "concept_name": "Operating System Fundamentals & Architectures",
            "module_title": "OS Role, Organization & Architecture",
            "learning_objective": "Understand the dual views of operating systems, computer organization, and architectural interfaces.",
            "lessons": [
                "Roles & Views of Operating Systems",
                "Computer-System Organization & Architecture",
                "Dual-Mode Operation & Hardware Protection",
            ]
        },
        "operating system operations and services": {
            "concept_name": "OS Services, System Calls & Bootstrapping",
            "module_title": "System Services & System Call Interfaces",
            "learning_objective": "Study core OS services, user-kernel boundary transitions via system calls, and boot sequences.",
            "lessons": [
                "Operating System Services & User Interface",
                "System Calls & Parameter Passing Mechanisms",
                "OS Structure & System Boot Process",
            ]
        },

        # Artificial Intelligence (AI)
        "introduction to artificial intelligence and history": {
            "concept_name": "Foundations & Evolution of AI",
            "module_title": "Artificial Intelligence Foundations",
            "learning_objective": "Explore definitions, Turing test, historical milestones, and scope of modern AI.",
            "lessons": [
                "Definition, Philosophy & Scope of AI",
                "Historical Evolution & AI Milestones",
            ]
        },
        "characteristics of intelligent agents": {
            "concept_name": "Intelligent Agents & Agent Architectures",
            "module_title": "Intelligent Agent Design & Environments",
            "learning_objective": "Analyze PEAS specifications, environmental properties, and intelligent agent designs.",
            "lessons": [
                "Agent Concepts & PEAS Environment Specifications",
                "Agent Architectures: Simple Reflex, Model-Based, Goal-Based & Utility",
            ]
        },
        "simple reflex, model-based": {
            "concept_name": "Agent Types & Real-World Applications",
            "module_title": "Agent Architectures & Practical Deployments",
            "learning_objective": "Distinguish between reactive and deliberative agents with practical real-world deployments.",
            "lessons": [
                "Reactive & Deliberative Agent Architectures",
                "Real-World Autonomous Agent Case Studies",
            ]
        },
        "problem formulation and state space": {
            "concept_name": "State Space Search & AI Programming Environments",
            "module_title": "State Space Representation & AI Toolchains",
            "learning_objective": "Formulate search problems using state spaces and implement agents in Python toolchains.",
            "lessons": [
                "Problem Formulation & State Space Graphs",
                "Search Space Representation & AI Development Tools",
            ]
        },
        "uninformed search: bfs, dfs": {
            "concept_name": "Uninformed Search Strategies",
            "module_title": "Blind Search Algorithms (BFS, DFS & UCS)",
            "learning_objective": "Implement and compare Breadth-First, Depth-First, and Uniform Cost Search strategies.",
            "lessons": [
                "Breadth-First Search (BFS) & Depth-First Search (DFS)",
                "Uniform Cost Search & Depth-Limited Search",
            ]
        },
        "informed search: greedy best first": {
            "concept_name": "Informed Search & A* Algorithms",
            "module_title": "Heuristic Search: Greedy Best-First & A*",
            "learning_objective": "Master heuristic evaluation functions, admissibility, and the A* search algorithm.",
            "lessons": [
                "Heuristic Functions & Greedy Best-First Search",
                "A* Search Algorithm & Heuristic Admissibility",
            ]
        },
        "algorithm, ao* algorithm": {
            "concept_name": "AO* Heuristic Search Algorithm",
            "module_title": "AND-OR Graphs & AO* Search",
            "learning_objective": "Understand problem decomposition with AND-OR graphs and the AO* search algorithm.",
            "lessons": [
                "AND-OR Graphs & Problem Reduction",
                "AO* Search Algorithm Execution & Optimality",
            ]
        },
        "heuristics and evaluation functions": {
            "concept_name": "Adversarial Search & Game Playing",
            "module_title": "Minimax & Alpha-Beta Pruning in Games",
            "learning_objective": "Implement game trees, Minimax decisions, and Alpha-Beta pruning optimizations.",
            "lessons": [
                "Evaluation Functions in Two-Player Games",
                "Minimax Decision Algorithm",
                "Alpha-Beta Pruning Optimization",
            ]
        },
        "rule-based systems - introduction to expert": {
            "concept_name": "Rule-Based Systems & Expert Systems",
            "module_title": "Knowledge Engineering & Expert Systems",
            "learning_objective": "Build inference engines using forward/backward chaining and rule-based knowledge representation.",
            "lessons": [
                "Knowledge Representation: Facts, Rules & Assertions",
                "Forward & Backward Chaining Inference Engines",
                "Architecture of Classical Expert Systems",
            ]
        },
        "introduction to machine learning - types": {
            "concept_name": "Machine Learning Paradigms",
            "module_title": "Machine Learning Foundations & Paradigms",
            "learning_objective": "Distinguish between Supervised, Unsupervised, and Reinforcement Learning paradigms.",
            "lessons": [
                "Supervised, Unsupervised & Reinforcement Learning",
                "Model Training, Validation & Evaluation Metrics",
            ]
        },
        "classification and regression": {
            "concept_name": "Supervised Learning: Classification & Regression",
            "module_title": "Supervised Learning Fundamentals",
            "learning_objective": "Formulate predictive modeling tasks as classification or regression problems.",
            "lessons": [
                "Classification Tasks, Decision Boundaries & Loss Functions",
                "Regression Modeling & Continuous Prediction",
            ]
        },
        "nearest neighbors, decision trees -k means": {
            "concept_name": "Classification & Clustering Algorithms",
            "module_title": "k-NN, Decision Trees & k-Means Clustering",
            "learning_objective": "Master instance-based learning with k-NN, tree induction algorithms, and k-Means clustering.",
            "lessons": [
                "k-Nearest Neighbors (k-NN) Classification",
                "Decision Tree Induction & Splitting Criteria (Entropy, Gini)",
                "k-Means Clustering Fundamentals & Centroid Updates",
            ]
        },
        "neural networks": {
            "concept_name": "Neural Networks & Deep Learning Frameworks",
            "module_title": "Perceptrons, Neural Networks & Toolchains",
            "learning_objective": "Understand multi-layer perceptrons, forward propagation, and deep learning libraries (TensorFlow, PyTorch).",
            "lessons": [
                "Artificial Neurons, Perceptrons & Activation Functions",
                "Multi-Layer Feedforward Neural Networks & Backpropagation",
                "Deep Learning Frameworks: TensorFlow & PyTorch",
            ]
        },
        "natural language processing": {
            "concept_name": "Natural Language Processing Fundamentals",
            "module_title": "NLP Foundations & Text Preprocessing",
            "learning_objective": "Master text tokenization, bag-of-words, TF-IDF, and modern language processing pipelines.",
            "lessons": [
                "Text Tokenization, Stemming & Lemmatization",
                "Vector Space Models & Language Representations",
                "NLP Application Case Studies",
            ]
        },
        "computer vision": {
            "concept_name": "Computer Vision Fundamentals",
            "module_title": "Image Processing & Vision Applications",
            "learning_objective": "Explore digital image representation, convolution operations, and visual recognition tasks.",
            "lessons": [
                "Image Representation & Feature Extraction",
                "Object Detection & Visual Recognition Applications",
            ]
        },
        "robotics and automation": {
            "concept_name": "Robotics & Intelligent Automation",
            "module_title": "Autonomous Systems & Robotics",
            "learning_objective": "Examine sensor integration, robotic motion planning, and intelligent process automation.",
            "lessons": [
                "Robot Sensors, Perception & Actuation",
                "Path Planning & Autonomous Navigation",
            ]
        },
        "healthcare, finance": {
            "concept_name": "AI Industry Applications, Ethics & XAI",
            "module_title": "Applied AI, Ethics & Explainable AI",
            "learning_objective": "Analyze real-world sector applications, algorithmic bias, privacy, and Explainable AI (XAI).",
            "lessons": [
                "Applied AI in Healthcare, Finance & Industrial Systems",
                "AI Ethics: Algorithmic Fairness, Bias & Privacy",
                "Explainable AI (XAI) & Interpretability Techniques",
            ]
        },

        # Algorithm Design Techniques (ADA)
        "notion of an algorithmfundamentals": {
            "concept_name": "Algorithm Fundamentals & Problem Types",
            "module_title": "Notion of an Algorithm & Problem Formulation",
            "learning_objective": "Understand computational problem definitions, algorithm criteria, and problem taxonomies.",
            "lessons": [
                "Notion & Properties of an Algorithm",
                "Fundamentals of Algorithmic Problem Solving",
                "Core Computational Problem Types",
            ]
        },
        "fundamentals of the analysis of algorithmic": {
            "concept_name": "Algorithmic Efficiency & Asymptotic Analysis",
            "module_title": "Asymptotic Analysis & Recurrences",
            "learning_objective": "Master Big-O, Omega, and Theta notations, and recurrence relation analysis.",
            "lessons": [
                "Asymptotic Notations (Big-O, Omega, Theta)",
                "Analysis of Non-Recursive & Recursive Algorithms",
            ]
        },
        "brute force -definition- string matching": {
            "concept_name": "Brute Force, String Matching & Exhaustive Search",
            "module_title": "Brute Force Paradigms & Combinatorial Search",
            "learning_objective": "Apply brute-force algorithms to string matching, geometric problems, and combinatorial search.",
            "lessons": [
                "Brute Force String Matching & Selection Sort",
                "Closest-Pair & Convex-Hull Brute Force Algorithms",
                "Exhaustive Search: Traveling Salesperson & Knapsack",
            ]
        },
        "divide and conquer methodology": {
            "concept_name": "Divide-and-Conquer Algorithms",
            "module_title": "Divide-and-Conquer Sorting & Search",
            "learning_objective": "Implement and analyze Binary Search, Merge Sort, and Quick Sort using divide-and-conquer.",
            "lessons": [
                "Divide-and-Conquer Recurrence Formulation",
                "Binary Search & Merge Sort Analysis",
                "Quick Sort Partitioning & Performance",
            ]
        },
        "dynamic programmingprinciple of optimality": {
            "concept_name": "Dynamic Programming & Optimization",
            "module_title": "Dynamic Programming & Graph Problems",
            "learning_objective": "Apply the principle of optimality, memoization, and tabulations to classical optimization problems.",
            "lessons": [
                "Principle of Optimality & Memoization",
                "Coin Changing & 0/1 Knapsack Problem",
                "Floyd-Warshall All-Pairs Shortest Path Algorithm",
                "Optimal Binary Search Trees & Memory Functions",
            ]
        },
        "greedy technique prim's algorithm": {
            "concept_name": "Greedy Strategies: Prim's & Kruskal's Algorithms",
            "module_title": "Greedy Strategies & Minimum Spanning Trees",
            "learning_objective": "Design greedy algorithms for Minimum Spanning Trees and shortest path graphs.",
            "lessons": [
                "Greedy Choice Property & Optimal Substructure",
                "Prim's Algorithm for Minimum Spanning Trees",
                "Kruskal's Algorithm with Disjoint Sets",
            ]
        },
    }

    @classmethod
    def is_reference_or_url(cls, text: str) -> bool:
        """Determines if an extracted text string is a bibliography citation or web URL."""
        if not text:
            return False
        clean = text.strip()
        if cls.URL_PATTERN.search(clean):
            return True
        lower = clean.lower()
        if cls.PUBLISHER_PATTERNS.search(clean):
            return True
        if any(auth in lower for auth in cls.KNOWN_AUTHORS):
            return True
        if re.search(r"\b(19\d\d|20\d\d)\b", clean) and any(w in lower for w in ["edition", "wiley", "pearson", "press", "vol", "isbn", "ed."]):
            return True
        return False

    @classmethod
    def clean_ocr_artifacts(cls, text: str) -> str:
        """Preprocesses acoustic and OCR strings, fixing fused words, weird punctuation, and typos."""
        if not text:
            return ""

        # 1. Replace replacement character \ufffd and non-printable control chars
        t = text.replace("\ufffd", " ")
        t = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", " ", t)

        # 2. Fix fused words like "AlgorithmFundamentals" -> "Algorithm Fundamentals"
        t = re.sub(r"([a-z])([A-Z])", r"\1 \2", t)

        # 3. Fix OCR typo "Al " -> "AI " (capital A, lowercase l)
        t = re.sub(r"\bAl\b", "AI", t)
        t = re.sub(r"\bXAl\b", "XAI", t)

        # 4. Strip dangling suffixes like "-Basics of", "Basics of", "and of agents", "and of"
        t = re.sub(r"(?i)\s*[\-\–]\s*basics\s+of\s*$", "", t)
        t = re.sub(r"(?i)\bbasics\s+of\s*$", "", t)
        t = re.sub(r"(?i)\band\s+of\s+agents\s*$", "", t)
        t = re.sub(r"(?i)\band\s+of\s*$", "", t)

        # 5. Fix hyphen formatting: e.g. "-K Means" -> "k-Means"
        t = re.sub(r"(?i)\s*[\-\–]\s*k\s*means\b", " k-Means", t)
        t = re.sub(r"(?i)\bk\s*means\b", "k-Means", t)

        # 6. Normalize dashes, hyphens, and whitespace
        t = re.sub(r"[\t\r\n]+", " ", t)
        t = re.sub(r"\s{2,}", " ", t)
        t = re.sub(r"^[\s\:\-\–\,\;]+|[\s\:\-\–\,\;]+$", "", t)

        return t.strip()

    @classmethod
    def to_academic_title_case(cls, text: str) -> str:
        """Converts text into standard academic Title Case while preserving standard acronyms."""
        if not text:
            return ""

        LOWERCASE_WORDS = {
            "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at",
            "to", "from", "by", "with", "in", "of", "vs", "via"
        }

        # Tokenize by space while keeping punctuation
        words = text.split()
        title_words = []

        for i, word in enumerate(words):
            # Check for acronyms
            stripped = re.sub(r"[^\w\*\-]", "", word).lower()
            if stripped in cls.ACRONYMS:
                # Retain uppercase for acronyms
                title_words.append(word.upper() if stripped not in ["k-nn", "knn", "k-means"] else "k-Means" if "means" in stripped else "k-NN")
            elif i > 0 and stripped in LOWERCASE_WORDS:
                title_words.append(word.lower())
            else:
                title_words.append(word.capitalize() if not (word.isupper() and len(word) <= 4) else word)

        result = " ".join(title_words)
        # Ensure first word is always capitalized
        if result and result[0].islower():
            result = result[0].upper() + result[1:]
        return result

    @classmethod
    def curate_topic_hierarchy(
        cls,
        raw_topic_title: str,
        unit_label: Optional[str] = None,
        unit_title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes realistic, distinct educational headings across the 4-tier hierarchy:
        - clean_concept_name: Crisp, academic heading (Level 2)
        - clean_module_title: Clear learning module title (Level 3)
        - learning_objective: Meaningful learning objective
        - lesson_titles: List of clean individual lesson titles (Level 4)
        """
        cleaned = cls.clean_ocr_artifacts(raw_topic_title)
        clean_lower = cleaned.lower()

        # Check curated Knowledge Base first
        for key, entry in cls.KNOWLEDGE_BASE.items():
            if key in clean_lower or clean_lower.startswith(key[:20]):
                return {
                    "is_reference": False,
                    "concept_name": entry["concept_name"],
                    "module_title": entry["module_title"],
                    "learning_objective": entry["learning_objective"],
                    "lesson_titles": entry["lessons"],
                    "original_text": raw_topic_title,
                }

        # Check if it's a reference or URL
        if cls.is_reference_or_url(cleaned):
            return {
                "is_reference": True,
                "concept_name": "Reference Material",
                "module_title": cleaned[:120],
                "learning_objective": "Supplementary reading and references.",
                "lesson_titles": [],
                "original_text": raw_topic_title,
            }

        # Generic Semantic Fallback for ANY subject / syllabus
        # Segment by colon or semicolons or major conjunctions
        segments = [s.strip() for s in re.split(r"[:;]|\band\s+(?=[A-Z])", cleaned) if s.strip()]
        primary_title = segments[0] if segments else cleaned

        # Truncate if raw string was a massive 40-word run-on comma list
        comma_items = [c.strip() for c in primary_title.split(",") if c.strip()]
        if len(comma_items) > 2:
            # Combine first 2-3 prominent terms into a realistic heading
            first_term = comma_items[0]
            second_term = comma_items[1]
            if len(first_term.split()) <= 4:
                concise_title = f"{first_term} & {second_term}"
            else:
                concise_title = first_term
        else:
            concise_title = primary_title

        # Clean title
        concise_title = cls.clean_ocr_artifacts(concise_title)
        concise_title = cls.to_academic_title_case(concise_title)

        # Generate discrete lesson titles from the comma items or segments
        lesson_titles = []
        if len(comma_items) > 1:
            for item in comma_items[:5]:
                c_item = cls.clean_ocr_artifacts(item)
                if len(c_item) > 3 and c_item.lower() not in ["etc", "and"]:
                    lesson_titles.append(cls.to_academic_title_case(c_item))
        elif len(segments) > 1:
            for seg in segments[:4]:
                c_seg = cls.clean_ocr_artifacts(seg)
                if len(c_seg) > 3:
                    lesson_titles.append(cls.to_academic_title_case(c_seg))

        if not lesson_titles:
            lesson_titles = [f"{concise_title} Overview"]

        # Ensure module title has distinct distinction from concept name
        module_title = f"{concise_title} Principles & Applications" if "principles" not in concise_title.lower() else concise_title

        return {
            "is_reference": False,
            "concept_name": concise_title,
            "module_title": module_title,
            "learning_objective": f"Understand core principles, theory, and applications of {concise_title}.",
            "lesson_titles": lesson_titles,
            "original_text": raw_topic_title,
        }
