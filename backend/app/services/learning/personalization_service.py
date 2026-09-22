"""
NEXORA Deterministic Personalization Engine
============================================
Master Prompt 04: Interest & Hobby Personalization Foundation

Provides rule-based, academically invariant contextual personalization.
Adapts motivation, analogies, and practical applications according to student interests
(Gaming, Cricket, Cars, Music, Space, Coding, Robotics, etc.) while preserving
100% mathematical, scientific, and factual correctness.
"""

from typing import List, Dict, Any, Optional, Tuple
import re
from pydantic import BaseModel, Field


class PersonalizedContext(BaseModel):
    """Encapsulates a topic's contextual explanation tailored to an interest domain."""
    interest: str = Field(..., description="Interest or hobby category (e.g., Gaming, Cricket, Cars)")
    domain: str = Field(..., description="Technical or industry domain")
    headline: str = Field(..., description="Relatable headline connecting concept to interest")
    analogy_explanation: str = Field(..., description="Conceptual analogy rooted in the student's interest")
    real_world_application: str = Field(..., description="Authentic technical or engineering application")
    related_domains: List[str] = Field(default_factory=list, description="Associated STEM and practical subfields")
    relevance_score: float = Field(1.0, description="Confidence/relevance weighting")


class RecommendedTopic(BaseModel):
    """Personalized concept recommendation card for student dashboard and exploration."""
    concept: str
    subject: str
    slug: str
    matched_interest: str
    headline: str
    summary: str
    target_url: str


class PersonalizationService:
    """
    Deterministic domain service for student learning preferences and contextual adaptation.
    """

    # Available learning preferences defining HOW the student prefers NEXORA to teach
    # (Extensible architecture: does NOT restrict WHAT subjects the student can learn)
    AVAILABLE_LEARNING_PREFERENCES: Dict[str, Dict[str, Any]] = {
        "visual": {
            "id": "visual",
            "name": "Visual Learning",
            "short_desc": "Interactive visual models, diagrams, and simulations for intuitive spatial understanding.",
            "icon": "Eye",
            "aliases": ["visual", "interactive", "visual & interactive"],
        },
        "practical": {
            "id": "practical",
            "name": "Practice-Based Learning",
            "short_desc": "Real-world engineering applications, industry case studies, and hands-on scenarios.",
            "icon": "Wrench",
            "aliases": ["practical", "applied", "hands-on", "practice-based"],
        },
        "step_by_step": {
            "id": "step_by_step",
            "name": "Step-by-Step Explanations",
            "short_desc": "Structured mathematical derivations, incremental proofs, and guided analytical breakdowns.",
            "icon": "ListOrdered",
            "aliases": ["step_by_step", "step-by-step", "theoretical", "analytical", "step by step"],
        },
    }

    # Every newly created account has all available learning preferences enabled by default
    DEFAULT_LEARNING_PREFERENCES: List[str] = ["visual", "practical", "step_by_step"]

    # Curated canonical interests with keyword aliases for normalization
    CANONICAL_INTERESTS: Dict[str, Dict[str, Any]] = {
        "Gaming": {
            "aliases": ["gaming", "game dev", "game development", "games", "video games", "esports"],
            "icon": "Gamepad2",
            "domain": "Game Architecture & Interactive Simulation",
        },
        "Cricket": {
            "aliases": ["cricket", "sports physics", "cricketing"],
            "icon": "Trophy",
            "domain": "Sports Analytics & Kinematics",
        },
        "Cars": {
            "aliases": ["cars", "automotive", "formula 1", "f1", "racing", "automotive engineering", "motorsports"],
            "icon": "Car",
            "domain": "Automotive Engineering & Telemetry",
        },
        "Music": {
            "aliases": ["music", "acoustics", "audio", "music production", "sound engineering", "audio dsp"],
            "icon": "Music",
            "domain": "Acoustics & Digital Signal Processing",
        },
        "Space": {
            "aliases": ["space", "astronomy", "astrophysics", "space exploration", "cosmology", "rocketry"],
            "icon": "Rocket",
            "domain": "Astrophysics & Orbital Mechanics",
        },
        "Coding": {
            "aliases": ["coding", "programming", "software engineering", "computer science", "algorithms"],
            "icon": "Code2",
            "domain": "Software Systems & Algorithmic Design",
        },
        "Robotics": {
            "aliases": ["robotics", "drones", "mechatronics", "autonomous systems"],
            "icon": "Bot",
            "domain": "Robotics & Control Systems",
        },
        "AI & ML": {
            "aliases": ["ai", "ml", "machine learning", "artificial intelligence", "deep learning"],
            "icon": "Sparkles",
            "domain": "Artificial Intelligence & Pattern Recognition",
        },
        "Biotech": {
            "aliases": ["biotech", "medicine", "biotechnology", "medical tech", "bioengineering"],
            "icon": "Activity",
            "domain": "Biomedical Engineering & Genomics",
        },
        "Finance": {
            "aliases": ["finance", "fintech", "trading", "quantitative trading", "economics", "stocks"],
            "icon": "TrendingUp",
            "domain": "Quantitative Finance & Stochastic Modeling",
        },
        "Design": {
            "aliases": ["design", "ui/ux", "graphic design", "3d modeling", "digital art"],
            "icon": "Palette",
            "domain": "Visual Design & Computational Geometry",
        },
        "Photography": {
            "aliases": ["photography", "cameras", "optics", "cinematography", "film"],
            "icon": "Camera",
            "domain": "Optical Physics & Image Sensors",
        },
        "Science": {
            "aliases": ["science", "physics", "chemistry", "nature", "biology"],
            "icon": "Atom",
            "domain": "Fundamental Natural Sciences",
        },
    }

    # Curated concept-interest perspective registry
    # Invariant academic truth + relatable contextual framing
    PERSPECTIVE_REGISTRY: Dict[str, Dict[str, PersonalizedContext]] = {
        "doppler effect": {
            "Cars": PersonalizedContext(
                interest="Cars",
                domain="Automotive Engineering & Telemetry",
                headline="Formula 1 Engine Pitch Shift & Speed Telemetry",
                analogy_explanation="As an F1 race car tears down the straightaway toward you, each acoustic wavefront from the high-revving engine is emitted closer to the previous one because the car is moving forward. The sound waves compress in front of the vehicle, raising the pitch. The instant the car flashes past and speeds away, the waves stretch apart behind it, causing the characteristic sudden drop in engine tone.",
                real_world_application="Pit lane speed traps and trackside Doppler radar guns calculate vehicle velocity in real time by measuring the frequency shift of reflected microwave pulses.",
                related_domains=["aerodynamics", "sensor telemetry", "acoustics"],
                relevance_score=1.0,
            ),
            "Space": PersonalizedContext(
                interest="Space",
                domain="Astrophysics & Orbital Mechanics",
                headline="Cosmic Redshift & The Expanding Universe",
                analogy_explanation="Light behaves like sound waves. When distant galaxies move away from Earth, the light waves they emit are stretched toward longer, redder wavelengths. Just as an ambulance siren drops in pitch as it moves away, starlight shifts toward the red end of the spectrum.",
                real_world_application="Astronomers measure cosmic redshift using high-resolution spectrographs to calculate the exact recession velocity of distant galaxies, providing direct evidence for cosmic expansion.",
                related_domains=["spectroscopy", "cosmology", "orbital kinematics"],
                relevance_score=1.0,
            ),
            "Cricket": PersonalizedContext(
                interest="Cricket",
                domain="Sports Analytics & Acoustics",
                headline="UltraEdge Micro-Acoustics & Ball Trajectory",
                analogy_explanation="A fast delivery traveling at 145 km/h compresses air in front of its trajectory. When a batsman edges a delivery, the micro-impact generates localized acoustic waves that are compressed toward the stump microphones down-pitch.",
                real_world_application="UltraEdge and Hawkeye broadcast systems use Doppler-filtered microphone arrays to isolate the high-frequency acoustic spike of edge deflections from bat noise and pad impacts.",
                related_domains=["acoustic triangulation", "signal isolation", "trajectory tracking"],
                relevance_score=0.95,
            ),
            "Music": PersonalizedContext(
                interest="Music",
                domain="Acoustics & Digital Signal Processing",
                headline="Leslie Rotary Speakers & Chorus Pitch Modulation",
                analogy_explanation="A classic Hammond organ Leslie speaker rotates a physical acoustic horn inside a wooden cabinet. Because the horn horn-mouth constantly moves toward and away from the listener, the pitch continuously shifts up and down, creating a lush, organic chorus and vibrato effect.",
                real_world_application="Digital audio workstations (DAWs) use variable delay-line Doppler algorithms to simulate rotating speakers, spatial stereo wideners, and realistic 3D binaural headphone audio.",
                related_domains=["sound engineering", "DSP", "frequency modulation"],
                relevance_score=1.0,
            ),
            "Gaming": PersonalizedContext(
                interest="Gaming",
                domain="Game Audio Engines & 3D Spatialization",
                headline="Dynamic 3D Positional Audio in Game Engines",
                analogy_explanation="In multiplayer games, when a high-speed projectile or racing vehicle flashes past your player camera, the audio engine alters the sound sample playback rate in real time based on relative vector velocity.",
                real_world_application="Game engines like Unreal Engine and Unity run real-time vector dot-product calculations every frame to compute the Doppler pitch multiplier for hundreds of dynamic sound emitters.",
                related_domains=["vector mathematics", "real-time DSP", "audio spatialization"],
                relevance_score=0.95,
            ),
            "Coding": PersonalizedContext(
                interest="Coding",
                domain="Software Systems & DSP Pipelines",
                headline="Vector Velocity Calculations in Real-Time Audio APIs",
                analogy_explanation="In software, calculating Doppler frequency shift requires finding the projection of relative velocity vectors along the line-of-sight unit vector between sound emitter and listener.",
                real_world_application="Web Audio API `PannerNode` and OpenAL implementations execute Doppler shift equations in native C++ audio threads to dynamically adjust audio buffer resampling factors.",
                related_domains=["vector mathematics", "audio buffers", "real-time systems"],
                relevance_score=0.95,
            ),
        },
        "binary search": {
            "Gaming": PersonalizedContext(
                interest="Gaming",
                domain="Game Engine Architecture",
                headline="Game World Spatial Partitioning & Hit Detection",
                analogy_explanation="Imagine checking 10,000 game objects to see which one was clicked. Testing them sequentially wastes valuable frame budget. By organizing objects into sorted spatial bounding volumes, the engine discards half the world at every step, finding the target hit in under 14 comparisons.",
                real_world_application="Physics and collision engines (such as PhysX and Havok) use hierarchical bounding volume bisection to sustain solid 120 FPS frame rates across massive open-world maps.",
                related_domains=["spatial indexing", "bounding volume hierarchies", "frame optimization"],
                relevance_score=1.0,
            ),
            "Cricket": PersonalizedContext(
                interest="Cricket",
                domain="Sports Analytics & Percentiles",
                headline="Statistical Milestone & Delivery Speed Queries",
                analogy_explanation="If 100,000 recorded deliveries in a tournament are sorted by release speed, finding the first ball exceeding 150 km/h doesn't require inspecting all 100,000 balls. Looking at ball 50,000 immediately eliminates half the dataset, finding the threshold in at most 17 lookups.",
                real_world_application="Live sports data telemetry engines use binary search on pre-sorted delivery arrays to produce instant broadcast statistics while the bowler is walking back to their mark.",
                related_domains=["statistical indexing", "real-time dashboards", "query latency"],
                relevance_score=0.95,
            ),
            "Cars": PersonalizedContext(
                interest="Cars",
                domain="Automotive Control Systems",
                headline="Engine ECU Sensor Calibration Table Lookups",
                analogy_explanation="An Engine Control Unit (ECU) reads an intake pressure voltage and must look up the exact fuel injection duration from a sorted 4,096-entry fuel trim map. A linear scan takes thousands of cycles, but binary search pinpoints the calibration in 12 steps.",
                real_world_application="Automotive microcontrollers in engine and anti-lock brake (ABS) modules execute deterministic logarithmic lookups to meet hard microsecond real-time deadlines at 8,000 RPM.",
                related_domains=["embedded systems", "lookup interpolation", "ECU firmware"],
                relevance_score=1.0,
            ),
            "Coding": PersonalizedContext(
                interest="Coding",
                domain="Software Engineering & Infrastructure",
                headline="Git Bisect & Database B-Tree Indexing",
                analogy_explanation="When an unnoticed bug breaks production among the last 1,000 commits, checking the median commit cuts the suspect range in half every iteration. You isolate the exact faulty commit in 10 tests instead of 1,000.",
                real_world_application="PostgreSQL and SQLite B-Trees rely on binary search across sorted internal index pages to execute queries in sub-millisecond response times across millions of rows.",
                related_domains=["version control", "database storage engines", "O(log n) optimization"],
                relevance_score=1.0,
            ),
            "Music": PersonalizedContext(
                interest="Music",
                domain="Digital Synthesizer Architecture",
                headline="MIDI Note Pitch Quantization & Frequency Tables",
                analogy_explanation="When a digital synthesizer translates analog pitch voltages into discrete musical notes, it queries a sorted table of 128 chromatic frequency standards. Binary search finds the exact note boundary in 7 comparisons.",
                real_world_application="Real-time vocal pitch-correction and auto-tune DSP plugins use binary bisection on frequency tables to quantize vocal frequencies to key scales with zero perceptible audio latency.",
                related_domains=["audio synthesis", "MIDI specifications", "DSP lookup tables"],
                relevance_score=0.95,
            ),
            "Space": PersonalizedContext(
                interest="Space",
                domain="Orbital Trajectory Modeling",
                headline="Ephemeris Trajectory Window & Root Finding",
                analogy_explanation="To determine the exact moment a probe will intersect Mars's orbital plane from a sorted trajectory table covering 10 years, flight computers use binary root bisection to zero in on the launch window.",
                real_world_application="NASA trajectory optimization tools use bisection algorithms to calculate orbital transfer windows and planetary gravitational slingshots.",
                related_domains=["celestial mechanics", "numerical methods", "orbital modeling"],
                relevance_score=0.95,
            ),
        },
        "convolutional neural network": {
            "Gaming": PersonalizedContext(
                interest="Gaming",
                domain="Game Graphics & Shaders",
                headline="Post-Processing Shaders & Convolution Kernels",
                analogy_explanation="In game engines, a convolution kernel is like a small 3x3 matrix sliding over pixels. A sharpen kernel highlights edges, while a Gaussian kernel blurs backgrounds for depth-of-field.",
                real_world_application="Modern GPU compute pipelines use 2D convolution filters for real-time post-processing effects such as ambient occlusion, bloom, and screen-space reflections.",
                related_domains=["HLSL shaders", "GPU compute", "computer graphics"],
                relevance_score=1.0,
            ),
            "Cars": PersonalizedContext(
                interest="Cars",
                domain="Autonomous Vehicles & ADAS",
                headline="Autonomous Driving Perception & Lane Detection",
                analogy_explanation="Self-driving cameras process millions of pixels every second. CNN feature detectors first identify simple road lane lines, then combine them to recognize pedestrians, traffic signals, and braking cars ahead.",
                real_world_application="Tesla Autopilot and Waymo perception stacks run convolutional neural networks on dedicated hardware accelerators to classify obstacles with sub-10ms latency.",
                related_domains=["computer vision", "ADAS", "edge computing"],
                relevance_score=1.0,
            ),
            "Photography": PersonalizedContext(
                interest="Photography",
                domain="Computational Photography",
                headline="Optical Filters & Computational Bokeh",
                analogy_explanation="Smartphone cameras with tiny sensors simulate the shallow depth-of-field of high-end DSLR lenses by convolving depth-mapped image layers with synthetic aperture blur kernels.",
                real_world_application="Portrait mode and optical aberration correction on modern phones execute hardware-accelerated 2D convolution filters to produce clean optical bokeh.",
                related_domains=["computational optics", "image processing", "aperture modeling"],
                relevance_score=1.0,
            ),
            "Cricket": PersonalizedContext(
                interest="Cricket",
                domain="Sports Computer Vision",
                headline="Ball Tracking & Automated Boundary Detection",
                analogy_explanation="In high-speed television broadcast feeds, CNN visual models detect the small spherical seam of the cricket ball against crowded stadium backgrounds across multiple angles.",
                real_world_application="Broadcasters use real-time convolutional spatial detectors to track ball trajectories at 340 frames per second for Hawkeye predictive path reconstructions.",
                related_domains=["object tracking", "broadcast analytics", "spatial localization"],
                relevance_score=0.95,
            ),
            "Coding": PersonalizedContext(
                interest="Coding",
                domain="Machine Learning Systems",
                headline="Tensor Convolutions & Weight Sharing Architecture",
                analogy_explanation="Unlike standard matrix multiplication that connects every input to every output, a convolution slides a tiny matrix kernel across tensor dimensions, sharing weights and drastically reducing memory requirements.",
                real_world_application="PyTorch and TensorFlow implement optimized Winograd and GEMM-based convolution algorithms in CUDA to train image classifiers with billions of operations per second.",
                related_domains=["CUDA kernels", "deep learning frameworks", "tensor operations"],
                relevance_score=1.0,
            ),
        },
    }

    # Standard curriculum baseline when no interests match or when student selects zero interests
    STANDARD_BASELINE: Dict[str, PersonalizedContext] = {
        "doppler effect": PersonalizedContext(
            interest="Curriculum Standard",
            domain="Wave Physics & Kinematics",
            headline="Wave Compression & Relative Motion in Mechanics",
            analogy_explanation="Imagine ripples spreading from a source on water. When the source moves forward while pulsing, wavefronts bunch together along the direction of travel and stretch out behind it. This changes the observed frequency.",
            real_world_application="Police radar guns and medical Doppler ultrasound use frequency shift measurements to determine object velocities and blood flow rates with high precision.",
            related_domains=["wave mechanics", "kinematics", "ultrasonic imaging"],
            relevance_score=1.0,
        ),
        "binary search": PersonalizedContext(
            interest="Curriculum Standard",
            domain="Computer Science & Algorithms",
            headline="Logarithmic Divide-and-Conquer Search",
            analogy_explanation="If you guess a number between 1 and 100 with 'higher/lower' hints, guessing 50 immediately cuts the remaining possibilities in half. Repeating this bisection strategy solves the problem in logarithmic time.",
            real_world_application="Relational database indexes and file system b-trees use binary search to locate records among millions of rows in single-digit iterations.",
            related_domains=["algorithms", "data structures", "computational complexity"],
            relevance_score=1.0,
        ),
        "convolutional neural network": PersonalizedContext(
            interest="Curriculum Standard",
            domain="Machine Learning & Image Processing",
            headline="Spatial Feature Extraction via Convolution Kernels",
            analogy_explanation="A small numerical kernel slides across an image matrix, multiplying overlapping pixels to detect localized patterns like vertical edges, horizontal lines, and color gradients.",
            real_world_application="Medical imaging software uses convolutional neural networks to detect micro-calcifications and structural anomalies in MRI and CT scans faster and more consistently than manual screening.",
            related_domains=["machine learning", "matrix operations", "medical diagnostics"],
            relevance_score=1.0,
        ),
    }

    @classmethod
    def normalize_interest(cls, raw: str) -> str:
        """
        Normalizes an interest string against canonical categories, handling casing,
        whitespace, and common aliases.
        """
        if not raw or not isinstance(raw, str):
            return ""

        clean = raw.strip()
        lower_clean = clean.lower()

        # Check canonical keys and aliases
        for canonical_name, data in cls.CANONICAL_INTERESTS.items():
            if lower_clean == canonical_name.lower():
                return canonical_name
            for alias in data["aliases"]:
                if lower_clean == alias or alias in lower_clean:
                    return canonical_name

        # If custom write-in interest, sanitize and title-case safely
        sanitized = re.sub(r"[^a-zA-Z0-9\s&+\-]", "", clean)
        return sanitized[:40].strip().title()

    @classmethod
    def validate_and_clean_interests(
        cls,
        interests: Optional[List[str]],
        custom_interests: Optional[List[str]] = None,
    ) -> Tuple[List[str], List[str]]:
        """
        Validates, deduplicates case-insensitively, and sanitizes student interests
        and custom write-in interests without discarding student entries.
        """
        cleaned_canonical: List[str] = []
        seen = set()

        if interests and isinstance(interests, list):
            for item in interests:
                if not item or not isinstance(item, str):
                    continue
                tag_stripped = re.sub(r"<[^>]*>", "", item.strip())
                clean = re.sub(r"[^\w\s&+\-.,/()]", "", tag_stripped)[:40].strip()
                if clean and clean.lower() not in seen:
                    seen.add(clean.lower())
                    cleaned_canonical.append(clean)

        cleaned_custom: List[str] = []
        if custom_interests and isinstance(custom_interests, list):
            for item in custom_interests:
                if not item or not isinstance(item, str):
                    continue
                tag_stripped = re.sub(r"<[^>]*>", "", item.strip())
                clean = re.sub(r"[^\w\s&+\-.,/()]", "", tag_stripped)[:40].strip()
                if clean and clean.lower() not in seen:
                    seen.add(clean.lower())
                    cleaned_custom.append(clean)

        return cleaned_canonical, cleaned_custom

    @classmethod
    def validate_learning_preferences(
        cls,
        preferences: Optional[List[str]],
        fallback_existing: Optional[List[str]] = None,
    ) -> Tuple[bool, List[str], Optional[str]]:
        """
        Validates learning preferences against the Minimum One Preference Rule.
        Returns (is_valid, validated_preferences_list, error_message).
        Enforces:
        1. Normalization against available preference IDs and aliases.
        2. Deduplication.
        3. At least one preference must remain enabled (rejection if 0 enabled).
        """
        if preferences is None:
            existing = fallback_existing if fallback_existing else cls.DEFAULT_LEARNING_PREFERENCES
            return True, existing, None

        if not isinstance(preferences, list):
            return False, [], "Learning preferences must be a list of preferences."

        valid_set = []
        seen = set()
        for p in preferences:
            if not p or not isinstance(p, str):
                continue
            clean = p.strip().lower()
            matched_id = None
            for pref_id, meta in cls.AVAILABLE_LEARNING_PREFERENCES.items():
                if clean == pref_id.lower() or clean in [a.lower() for a in meta.get("aliases", [])]:
                    matched_id = pref_id
                    break
            if matched_id and matched_id not in seen:
                seen.add(matched_id)
                valid_set.append(matched_id)

        if len(valid_set) < 1:
            return False, [], "At least one learning preference must remain enabled. You may customize how NEXORA helps you learn, but you cannot disable all learning modes."

        return True, valid_set, None

    @classmethod
    def get_personalized_context(
        cls,
        concept: str,
        interests: Optional[List[str]] = None,
        preferred_interest: Optional[str] = None,
    ) -> Optional[PersonalizedContext]:
        """Convenience alias for get_personalization_for_concept."""
        return cls.get_personalization_for_concept(
            concept_name=concept,
            student_interests=interests,
            preferred_interest=preferred_interest,
        )

    @classmethod
    def get_personalization_for_concept(
        cls,
        concept_name: str,
        student_interests: Optional[List[str]] = None,
        preferred_interest: Optional[str] = None,
    ) -> PersonalizedContext:
        """
        Retrieves the most relevant contextual explanation for a concept based on student preferences.
        Guarantees fallback to curriculum standard when student has no interests or no specific match exists.
        """
        concept_key = concept_name.lower().strip()
        matched_concept = None
        for key in cls.PERSPECTIVE_REGISTRY:
            if key in concept_key or concept_key in key:
                matched_concept = key
                break

        if not matched_concept:
            # Fallback to standard generic baseline
            return PersonalizedContext(
                interest="Curriculum Standard",
                domain="Applied Sciences & Engineering",
                headline=f"Standard Curriculum Formulation for {concept_name}",
                analogy_explanation=f"Examine the core mechanical and mathematical principles of {concept_name} as defined in the curriculum standard.",
                real_world_application=f"{concept_name} provides foundational methods across modern engineering and scientific discovery.",
                related_domains=["foundational science", "engineering methods"],
                relevance_score=1.0,
            )

        perspectives = cls.PERSPECTIVE_REGISTRY[matched_concept]

        # 1. Check explicit preferred interest if specified
        if preferred_interest:
            norm_preferred = cls.normalize_interest(preferred_interest)
            if norm_preferred in perspectives:
                return perspectives[norm_preferred]

        # 2. Check student's registered interests in order of preference
        if student_interests:
            for interest in student_interests:
                norm_interest = cls.normalize_interest(interest)
                if norm_interest in perspectives:
                    return perspectives[norm_interest]

        # 3. Fallback to curriculum standard baseline
        if matched_concept in cls.STANDARD_BASELINE:
            return cls.STANDARD_BASELINE[matched_concept]

        # 4. Fallback to first available perspective
        first_key = next(iter(perspectives.keys()))
        return perspectives[first_key]

    @classmethod
    def get_all_perspectives_for_concept(cls, concept_name: str) -> List[PersonalizedContext]:
        """
        Returns all curated contextual perspectives available for a concept.
        Enables students to toggle perspectives dynamically on the topic/lesson view.
        """
        concept_key = concept_name.lower().strip()
        matched_concept = None
        for key in cls.PERSPECTIVE_REGISTRY:
            if key in concept_key or concept_key in key:
                matched_concept = key
                break

        results: List[PersonalizedContext] = []

        if matched_concept:
            # Standard baseline first
            if matched_concept in cls.STANDARD_BASELINE:
                results.append(cls.STANDARD_BASELINE[matched_concept])

            # All domain perspectives
            for ctx in cls.PERSPECTIVE_REGISTRY[matched_concept].values():
                results.append(ctx)

        return results

    @classmethod
    def get_recommended_topics(
        cls,
        student_interests: Optional[List[str]] = None,
        favorite_subjects: Optional[List[str]] = None,
        education_category: Optional[str] = None,
    ) -> List[RecommendedTopic]:
        """
        Generates personalized topic exploration cards for the student dashboard.
        Tailors recommendations to student interests while preserving complete functionality
        when student has no registered interests, strictly isolated by education level.
        """
        recommendations: List[RecommendedTopic] = []
        cat = (education_category or "").lower().strip().replace("-", " ").replace("–", " ")

        # Check for Primary or Secondary student to prevent inappropriate CS concepts
        is_primary = any(k in cat for k in ["primary", "class 1 5", "k 5", "elementary"])
        is_secondary = any(k in cat for k in ["secondary", "class 6 10", "middle", "6 to 10"])
        is_higher_sec = any(k in cat for k in ["higher secondary", "class 11 12", "senior secondary", "11 to 12"])

        # If student has registered interests, build tailored recommendations
        if student_interests and len(student_interests) > 0:
            for interest in student_interests:
                norm = cls.normalize_interest(interest)
                if norm == "Gaming":
                    if is_secondary:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Force and Pressure Dynamics",
                                subject="General Science",
                                slug="force-pressure-dynamics",
                                matched_interest="Gaming",
                                headline="Physics Engines & Collision Impact Forces",
                                summary="How game ragdoll physics simulates push and pull forces ($F = ma$) in real-time virtual environments.",
                                target_url="/learn?q=Force%20and%20Pressure%20Dynamics&interest=Gaming",
                            )
                        )
                elif norm == "Cars":
                    if is_primary:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Addition and Subtraction",
                                subject="Primary Mathematics",
                                slug="addition-and-subtraction",
                                matched_interest="Cars",
                                headline="Counting and Speed Metrics in Toy Cars",
                                summary="Learn how grouping and calculating distances helps track car races and lap times.",
                                target_url="/learn?q=Addition%20and%20Subtraction&interest=Cars",
                            )
                        )
                    elif is_secondary:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Force and Pressure Dynamics",
                                subject="General Science",
                                slug="force-pressure-dynamics",
                                matched_interest="Cars",
                                headline="Hydraulic Brakes & Fluid Pressure",
                                summary="How braking pedal force is multiplied through hydraulic fluid pressure ($P = F/A$) to stop a car.",
                                target_url="/learn?q=Force%20and%20Pressure%20Dynamics&interest=Cars",
                            )
                        )
                    else:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Doppler Effect",
                                subject="Physics",
                                slug="doppler-effect",
                                matched_interest="Cars",
                                headline="Formula 1 Acoustic Telemetry & Engine Pitch",
                                summary="Why high-revving racing engines drop in acoustic pitch as they pass the pit straight at 320 km/h.",
                                target_url="/learn?q=Doppler%20Effect&interest=Cars",
                            )
                        )
                elif norm in ["Space", "Cricket", "Music"]:
                    if is_primary:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Living and Non-Living Things",
                                subject="Environmental Studies",
                                slug="living-and-non-living-things",
                                matched_interest=norm,
                                headline="Natural Environments & Living Organisms",
                                summary="Discover how plants, animals, and ecosystems thrive in our world.",
                                target_url="/learn?q=Living%20and%20Non-Living%20Things",
                            )
                        )
                    elif is_secondary:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Force and Pressure Dynamics",
                                subject="General Science",
                                slug="force-pressure-dynamics",
                                matched_interest=norm,
                                headline="Atmospheric Pressure & Mechanical Forces",
                                summary="Understand the fundamental dynamics of force and air pressure on earth and beyond.",
                                target_url="/learn?q=Force%20and%20Pressure%20Dynamics",
                            )
                        )
                    else:
                        recommendations.append(
                            RecommendedTopic(
                                concept="Doppler Effect",
                                subject="Physics",
                                slug="doppler-effect",
                                matched_interest=norm,
                                headline="Acoustic & Wave Propagation Dynamics",
                                summary="Explore how sound waves shift frequency relative to an observer in motion.",
                                target_url=f"/learn?q=Doppler%20Effect&interest={norm}",
                            )
                        )

        # Ensure no duplicates by concept
        seen_concepts = set()
        deduped: List[RecommendedTopic] = []
        for r in recommendations:
            if r.concept not in seen_concepts:
                seen_concepts.add(r.concept)
                deduped.append(r)

        # Standard curriculum fallback if student has no interests or fewer than 2 matches
        if len(deduped) < 2:
            if is_primary:
                defaults = [
                    RecommendedTopic(
                        concept="Addition and Subtraction",
                        subject="Primary Mathematics",
                        slug="addition-and-subtraction",
                        matched_interest="Curriculum Core",
                        headline="Combining Numbers & Difference Calculations",
                        summary="Step through foundational arithmetic with interactive counters and number lines ($3 + 4 = 7$).",
                        target_url="/learn?q=Addition%20and%20Subtraction",
                    ),
                    RecommendedTopic(
                        concept="Living and Non-Living Things",
                        subject="Environmental Studies",
                        slug="living-and-non-living-things",
                        matched_interest="Curriculum Core",
                        headline="Ecosystems, Plants & Natural Surroundings",
                        summary="Discover how living organisms breathe, grow, and interact with the natural environment.",
                        target_url="/learn?q=Living%20and%20Non-Living%20Things",
                    ),
                ]
            elif is_secondary:
                defaults = [
                    RecommendedTopic(
                        concept="Force and Pressure Dynamics",
                        subject="General Science",
                        slug="force-pressure-dynamics",
                        matched_interest="Curriculum Core",
                        headline="Newton's Laws & Fluid Pressure Mechanics",
                        summary="Explore push and pull dynamics, contact forces, and fluid pressure formulas ($P = F / A$, $F = ma$).",
                        target_url="/learn?q=Force%20and%20Pressure%20Dynamics",
                    ),
                    RecommendedTopic(
                        concept="Linear Equations and Slope",
                        subject="Secondary Mathematics",
                        slug="linear-equations-slope",
                        matched_interest="Curriculum Core",
                        headline="Algebraic Slopes & Coordinate Geometry",
                        summary="Understand standard and slope-intercept forms ($y = mx + c$) with interactive coordinate plots.",
                        target_url="/learn?q=Linear%20Equations%20and%20Slope",
                    ),
                ]
            elif is_higher_sec:
                defaults = [
                    RecommendedTopic(
                        concept="Doppler Effect",
                        subject="Physics",
                        slug="doppler-effect",
                        matched_interest="Curriculum Core",
                        headline="Wave Mechanics & Relative Source Velocity",
                        summary="Observe wave compression and calculate observed frequencies for moving sound and light sources.",
                        target_url="/learn?q=Doppler%20Effect",
                    ),
                    RecommendedTopic(
                        concept="Kinematics & Harmonic Motion",
                        subject="Physics",
                        slug="physics",
                        matched_interest="Curriculum Core",
                        headline="Vector Dynamics & Oscillations",
                        summary="Differential equations of harmonic motion and energy conservation in oscillatory systems.",
                        target_url="/learn?q=Physics",
                    ),
                ]

        return deduped[:4]
