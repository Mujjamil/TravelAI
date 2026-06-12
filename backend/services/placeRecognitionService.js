const { analyzePlaceWithGroq } = require('./groqService');
const { analyzePlaceWithGemini } = require('./geminiService');
const { analyzePlaceWithKimi } = require('./kimiService');

function toPercent(confidence) {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.max(0, Math.min(1, n)) * 100);
}

function buildReply(place) {
  const confidencePct = toPercent(place.confidence);
  const location = [place.city, place.country].filter(Boolean).join(', ');

  if (!place.name || place.name.toLowerCase() === 'unknown place') {
    return "I couldn't confidently identify the exact place from this image. Try uploading a clearer landmark view or add a hint about the region. 📷";
  }

  if (location) {
    return confidencePct !== null
      ? `This looks like ${place.name} in ${location}. My confidence is about ${confidencePct}%. 🌍`
      : `This looks like ${place.name} in ${location}. 🌍`;
  }

  return confidencePct !== null
    ? `This looks like ${place.name}. My confidence is about ${confidencePct}%. 🌍`
    : `This looks like ${place.name}. 🌍`;
}

async function recognizePlaceFromImage({ imageBuffer, mimeType, userPrompt, sessionId }) {
  const provider = (process.env.AI_VISION_PROVIDER || 'groq').toLowerCase();

  let analysis;
  if (provider === 'kimi_nvidia') {
    analysis = await analyzePlaceWithKimi({ imageBuffer, mimeType, prompt: userPrompt, sessionId });
  } else if (provider === 'gemini') {
    analysis = await analyzePlaceWithGemini({ imageBuffer, mimeType, prompt: userPrompt, sessionId });
  } else {
    analysis = await analyzePlaceWithGroq({ imageBuffer, mimeType, prompt: userPrompt, sessionId });
  }

  const reply = buildReply(analysis.place);
  const suggestions = [
    'Plan a trip to this place',
    'Best time to visit',
    'Nearby attractions',
  ];

  return {
    reply,
    place: analysis.place,
    suggestions,
    notes: analysis.notes || '',
    provider,
  };
}

module.exports = { recognizePlaceFromImage };
