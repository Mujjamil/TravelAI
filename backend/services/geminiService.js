const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';
const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

if (!apiKey) {
  console.warn('[Gemini] GEMINI_API_KEY is not set. Image place recognition will use fallback response.');
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
  const json = candidate.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeResult(raw) {
  const place = raw?.place || raw || {};
  return {
    place: {
      name: typeof place.name === 'string' && place.name.trim() ? place.name.trim() : 'Unknown place',
      city: typeof place.city === 'string' ? place.city.trim() : '',
      country: typeof place.country === 'string' ? place.country.trim() : '',
      landmark_type: typeof place.landmark_type === 'string' ? place.landmark_type.trim() : 'unknown',
      confidence: clampConfidence(place.confidence),
    },
    notes: typeof raw?.notes === 'string' ? raw.notes.trim() : '',
  };
}

async function analyzePlaceWithGemini({ imageBuffer, mimeType, prompt }) {
  if (!client) {
    return normalizeResult({
      place: {
        name: 'Unknown place',
        city: '',
        country: '',
        landmark_type: 'unknown',
        confidence: 0.2,
      },
      notes: 'Gemini API key is missing.',
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
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: `${instruction} User prompt: ${prompt || 'Identify this place from the photo.'}` },
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        ],
      }],
    });
    const text = result?.response?.text?.() || '';
    const parsed = extractJson(text);
    if (!parsed) {
      return normalizeResult({
        place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.3 },
        notes: text.slice(0, 300),
      });
    }
    return normalizeResult(parsed);
  } catch (err) {
    console.error('[Gemini Vision] Error:', err.message);
    return normalizeResult({
      place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.2 },
      notes: 'Gemini vision API unavailable.',
    });
  }
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

async function getTextFallbackResponse(message, locale = 'en') {
  if (!client) return getStaticFallbackResponse(locale);
  try {
    const textModel = client.getGenerativeModel({
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash',
    });
    const result = await textModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `${buildTextSystem(locale)}\n\nUser: ${String(message || '')}` }],
      }],
    });
    const text = result?.response?.text?.() || '';
    return text.trim() || getStaticFallbackResponse(locale);
  } catch (err) {
    console.error('[Gemini Text] Error:', err.message);
    return getStaticFallbackResponse(locale);
  }
}

module.exports = { analyzePlaceWithGemini, getTextFallbackResponse, getStaticFallbackResponse };
