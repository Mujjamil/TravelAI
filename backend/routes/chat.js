/**
 * Chat Route
 * POST /api/chat
 * Receives user message → NLP analysis → response generation
 */

const express = require('express');
const router  = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { analyzeMessage, clearSession } = require('../services/nlpClient');
const responseEngine = require('../services/responseEngine');
const { getTextFallbackResponse, getStaticFallbackResponse, analyzeAndRespond } = require('../services/groqService');
const { recognizePlaceFromImage } = require('../services/placeRecognitionService');
const db = require('../db/travelDb');
const { t } = require('../i18n');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const getConversationStmt = db.prepare(`
  SELECT * FROM chat_conversations
  WHERE id = ? AND user_id = ?
`);
const insertConversationStmt = db.prepare(`
  INSERT INTO chat_conversations (
    id, user_id, trip_id, title, created_at, updated_at, last_message_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updateConversationTripStmt = db.prepare(`
  UPDATE chat_conversations
  SET trip_id = ?, updated_at = ?
  WHERE id = ? AND user_id = ?
`);
const touchConversationStmt = db.prepare(`
  UPDATE chat_conversations
  SET updated_at = ?, last_message_at = ?
  WHERE id = ? AND user_id = ?
`);
const insertMessageStmt = db.prepare(`
  INSERT INTO chat_messages (
    id, conversation_id, role, content, meta_json, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`);
const validTripStmt = db.prepare(`
  SELECT id FROM trips
  WHERE id = ? AND user_id = ?
`);

function appendConversationMessage({ conversationId, role, content, meta, now }) {
  insertMessageStmt.run(
    uuidv4(),
    conversationId,
    role,
    content,
    JSON.stringify(meta || {}),
    now
  );
}

function ensureConversation({ userId, conversationId, tripId, initialTitle }) {
  const now = new Date().toISOString();
  let convId = conversationId || null;
  if (convId) {
    const existing = getConversationStmt.get(convId, userId);
    if (!existing) return { error: 'Conversation not found', status: 404 };
    if (tripId && validTripStmt.get(tripId, userId) && existing.trip_id !== tripId) {
      updateConversationTripStmt.run(tripId, now, convId, userId);
    }
    return { id: convId };
  }
  const safeTrip = tripId && validTripStmt.get(tripId, userId) ? tripId : null;
  convId = uuidv4();
  insertConversationStmt.run(convId, userId, safeTrip, (initialTitle || 'New Conversation').slice(0, 120), now, now, now);
  return { id: convId };
}

router.post('/', async (req, res) => {
  const {
    message,
    sessionId = 'default-session',
    conversationId,
    tripId,
    intentHint,
    resetContext,
  } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const conv = ensureConversation({
      userId: req.user.id,
      conversationId,
      tripId,
      initialTitle: message.trim(),
    });
    if (conv.error) return res.status(conv.status).json({ error: conv.error });
    const targetConversationId = conv.id;
    const userNow = new Date().toISOString();
    appendConversationMessage({
      conversationId: targetConversationId,
      role: 'user',
      content: message.trim(),
      meta: { sessionId, source: 'chat', locale: req.locale },
      now: userNow,
    });

    // ── Step 1: NLP Analysis ───────────────────────────────
    const safeIntentHint = intentHint === 'trip.plan' ? intentHint : null;
    const nlp = await analyzeMessage(message, sessionId, {
      intentHint: safeIntentHint,
      resetContext: resetContext === true && safeIntentHint === 'trip.plan',
    });
    const { intent, confidence, entities, missing_slots, slot_prompt, needs_more_info } = nlp;

    console.log(`[Chat] Session:${sessionId.slice(-6)} | Intent:${intent} (${(confidence*100).toFixed(0)}%) | Entities:`, entities);

    // ── Step 2: Slot Filling (ask for missing required info) ─
    if (needs_more_info && slot_prompt) {
      const slotKey = missing_slots[0] || null
      const localizedSlotPrompt = slotKey ? t(req.locale, `chat.slotPrompts.${slotKey}`) : null
      const promptText = localizedSlotPrompt && !String(localizedSlotPrompt).startsWith('chat.slotPrompts.')
        ? localizedSlotPrompt
        : slot_prompt
      const slotNow = new Date().toISOString();
      appendConversationMessage({
        conversationId: targetConversationId,
        role: 'bot',
        content: promptText,
        meta: { intent, confidence, entities, awaiting: slotKey, locale: req.locale },
        now: slotNow,
      });
      touchConversationStmt.run(slotNow, slotNow, targetConversationId, req.user.id);
      return res.json({
        reply: promptText,
        intent,
        entities,
        awaiting: slotKey,
        sessionId,
        conversationId: targetConversationId
      });
    }

    // ── Step 3: Generate Response ──────────────────────────
    let reply;
    let effectiveIntent    = intent;
    let effectiveEntities  = entities;
    let effectiveConfidence = Math.round(confidence * 100);
    let aiModel = null;

    // When NLP server is offline (fallback intent), delegate fully to Groq:
    // it classifies intent, extracts entities, enforces travel-only, and writes the reply.
    if (intent === 'fallback' || confidence < 0.3) {
      const groq = await analyzeAndRespond(message, req.locale);
      reply              = groq.reply;
      effectiveIntent    = groq.intent;
      effectiveEntities  = groq.entities;
      effectiveConfidence = groq.confidence;
      aiModel            = groq.model;
    } else {
      switch (intent) {
        case 'welcome':
          reply = responseEngine.getWelcome(req.locale);
          break;
        case 'trip.plan':
          reply = responseEngine.tripPlan(entities, req.locale);
          break;
        case 'itinerary.generate':
          reply = responseEngine.itinerary(entities, req.locale);
          break;
        case 'budget.estimate':
          reply = responseEngine.budget(entities, req.locale);
          break;
        case 'flight.search':
          reply = responseEngine.flights(entities, req.locale);
          break;
        case 'hotel.search':
          reply = responseEngine.hotels(entities, req.locale);
          break;
        case 'packing.assist':
          reply = responseEngine.packing(entities, req.locale);
          break;
        case 'weather.check':
          reply = responseEngine.weather(entities, req.locale);
          break;
        case 'destination.recommend':
          reply = responseEngine.recommend(entities, req.locale);
          break;
        case 'user.preferences':
          reply = responseEngine.preferences(entities, req.locale);
          break;
        default:
          reply = await getTextFallbackResponse(message, req.locale);
      }
    }

    const botNow = new Date().toISOString();
    appendConversationMessage({
      conversationId: targetConversationId,
      role: 'bot',
      content: reply,
      meta: { intent: effectiveIntent, confidence: effectiveConfidence, entities: effectiveEntities, model: aiModel, locale: req.locale },
      now: botNow,
    });
    touchConversationStmt.run(botNow, botNow, targetConversationId, req.user.id);

    return res.json({
      reply,
      intent:     effectiveIntent,
      confidence: effectiveConfidence,
      entities:   effectiveEntities,
      model:      aiModel,
      sessionId,
      conversationId: targetConversationId
    });

  } catch (err) {
    console.error('[Chat Route Error]', err.message);
    const fallback = await getTextFallbackResponse(message, req.locale)
      .catch(() => getStaticFallbackResponse(req.locale));
    return res.json({ reply: fallback, intent: 'error', sessionId, conversationId: conversationId || null });
  }
});

router.post('/recognize-place', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'file_too_large', message: 'Image must be 5MB or smaller.' });
    }
    if (err) {
      return res.status(400).json({ error: 'invalid_upload', message: 'Failed to process uploaded image.' });
    }

    const file = req.file;
    const { sessionId = 'default-session', message = '' } = req.body || {};

    if (!file) {
      return res.status(400).json({ error: 'image_required', message: 'Please upload an image file.' });
    }
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype)) {
      return res.status(400).json({ error: 'unsupported_file_type', message: 'Supported image types: JPEG, PNG, WEBP.' });
    }

    try {
      const result = await recognizePlaceFromImage({
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        userPrompt: message,
        sessionId,
      });

      return res.json({
        reply: result.reply,
        place: result.place,
        suggestions: result.suggestions,
        provider: result.provider,
        intent: 'place.recognition',
        sessionId,
      });
    } catch (e) {
      console.error('[Chat Recognize Place Error]', e.message);
      return res.status(500).json({
        error: 'recognition_failed',
        message: e.message || 'Unable to recognize the place from this image right now.',
      });
    }
  });
});

// Clear conversation context
router.delete('/session/:id', async (req, res) => {
  await clearSession(req.params.id);
  res.json({ cleared: true });
});

// NLP health check
router.get('/nlp-health', async (req, res) => {
  const { checkNLPHealth } = require('../services/nlpClient');
  const health = await checkNLPHealth();
  res.json(health);
});

module.exports = router;
