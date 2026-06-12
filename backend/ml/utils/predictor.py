"""
NLP Predictor
Loads the trained model and provides intent classification + entity extraction.
This replaces Dialogflow entirely.
"""

import os
import json
import joblib
import numpy as np

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR    = os.path.join(os.path.dirname(SCRIPT_DIR), 'models')
MODEL_PATH   = os.path.join(MODEL_DIR, 'intent_classifier.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')
META_PATH    = os.path.join(MODEL_DIR, 'model_metadata.json')

# ── Load model once at import time ─────────────────────────
_pipeline = None
_encoder  = None
_metadata = None

def _load():
    global _pipeline, _encoder, _metadata
    if _pipeline is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}.\n"
                "Run: python backend/ml/train_model.py"
            )
        _pipeline = joblib.load(MODEL_PATH)
        _encoder  = joblib.load(ENCODER_PATH)
        with open(META_PATH) as f:
            _metadata = json.load(f)
    return _pipeline, _encoder, _metadata


def predict_intent(text: str) -> dict:
    """
    Classify intent and return tag + confidence.
    
    Returns:
        {
          "intent": "trip.plan",
          "confidence": 0.87,
          "all_scores": {"trip.plan": 0.87, "itinerary.generate": 0.05, ...}
        }
    """
    pipeline, encoder, metadata = _load()
    threshold = metadata.get('confidence_threshold', 0.35)

    text_clean = text.lower().strip()
    proba = pipeline.predict_proba([text_clean])[0]
    classes = encoder.classes_

    top_idx = int(np.argmax(proba))
    top_tag  = classes[top_idx]
    top_conf = float(proba[top_idx])

    all_scores = {cls: float(p) for cls, p in zip(classes, proba)}

    if top_conf < threshold:
        top_tag = 'fallback'

    return {
        'intent':     top_tag,
        'confidence': top_conf,
        'all_scores': dict(sorted(all_scores.items(), key=lambda x: -x[1])[:5])
    }


def get_model_info() -> dict:
    """Return model metadata."""
    _, _, metadata = _load()
    return metadata
