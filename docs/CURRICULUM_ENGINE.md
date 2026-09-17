# NEXORA — Learning Module & Curriculum Engine
## Master Prompt 05 Architectural Documentation

### 1. Overview
The Learning Module & Curriculum Engine establishes the core educational foundation of NEXORA. It structures academic learning into a scalable, normalized 5-tier hierarchy:

$$\text{Subject} \longrightarrow \text{Topic} \longrightarrow \text{Concept} \longrightarrow \text{Learning Module} \longrightarrow \text{Lesson / Content}$$

The student navigates smoothly from high-level academic domains down to atomic educational lessons without encountering technical database terminology, fake statistics, or synthetic progress percentages.

---

### 2. The 5-Tier Academic Hierarchy

| Tier | Entity | Conceptual Role | Example |
| :--- | :--- | :--- | :--- |
| **Level 1** | `Subject` | Broad academic domain of study | Data Structures & Algorithms, Operating Systems, Database Management Systems |
| **Level 2** | `Topic` | Focused thematic syllabus area | Arrays & Search, Trees & Hierarchies, CPU Scheduling |
| **Level 3** | `Concept` | Learnable scientific/technical principle | Binary Search Tree, Tree Traversals, Invariant |
| **Level 4** | `LearningModule` | Experiential learning unit with objectives & duration | Foundations of Binary Search Trees (20 mins) |
| **Level 5** | `Lesson` | Atomic readable educational content unit | The BST Invariant & Structural Mechanics (7 mins) |

---

### 3. Database Schema & RLS Security

#### Relational Structure
- `subjects`: `id` (UUID PK), `name`, `slug` (UNIQUE), `description`, `icon`, `category`, `difficulty_level`, `order_index`, `is_active`.
- `topics`: `id` (UUID PK), `subject_id` (FK $\to$ `subjects.id` ON DELETE CASCADE), `name`, `slug`, `description`, `order_index`, `is_active`.
- `concepts`: `id` (UUID PK), `topic_id` (FK $\to$ `topics.id` ON DELETE CASCADE), `name`, `slug` (UNIQUE), `summary`, `short_description`, `difficulty`, `difficulty_level`, `order_index`, `is_active`.
- `learning_modules`: `id` (UUID PK), `concept_id` (FK $\to$ `concepts.id` ON DELETE CASCADE), `title`, `slug`, `description`, `learning_objective`, `difficulty_level`, `estimated_minutes`, `why_it_matters`, `simple_explanation`, `technical_explanation`, `visualization_type`, `experiment_type`, `simulation_config`, `prerequisites`, `order_index`, `is_active`.
- `lessons`: `id` (UUID PK), `module_id` (FK $\to$ `learning_modules.id` ON DELETE CASCADE), `title`, `slug`, `content_type` (`explanation`, `example`, `definition`, `key_points`, `visual`, `exercise`, `reading`), `content` (Markdown), `display_order`, `estimated_minutes`, `is_active`.

#### Security & Content Ownership Model
- **System Educational Content**: `subjects`, `topics`, `concepts`, `learning_modules`, `lessons` are public curriculum content.
  - RLS Policy: `FOR SELECT USING (true)` (Read-only for students).
  - Students cannot create, modify, or delete curriculum content.
- **User-Owned Private Data**: Student profiles, notes, chat sessions, documents, and progress records remain strictly isolated via `auth.uid() = user_id`.

---

### 4. REST API Specification

All endpoints are mounted under `/api/v1/learning/` and aliased under `/api/v1/`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/learning/subjects` | List active subjects with topic & concept counts |
| `GET` | `/api/v1/learning/subjects/{slug_or_id}` | Subject detail with topics syllabus |
| `GET` | `/api/v1/learning/subjects/{slug_or_id}/topics` | List topics for a subject |
| `GET` | `/api/v1/learning/topics/{slug_or_id}` | Topic detail with core concepts |
| `GET` | `/api/v1/learning/topics/{slug_or_id}/concepts` | List concepts for a topic |
| `GET` | `/api/v1/learning/concepts/{slug_or_id}` | Concept detail with learning modules |
| `GET` | `/api/v1/learning/concepts/{slug_or_id}/modules` | List learning modules for a concept |
| `GET` | `/api/v1/learning/modules/{slug_or_id}` | Module detail with lessons syllabus & prerequisites |
| `GET` | `/api/v1/learning/modules/{slug_or_id}/lessons` | List lessons for a module |
| `GET` | `/api/v1/learning/lessons/{slug_or_id}` | Lesson detail with prev/next navigation & Prompt 04 interest lens |

---

### 5. Prompt 04 Interest Personalization Integration

The curriculum engine dynamically integrates with Prompt 04 (`PersonalizationService`). When an authenticated student who has selected interests (such as Gaming, Cricket, Cars, Music, Space) opens a lesson:
1. The academic content remains 100% invariant, mathematically and scientifically sound.
2. A contextual perspective is dynamically attached (`personalized_context`), connecting the academic principle to the student's real-world passion (e.g. comparing the BST invariant to game world spatial partitioning or racing telemetry).

---

### 6. Preparation for Future Stages
- **Prompt 06 (RAG + LLM)**: Chunks and documents link directly to stable `subject_id`, `topic_id`, `concept_id`, `module_id`, `lesson_id` foreign keys.
- **Prompt 08 (Quizzes & Adaptive Assessment)**: Assessments attach at the concept or module tier.
- **Prompt 10 & 11 (Virtual Labs & Simulations)**: `simulation_config` and `visualization_type` fields in `learning_modules` provide declarative specifications for interactive labs.
- **Prompt 23 (Knowledge Graph)**: Concepts possess stable UUIDs and slugs for directional prerequisite edges (`Concept A -> Prerequisite -> Concept B`).
