const axios = require('axios');

const apiKey = process.env.KIMI_API_KEY;
const baseUrl = process.env.KIMI_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const modelName = process.env.KIMI_VISION_MODEL || 'moonshotai/kimi-k2-instruct';
const textModelName = process.env.KIMI_TEXT_MODEL || 'moonshotai/kimi-k2-instruct';
const fallbackVisionModel = process.env.KIMI_IMAGE_FALLBACK_MODEL || 'meta/llama-3.2-90b-vision-instruct';

if (!apiKey) {
  console.warn('[Kimi] KIMI_API_KEY is not set. Kimi text fallback will use static replies and vision recognition is disabled.');
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

function getLang(locale) {
  const value = String(locale || '').toLowerCase().trim();
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('hi')) return 'hi';
  if (value.startsWith('mr')) return 'mr';
  if (value.startsWith('kn')) return 'kn';
  return 'en';
}

function languageInstruction(locale) {
  const lang = getLang(locale);
  if (lang === 'fr') return 'Respond in French.';
  if (lang === 'hi') return 'Respond in Hindi.';
  if (lang === 'mr') return 'Respond in Marathi.';
  if (lang === 'kn') return 'Respond in Kannada.';
  return 'Respond in English.';
}

function buildTextFallbackSystem(locale) {
  return `You are a friendly AI travel planning assistant. Help users plan trips with personalized recommendations for destinations, itineraries, budgets, flights, hotels, and packing. Be concise and warm. Keep responses under 200 words. ${languageInstruction(locale)}`;
}

function getStaticFallbackResponse(locale = 'en') {
  const lang = getLang(locale);
  const optsByLang = {
    en: [
      "I didn't quite catch that! Try:\n• \"Plan a trip to Bali\"\n• \"Budget for Tokyo 7 days\"\n• \"Hotels in Dubai\"\n• \"Packing list for Iceland\"",
      "I'm not sure about that one! I can help with flights, hotels, itineraries, budgets, and packing. Tell me your destination!",
    ],
    fr: [
      "Je n’ai pas bien compris. Essayez :\n• \"Planifier un voyage à Bali\"\n• \"Budget pour Tokyo 7 jours\"\n• \"Hôtels à Dubaï\"\n• \"Liste de bagages pour l’Islande\"",
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
  const list = optsByLang[lang] || optsByLang.en;
  return list[Math.floor(Math.random() * list.length)];
}

async function getTextFallbackResponse(message, locale = 'en') {
  if (!apiKey) {
    return getStaticFallbackResponse(locale);
  }

  const requestBody = {
    model: textModelName,
    temperature: 0.6,
    messages: [
      { role: 'system', content: buildTextFallbackSystem(locale) },
      { role: 'user', content: String(message || '') },
    ],
  };

  const callProvider = async () => axios.post(
    `${baseUrl}/chat/completions`,
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  try {
    let response;
    try {
      response = await callProvider();
    } catch (_firstErr) {
      response = await callProvider();
    }

    const text = String(response?.data?.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      return getStaticFallbackResponse(locale);
    }
    return text;
  } catch (error) {
    const status = error?.response?.status;
    const body = error?.response?.data;
    const providerMessage = typeof body?.error?.message === 'string'
      ? body.error.message
      : typeof body?.message === 'string'
        ? body.message
        : error.message;
    console.error(`[Kimi Text Fallback] Provider request failed (${status || 'unknown'}): ${providerMessage}`);
    return getStaticFallbackResponse(locale);
  }
}

async function analyzePlaceWithKimi({ imageBuffer, mimeType, prompt }) {
  if (!apiKey) {
    return normalizeResult({
      place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.2 },
      notes: 'Kimi API key is missing.',
    });
  }

  const instruction = [
    'You are a travel assistant that identifies places from photos.',
    'Return only valid JSON in this shape:',
    '{"place":{"name":"","city":"","country":"","landmark_type":"","confidence":0.0},"notes":""}',
    'confidence must be between 0 and 1.',
    'If uncertain, keep confidence low and place.name as "Unknown place".',
  ].join(' ');

  const requestBody = (model) => ({
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${instruction} User prompt: ${prompt || 'Identify this place from the photo.'}` },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBuffer.toString('base64')}` } },
        ],
      },
    ],
  });

  const callProvider = async (model) => axios.post(
    `${baseUrl}/chat/completions`,
    requestBody(model),
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  try {
    let response;
    try {
      response = await callProvider(modelName);
    } catch (primaryError) {
      const primaryMessage = typeof primaryError?.response?.data?.error?.message === 'string'
        ? primaryError.response.data.error.message
        : '';
      const nonMultimodal = primaryError?.response?.status === 400 && /not a multimodal model/i.test(primaryMessage);
      if (!nonMultimodal || !fallbackVisionModel || fallbackVisionModel === modelName) {
        throw primaryError;
      }
      response = await callProvider(fallbackVisionModel);
    }

    const text = response?.data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(text);
    if (!parsed) {
      return normalizeResult({
        place: { name: 'Unknown place', city: '', country: '', landmark_type: 'unknown', confidence: 0.3 },
        notes: text.slice(0, 300),
      });
    }
    return normalizeResult(parsed);
  } catch (error) {
    const status = error?.response?.status;
    const body = error?.response?.data;
    const providerMessage = typeof body?.error?.message === 'string'
      ? body.error.message
      : typeof body?.message === 'string'
        ? body.message
        : error.message;
    throw new Error(`Kimi provider request failed (${status || 'unknown'}): ${providerMessage}`);
  }
}

module.exports = { analyzePlaceWithKimi, getTextFallbackResponse, getStaticFallbackResponse };
