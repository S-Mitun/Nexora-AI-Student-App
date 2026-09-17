# NEXORA Personalization Engine Architecture
**Master Prompt 04: Interest & Hobby Personalization Foundation**

---

## 1. Overview & Core Philosophy

NEXORA’s personalization engine grounds abstract STEM concepts into relatable real-world systems that students personally care about (e.g. Gaming, Cricket, Cars, Music, Space, Coding).

> **Academic Rigor Principle**: Personalization changes **only** the motivational framing, intuitive analogies, and practical engineering applications. Mathematical formulas, scientific laws, formal proofs, and code algorithms remain **100% factually identical** for all students.

Personalization is **completely optional**. If a student chooses not to configure interests, the application defaults gracefully to standard curriculum models with zero errors or degraded states.

---

## 2. Personalization Data Model & Database Structure

Personalization is keyed strictly on the student's authenticated Supabase user UUID (`current_user.id`). No surrogate keys, separate tables, or duplicate user identities are created.

### Database Columns (`public.profiles`)
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `UUID` (PK) | `auth.users(id)` | Foreign key referencing Supabase Auth user UUID |
| `interests` | `JSONB` / `Text` | `'[]'` | Serialized array of canonical interest categories |
| `custom_interests` | `JSONB` / `Text` | `'[]'` | Serialized array of sanitized write-in hobbies |
| `favorite_subjects`| `JSONB` / `Text` | `'[]'` | Serialized array of favorite subject slugs |
| `preferred_learning_style` | `VARCHAR(50)` | `'visual'` | `'visual'`, `'practical'`, or `'theoretical'` |
| `enable_code_mixing` | `BOOLEAN` | `TRUE` | Conversational bilingual explanation toggle |

### Database Migration
Located at [`supabase/migrations/20260918000000_personalization_engine.sql`](file:///c:/Users/Mitun%20S/.gemini/antigravity/scratch/Nexora%20Project%202/Nexora-AI-Student-App/supabase/migrations/20260918000000_personalization_engine.sql).

---

## 3. Row Level Security (RLS)

All personalization fields reside on `public.profiles` and inherit strict user-isolation policies:
```sql
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
```
No student can read, modify, or infer another student's preferences.

---

## 4. API Endpoints

### Preferences Management
- `GET /api/v1/profile/preferences`
  - **Auth**: Bearer JWT (Required)
  - **Returns**: `StudentPreferencesRead` (`interests`, `custom_interests`, `favorite_subjects`, `preferred_learning_style`, `enable_code_mixing`).
- `PATCH /api/v1/profile/preferences`
  - **Auth**: Bearer JWT (Required)
  - **Payload**: `StudentPreferencesUpdate` (normalizes casing, deduplicates, and sanitizes custom write-ins).
- `POST /api/v1/profile/preferences/reset`
  - **Auth**: Bearer JWT (Required)
  - **Action**: Resets interests and custom write-ins to empty arrays and restores default learning style (`'visual'`).

### Experiential Learning & Recommendations
- `POST /api/v1/learning/explore`
  - **Auth**: Optional Bearer JWT
  - **Payload**: `{"query": "Doppler Effect", "subject_hint": "physics", "interest_hint": "Cars"}`
  - **Returns**: `ConceptExploreResponse` with standard curriculum breakdown (`technical_explanation`, `simulation`), `personalized_context` (tailored to student's interest), and `available_perspectives` (all available domain viewpoints for on-demand perspective toggling).
- `GET /api/v1/learning/recommendations`
  - **Auth**: Optional Bearer JWT
  - **Returns**: List of `RecommendedTopic` cards tailored to the student's active interests. Falls back to foundational curriculum topics if no interests are configured.
- `GET /api/v1/learning/perspectives/{concept_slug}`
  - **Auth**: Public
  - **Returns**: All available interest perspectives for a concept.

---

## 5. Personalization Mapping Matrix

The deterministic `PersonalizationService` maps STEM principles across 13 canonical categories:

1. **Gaming**: Game engine spatial partitioning, collision bounding volume hierarchies (BVH), real-time vector dot products for audio listeners, and post-processing convolution shaders.
2. **Cricket & Sports**: UltraEdge acoustic seam contact detection, Hawkeye ball tracking video convolution, delivery speed percentile indexing.
3. **Cars & Automotive (F1)**: Doppler engine acoustic pitch drop, trackside speed radar telemetry, engine control unit (ECU) fuel trim lookup tables under microsecond deadlines.
4. **Music & Acoustics**: Rotary Leslie speaker Doppler chorus effects, synthesizer MIDI note bisection, vocal frequency quantization.
5. **Space & Astronomy**: Cosmic redshift and galaxy recession velocities, ephemeris orbital plane crossing search, exoplanet transit detection.
6. **Coding & Software Systems**: Logarithmic bisection in Git Bisect, database B+ Trees, real-time Web Audio API vector velocity pipelines.
7. **Robotics**: Sensor fusion, kinematic state estimation, motor encoder interpolation.
8. **AI & Machine Learning**: Tensor convolution kernels, weight sharing in CNNs, spatial translation invariance.
9. **Biotechnology**: Medical ultrasound Doppler imaging, MRI spatial filtering, genomics search.
10. **Finance**: Order book bisection, algorithmic tick data searching, stochastic volatility.
11. **Photography & Optics**: Computational bokeh simulation, 2D aperture convolution filters.
12. **Design & Digital Art**: Spatial subdivision, vector bezier rasterization.
13. **Fundamental Science**: Standard physical mechanics, wave equations, mathematical proofs.

---

## 6. How Future Learning Modules Consume Personalization

Future learning systems (e.g. Master Prompt 06 RAG, Master Prompt 10 Virtual Labs, Master Prompt 18 Progress) consume personalization via the `PersonalizationService`:

```python
from app.services.learning.personalization_service import PersonalizationService

# 1. Fetch relevant contextual analogy
context = PersonalizationService.get_personalization_for_concept(
    concept_name="Breadth-First Search",
    student_interests=user_profile.interests,
)

# 2. Inject context into explanation without altering formal complexity or correctness
lesson_headline = context.headline
lesson_analogy = context.analogy_explanation
lesson_application = context.real_world_application
```

This ensures future generative or simulation modules always ground their scenarios into what the student cares about while honoring academic correctness.
