require('dotenv').config();
const axios = require('axios');
const { analyzePlaceWithGroq } = require('./services/groqService');

async function test() {
  console.log('Using model:', process.env.GROQ_VISION_MODEL);
  
  // Download a real Eiffel Tower image
  const imgResp = await axios.get('https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', { 
    responseType: 'arraybuffer', timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const imageBuffer = Buffer.from(imgResp.data);
  const mimeType = 'image/jpeg';
  console.log('Image fetched, size:', imageBuffer.length);

  try {
    const result = await analyzePlaceWithGroq({ imageBuffer, mimeType, prompt: 'What landmark is this?' });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test().catch(console.error);
