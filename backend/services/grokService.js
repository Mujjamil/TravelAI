const axios = require('axios');

const apiKey      = process.env.GROK_API_KEY;
const baseUrl     = process.env.GROK_BASE_URL     || 'https://api.x.ai/v1';
const textModel   = process.env.GROK_TEXT_MODEL   || 'grok-3';
const visionModel = process.env.GROK_VISION_MODEL || 'grok-2-vision-1212';

if (!apiKey) {
  console.warn('[Grok] GROK_API_KEY is not set. AI responses will use static fallback.');
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.25;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeResult(raw) {
  const place = raw?.place || raw || {};
  return {
    place: {
      name:           typeof place.name === 'string' && place.name.trim() ? place.name.trim() : 'Unknown place',
      city:           typeof place.city === 'string' ? place.city.trim() : '',
      country:        typeof place.country === 'string' ? place.country.trim() : '',
      landmark_type:  typeof place.landmark_type === 'string' ? place.landmark_type.trim() : 'unknown',
      confidence:     clampConfidence(place.confidence),
    },
    notes: typeof raw?.notes === 'string' ? raw.notes.trim() : '',
  };
}

function getLang(locale) {
  const v = String(locale || '').toLowerCase().trim();
  if (v.startsWith('fr')) return 'fr';
  if (v.startsWith('hi')) return 'hi';
  if (v.startsWith('mr')) return 'mr';
  if (v.startsWith('kn')) return 'kn';
  return 'en';
}

function buildTextSystem(locale) {
  const langMap = { fr: 'French', hi: 'Hindi', mr: 'Marathi', kn: 'Kannada' };
  const lang = getLang(locale);
  const respond = langMap[lang] ? `Respond in ${langMap[lang]}.` : 'Respond in English.';
  return `You are a friendly AI travel planning assistant. Help users plan trips with personalized recommendations for destinations, itineraries, budgets, flights, hotels, and packing. Be concise and warm. Keep responses under 200 words. ${respond}`;
}

function getStaticFallbackResponse(locale = 'en') {
  const lang = getLang(locale);
  const opts = {
    en: [
      "I didn't quite catch that! Try:\n• \"Plan a trip to Bali\"\n• \"Budget for Tokyo 7 days\"\n• \"Hotels in Dubai\"\n• \"Packing list for Iceland\"",
      "I'm not sure about that one! I can help with flights, hotels, itineraries, budgets, and packing. Tell me your destination!",
    ],
    fr: [
      "Je n'ai pas bien compris. Essayez :\n• \"Planifier un voyage à Bali\"\n• \"Budget pour Tokyo 7 jours\"\n• \"Hôtels à Dubaï\"\n• \"Liste de bagages pour l'Islande\"",
      "Je peux aider avec vols, hôtels, itinéraires, budgets et bagages. Dites-moi votre destination !",
    ],
    hi: [
      "मैं समझ नहीं पाया। ये ट्राई करें:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "मैं flights, hotels, itinerary, budget और packing में मदद कर सकता हूँ। अपना destination बताइए!",
    ],
    mr: [
      "मला नीट समजलं नाही. हे ट्राय करा:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "मी flights, hotels, itinerary, budget आणि packing मध्ये मदत करू शकतो. तुमचं destination सांगा!",
    ],
    kn: [
      "ನನಗೆ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ. ಇದನ್ನು ಪ್ರಯತ್ನಿಸಿ:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "ನಾನು flights, hotels, itinerary, budget ಮತ್ತು packing ನಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನಿಮ್ಮ destination ಹೇಳಿ!",
    ],
  };
  const list = opts[lang] || opts.en;
  return list[Math.floor(Math.random() * list.length)];
}

function grokHeaders() {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function analyzePlaceWithGrok({ imageBuffer, mimeType, prompt }) {
  if (!apiKey) {
    return normalizeResult({
      place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.2 },
      notes: 'Grok API key is missing.',
    });
  }

  const instruction = [
    'You are a travel assistant that identifies places from photos.',
    'Return only valid JSON in this shape:',
    '{"place":{"name":"","city":"","country":"","landmark_type":"","confidence":0.0},"notes":""}',
    'confidence must be between 0 and 1.',
    'If uncertain, keep confidence low and place.name as "Unknown place".',
  ].join(' ');

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: visionModel,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `${instruction} User prompt: ${prompt || 'Identify this place from the photo.'}` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBuffer.toString('base64')}` } },
          ],
        }],
      },
      { headers: grokHeaders(), timeout: 30000 }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || '');
    const parsed = extractJson(text);
    if (!parsed) {
      return normalizeResult({
        place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.3 },
        notes: text.slice(0, 300),
      });
    }
    return normalizeResult(parsed);
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.error?.message || err.message;
    console.error(`[Grok Vision] Error (${status || 'unknown'}): ${msg}`);
    return normalizeResult({
      place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.2 },
      notes: 'Grok vision API unavailable.',
    });
  }
}

async function getTextFallbackResponse(message, locale = 'en') {
  if (!apiKey) return getStaticFallbackResponse(locale);

  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: textModel,
        temperature: 0.6,
        messages: [
          { role: 'system', content: buildTextSystem(locale) },
          { role: 'user',   content: String(message || '') },
        ],
      },
      { headers: grokHeaders(), timeout: 15000 }
    );

    const text = String(response?.data?.choices?.[0]?.message?.content || '').trim();
    return text || getStaticFallbackResponse(locale);
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.error?.message || err.message;
    console.error(`[Grok Text] Error (${status || 'unknown'}): ${msg}`);
    return getStaticFallbackResponse(locale);
  }
}

module.exports = { analyzePlaceWithGrok, getTextFallbackResponse, getStaticFallbackResponse };
