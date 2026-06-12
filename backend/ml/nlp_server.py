#!/usr/bin/env python3
"""
NLP API Server (Flask)
Provides REST endpoints for intent classification and entity extraction.
The Node.js backend calls this service.

Endpoints:
  POST /predict  → { text } → { intent, confidence, entities, missing_slots }
  GET  /health   → { status, model_info }
  POST /reload   → reloads model from disk
"""

import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, request, jsonify
from flask_cors import CORS

from ml.utils.predictor import predict_intent, get_model_info
from ml.utils.entity_extractor import extract_entities, get_missing_required, SLOT_PROMPTS

app = Flask(__name__)
CORS(app)

# ── Session store (in-memory for slot filling) ─────────────
# In production, replace with Redis
sessions = {}
ALLOWED_INTENT_HINTS = {'trip.plan'}


def extract_slot_destination(text):
    value = ' '.join(str(text or '').strip().split())
    value = value.strip('.,!?;:')
    value = re.sub(r'^(?:to|in|at|visit)\s+', '', value, flags=re.IGNORECASE)
    if not value or len(value) > 80:
        return None
    if len(value.split()) > 8:
        return None
    if not re.search(r'[^\W\d_]', value, flags=re.UNICODE):
        return None
    return value


@app.route('/health', methods=['GET'])
def health():
    try:
        info = get_model_info()
        return jsonify({ 'status': 'ok', 'model': info })
    except Exception as e:
        return jsonify({ 'status': 'error', 'message': str(e) }), 500


@app.route('/predict', methods=['POST'])
def predict():
    """
    Main NLP endpoint. Returns:
      - intent: classified intent tag
      - confidence: float 0-1
      - entities: extracted parameters
      - missing_slots: list of required params not yet collected
      - slot_prompt: question to ask user if slots are missing
      - session_context: updated context (for multi-turn)
    """
    body = request.get_json()
    if not body or 'text' not in body:
        return jsonify({'error': 'text field required'}), 400

    text       = body['text']
    session_id = body.get('session_id', 'default')
    intent_hint = body.get('intent_hint')
    reset_context = body.get('reset_context') is True

    if reset_context:
        sessions.pop(session_id, None)

    # ── Intent Classification ──────────────────────────────
    result = predict_intent(text)
    intent = intent_hint if intent_hint in ALLOWED_INTENT_HINTS else result['intent']
    conf   = 1.0 if intent_hint in ALLOWED_INTENT_HINTS else result['confidence']

    # ── Entity Extraction ──────────────────────────────────
    new_entities = extract_entities(text)

    # ── Session / Context Management ──────────────────────
    # Merge new entities with existing session context
    ctx = sessions.get(session_id, {
        'intent': None,
        'entities': {},
        'turn': 0
    })

    prev_intent = ctx.get('intent')
    prev_entities = ctx.get('entities', {})
    prev_missing = get_missing_required(prev_intent, prev_entities) if prev_intent else []

    # When the bot explicitly asked for a destination, accept a free-form
    # city/place even if it is not in the curated destination dictionary.
    if prev_missing and prev_missing[0] == 'destination' and not new_entities.get('destination'):
        slot_destination = extract_slot_destination(text)
        if slot_destination:
            new_entities['destination'] = slot_destination

    has_new_entity = any(v is not None for v in new_entities.values())
    short_reply = len(text.strip().split()) <= 4
    text_lower = text.lower()
    is_control_text = any(k in text_lower for k in ['cancel', 'start over', 'reset', 'bye', 'thanks', 'thank you'])
    expected_slot_answer = bool(prev_missing and new_entities.get(prev_missing[0]) is not None)

    # Keep the active intent while the user answers required slot prompts.
    # A short answer such as "5 days" may otherwise classify as itinerary,
    # and "budget" may otherwise classify as budget estimation.
    if (
        prev_intent and prev_intent not in ('fallback', 'welcome') and
        prev_missing and
        not is_control_text and
        (
            expected_slot_answer or
            (intent in ('fallback', 'welcome') and (has_new_entity or short_reply))
        )
    ):
        intent = prev_intent

    # Preserve context from previous turns if still relevant
    if intent not in ('fallback', 'welcome') and intent != ctx.get('intent'):
        # New intent — start fresh but keep destination if already set
        kept = {}
        if ctx['entities'].get('destination'):
            kept['destination'] = ctx['entities']['destination']
        ctx = {'intent': intent, 'entities': kept, 'turn': 0}

    ctx['turn'] += 1

    # Merge entities (new values override old)
    for k, v in new_entities.items():
        if v is not None:
            ctx['entities'][k] = v

    ctx['intent'] = intent
    sessions[session_id] = ctx

    # ── Slot Filling ───────────────────────────────────────
    missing = get_missing_required(intent, ctx['entities'])
    slot_prompt = SLOT_PROMPTS.get(missing[0]) if missing else None

    return jsonify({
        'intent':          intent,
        'confidence':      round(conf, 4),
        'entities':        ctx['entities'],
        'missing_slots':   missing,
        'slot_prompt':     slot_prompt,
        'needs_more_info': len(missing) > 0,
        'top_intents':     result['all_scores'],
        'session_context': ctx
    })


@app.route('/session/<session_id>', methods=['DELETE'])
def clear_session(session_id):
    """Clear session context (e.g., when user says 'start over')."""
    sessions.pop(session_id, None)
    return jsonify({'cleared': session_id})


@app.route('/reload', methods=['POST'])
def reload_model():
    """Hot-reload model after retraining."""
    try:
        import importlib
        import ml.utils.predictor as pred
        pred._pipeline = None
        pred._encoder  = None
        pred._metadata = None
        info = pred.get_model_info()
        return jsonify({'status': 'reloaded', 'model': info})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('NLP_PORT', 5001))
    print(f"🤖 NLP API running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
