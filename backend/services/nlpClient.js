/**
 * NLP Client
 * Node.js ↔ Python NLP Server bridge.
 * Calls the local Flask NLP API for intent + entity extraction.
 */

const axios = require('axios');

const NLP_URL = process.env.NLP_SERVER_URL || 'http://127.0.0.1:5001';

/**
 * Classify intent and extract entities from user text.
 * @param {string} text - Raw user message
 * @param {string} sessionId - Session ID for multi-turn context
 * @returns {Promise<{intent, confidence, entities, missing_slots, slot_prompt, needs_more_info}>}
 */
async function analyzeMessage(text, sessionId = 'default', options = {}) {
  const payload = {
    text,
    session_id: sessionId,
    intent_hint: options.intentHint || undefined,
    reset_context: options.resetContext === true,
  };
  try {
    const response = await axios.post(`${NLP_URL}/predict`, payload, { timeout: 10000 });

    return response.data;

  } catch (err) {
    try {
      const retry = await axios.post(`${NLP_URL}/predict`, payload, { timeout: 10000 });
      return retry.data;
    } catch (retryErr) {
      const details = retryErr?.response?.status
        ? `status ${retryErr.response.status}`
        : retryErr.code || retryErr.message;
      console.error('[NLP Client] Error:', details);

      return {
        intent: 'fallback',
        confidence: 0,
        entities: {},
        missing_slots: [],
        needs_more_info: false,
        error: 'NLP server unavailable'
      };
    }
  }
}

async function checkNLPHealth() {
  try {
    const res = await axios.get(`${NLP_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch {
    return { status: 'unavailable' };
  }
}

async function clearSession(sessionId) {
  try {
    await axios.delete(`${NLP_URL}/session/${sessionId}`);
  } catch { /* ignore */ }
}

module.exports = { analyzeMessage, checkNLPHealth, clearSession };
