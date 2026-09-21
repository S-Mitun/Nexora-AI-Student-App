import hashlib
from typing import List, Dict, Any, Optional, Type
from pydantic import BaseModel
from app.services.ai.base import AIProvider
from app.core.logging import logger


class MockAIProvider(AIProvider):
    """
    Deterministic Educational AI Provider for local development and testing.
    Provides verifiable, curriculum-grade experiential breakdowns without requiring API keys.
    """

    # Real, curated concept experiences for instant local learning
    KNOWN_CONCEPTS: Dict[str, Dict[str, Any]] = {
        "doppler effect": {
            "concept": "Doppler Effect",
            "domain": "Physics (Wave Mechanics)",
            "tagline": "Why sirens shift pitch as an ambulance rushes past you.",
            "why_it_matters": "The Doppler effect is fundamental to astronomical discoveries (like the expanding universe via redshift), radar weather tracking, and medical ultrasound imaging.",
            "simple_explanation": "Imagine a duck bobbing on water creating ripples. If the duck sits still, waves spread evenly in all directions. But if the duck swims forward while bobbing, it chases its own wavefronts! The waves in front bunch together (shorter wavelength, higher frequency/pitch), while waves behind stretch apart.",
            "technical_explanation": "The change in observed frequency f' occurs because relative motion modifies the spatial density of wavefronts. For a stationary observer and moving source: f' = f * (v / (v ∓ v_s)), where v is the wave propagation velocity and v_s is the source velocity.",
            "simulation": {
                "simulation_type": "wave_compression",
                "parameters": {
                    "source_velocity": 40,
                    "wave_speed": 100,
                    "source_frequency": 2.0,
                },
                "controls": [
                    {"id": "source_velocity", "label": "Source Velocity (m/s)", "min": 0, "max": 90, "default": 40, "step": 5},
                    {"id": "source_frequency", "label": "Source Frequency (Hz)", "min": 1, "max": 5, "default": 2, "step": 0.5},
                ],
            },
            "practical_application": "Police radar guns bounce radio waves off moving vehicles and measure the frequency change to determine exact vehicle speed in milliseconds.",
            "quick_check_question": "When an ambulance with a siren approaches you, what happens to the observed pitch?",
            "quick_check_options": [
                "It sounds higher because wavefronts reach you with less time between them.",
                "It sounds lower because sound travels slower towards you.",
                "It remains completely unchanged.",
                "It drops to zero."
            ],
            "quick_check_answer_index": 0,
        },
        "binary search": {
            "concept": "Binary Search",
            "domain": "Computer Science (Algorithms)",
            "tagline": "How to find 1 item out of 1,000,000 in only 20 comparisons.",
            "why_it_matters": "Every database query index, dictionary lookup, and version control bisect command relies on logarithmic search to operate instantly over massive datasets.",
            "simple_explanation": "If you guess a number between 1 and 100 and a friend says 'Higher' or 'Lower', guessing 50 immediately eliminates half the remaining numbers. Repeating this cuts the search space in half every single step.",
            "technical_explanation": "Operates on a monotonic (sorted) sequence. At each iteration, compares target value to median element: arr[mid]. If target < arr[mid], right = mid - 1; else left = mid + 1. Achieves O(log n) time complexity and O(1) auxiliary space.",
            "simulation": {
                "simulation_type": "tree_traversal",
                "parameters": {
                    "array_size": 15,
                    "target_value": 42,
                    "sorted_elements": [3, 7, 11, 14, 19, 23, 29, 34, 42, 49, 56, 63, 71, 85, 92],
                },
                "controls": [
                    {"id": "target_value", "label": "Target Value to Find", "min": 3, "max": 92, "default": 42, "step": 1},
                ],
            },
            "practical_application": "Database B-Trees and Git Bisect use binary search to identify buggy commits across thousands of code revisions in seconds.",
            "quick_check_question": "What is the mandatory prerequisite for running Binary Search on an array?",
            "quick_check_options": [
                "The array must be strictly sorted.",
                "The array must have an even number of elements.",
                "The array must only contain integers.",
                "The array must fit entirely in CPU L1 cache."
            ],
            "quick_check_answer_index": 0,
        },
        "convolutional neural network": {
            "concept": "Convolutional Neural Network (CNN)",
            "domain": "Computer Science (Deep Learning)",
            "tagline": "Teaching computers to recognize patterns using spatial filters.",
            "why_it_matters": "CNNs power autonomous driving vision, MRI anomaly detection, facial recognition, and satellite imagery analysis.",
            "simple_explanation": "Think of a small magnifying glass sliding across a picture grid. As it slides, it looks for specific small patterns—first sharp edges, then corners, then shapes, and finally full objects like eyes or wheels.",
            "technical_explanation": "Applies learnable convolution kernels over multidimensional tensor inputs to preserve spatial translation invariance. Standard architecture alternates between convolution, non-linear activation (ReLU), pooling (subsampling), and dense layers.",
            "simulation": {
                "simulation_type": "kernel_filter",
                "parameters": {
                    "kernel_size": 3,
                    "filter_type": "edge_detection",
                },
                "controls": [
                    {"id": "filter_type", "label": "Filter Type", "options": ["edge_detection", "blur", "sharpen"], "default": "edge_detection"},
                ],
            },
            "practical_application": "Used in pathology to analyze histopathology slides and detect cancerous cell formations faster and more consistently than manual microscopy.",
            "quick_check_question": "What is the primary benefit of weight sharing in convolutional layers compared to fully connected layers?",
            "quick_check_options": [
                "Drastically reduces parameter count and enables translation invariance.",
                "Eliminates the need for training data.",
                "Guarantees 100% classification accuracy.",
                "Allows the network to run without matrix multiplication."
            ],
            "quick_check_answer_index": 0,
        },
    }

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        logger.info(f"MockAIProvider generating completion for prompt preview: {prompt[:80]}...")
        return (
            f"[NEXORA Deterministic Tutor Response]\n\n"
            f"You asked: {prompt}\n\n"
            f"In NEXORA's learning model, remember: 'Show me, don't just tell me.' "
            f"Key takeaway: Ground difficult theoretical concepts into observable, visual mechanics."
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: Type[BaseModel],
        system_instruction: Optional[str] = None,
    ) -> BaseModel:
        logger.info(f"MockAIProvider generating structured data for model: {response_model.__name__}")
        
        # Check known concepts
        normalized = prompt.lower().strip()
        matched_key = None
        for key in self.KNOWN_CONCEPTS:
            if key in normalized:
                matched_key = key
                break
        
        if not matched_key:
            raise KeyError(f"Concept query not found in known concepts and no active syllabus grounding exists: '{prompt}'")
            
        data = self.KNOWN_CONCEPTS[matched_key]
        return response_model.model_validate(data)

    async def embed(self, text: str) -> List[float]:
        # Deterministic 128-dimensional embedding from text hash for testing
        hash_digest = hashlib.sha256(text.encode("utf-8")).digest()
        embedding = [(b - 128) / 128.0 for b in hash_digest[:32]] * 4
        return embedding[:128]

    async def analyze(self, content: str, analysis_type: str) -> Dict[str, Any]:
        return {
            "analysis_type": analysis_type,
            "difficulty_rating": "intermediate",
            "estimated_read_time_minutes": max(1, len(content.split()) // 150),
            "key_prerequisites_detected": ["basic algebra", "foundational logic"],
        }
