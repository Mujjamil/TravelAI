const Anthropic = require('@anthropic-ai/sdk');

let client;
try {
  if (process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
} catch (e) {}

function getLang(locale) {
  const value = String(locale || '').toLowerCase().trim()
  if (value.startsWith('fr')) return 'fr'
  if (value.startsWith('hi')) return 'hi'
  if (value.startsWith('mr')) return 'mr'
  if (value.startsWith('kn')) return 'kn'
  return 'en'
}

function languageInstruction(locale) {
  const lang = getLang(locale)
  if (lang === 'fr') return 'Respond in French.'
  if (lang === 'hi') return 'Respond in Hindi.'
  if (lang === 'mr') return 'Respond in Marathi.'
  if (lang === 'kn') return 'Respond in Kannada.'
  return 'Respond in English.'
}

function buildSystem(locale) {
  return `You are a friendly AI travel planning assistant. Help users plan trips with personalized recommendations for destinations, itineraries, budgets, flights, hotels, and packing. Be concise and warm. Keep responses under 200 words. ${languageInstruction(locale)}`
}

async function getFallbackResponse(message, locale = 'en') {
  if (client) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: buildSystem(locale),
        messages: [{ role: 'user', content: message }]
      });
      return msg.content[0].text;
    } catch (e) {
      console.error('[Claude]', e.message);
    }
  }
  const lang = getLang(locale)
  const optsByLang = {
    en: [
      "I didn't quite catch that! Try:\n• \"Plan a trip to Bali\"\n• \"Budget for Tokyo 7 days\"\n• \"Hotels in Dubai\"\n• \"Packing list for Iceland\"",
      "I'm not sure about that one! I can help with flights, hotels, itineraries, budgets, and packing. Tell me your destination!"
    ],
    fr: [
      "Je n’ai pas bien compris. Essayez :\n• \"Planifier un voyage à Bali\"\n• \"Budget pour Tokyo 7 jours\"\n• \"Hôtels à Dubaï\"\n• \"Liste de bagages pour l’Islande\"",
      "Je peux aider avec vols, hôtels, itinéraires, budgets et bagages. Dites-moi votre destination !"
    ],
    hi: [
      "मैं समझ नहीं पाया। ये ट्राई करें:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "मैं flights, hotels, itinerary, budget और packing में मदद कर सकता हूँ। अपना destination बताइए!"
    ],
    mr: [
      "मला नीट समजलं नाही. हे ट्राय करा:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "मी flights, hotels, itinerary, budget आणि packing मध्ये मदत करू शकतो. तुमचं destination सांगा!"
    ],
    kn: [
      "ನನಗೆ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ. ಇದನ್ನು ಪ್ರಯತ್ನಿಸಿ:\n• \"Bali trip plan\"\n• \"Tokyo 7 days budget\"\n• \"Dubai hotels\"\n• \"Iceland packing list\"",
      "ನಾನು flights, hotels, itinerary, budget ಮತ್ತು packing ನಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನಿಮ್ಮ destination ಹೇಳಿ!"
    ]
  }
  const list = optsByLang[lang] || optsByLang.en
  return list[Math.floor(Math.random() * list.length)]
}

module.exports = { getFallbackResponse };
