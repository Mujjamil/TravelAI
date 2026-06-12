require('dotenv').config();
console.log('GROQ_VISION_MODEL:', process.env.GROQ_VISION_MODEL);
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.slice(0,10)+'...' : 'NOT SET');
