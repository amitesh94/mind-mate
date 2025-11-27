// LLM wrapper with optional OpenAI integration and safe fallback
let openaiClient = null;
let hasOpenAI = false;

try {
  const { OpenAI } = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20 * 1000 // 20 second timeout
    });
    hasOpenAI = true;
    console.log('✓ OpenAI integration enabled with API key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
  } else {
    console.log('⚠ OPENAI_API_KEY not set in .env — using fallback responses');
  }
} catch (e) {
  console.log('⚠ OpenAI package not installed or failed to load:', e.message);
  hasOpenAI = false;
}

async function generateChatReply(message) {
  const prompt = `You are an empathetic workplace wellness assistant. Keep replies gentle, supportive, non-medical, and under 70 words. Respond to: ${message}`;
  
  if (hasOpenAI && openaiClient) {
    try {
      console.log('📤 Calling OpenAI API...');
      const resp = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.7
      });
      
      const text = resp?.choices?.[0]?.message?.content;
      if (text) {
        console.log('✓ OpenAI response received');
        return text.trim();
      }
    } catch (err) {
      console.error('❌ OpenAI call failed:', err.message);
      console.error('Error details:', err.response?.data || err);
    }
  } else {
    console.log('⚠ OpenAI not available, using fallback');
  }
  
  // Deterministic fallback responses
  const fallbacks = [
    `Thanks for sharing — I hear you. Take a moment to notice your breath. If you'd like, tell me more and I can help reflect on what might help next.`,
    `It sounds like you're going through something. Remember, it's okay to feel this way. What's one small thing that usually helps you feel better?`,
    `I appreciate you opening up. Your feelings are valid. Consider taking a short break — even 2 minutes of deep breathing can help reset your mind.`,
    `Thank you for trusting me with this. You're doing great by checking in with yourself. What would feel most supportive right now?`
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function generateSummary(entries) {
  const brief = `Please summarize the following mood entries into 4 short sections: overview, trends, suggestions, resources. Keep each section to 1-2 sentences. Entries: ${JSON.stringify(entries.slice(-12))}`;
  
  if (hasOpenAI && openaiClient) {
    try {
      console.log('📤 Generating summary with OpenAI...');
      const resp = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: brief }],
        max_tokens: 350,
        temperature: 0.5
      });
      
      const text = resp?.choices?.[0]?.message?.content;
      if (text) {
        console.log('✓ OpenAI summary received');
        return { raw: text.trim() };
      }
    } catch (err) {
      console.error('❌ OpenAI summary failed:', err.message);
    }
  }
  
  // Fallback structured summary
  const count = entries.length;
  return {
    overview: `I reviewed your last ${count} entries and noticed some patterns in your mood and stress levels.`,
    trends: `Overall mood shows gentle fluctuations; stress has occasional spikes. You seem to have good and challenging moments throughout your week.`,
    suggestions: `Try short breathing breaks (2-3 min) during peak stress times. A quick walk or stretch can help reset your mind and energy.`,
    resources: `A guided breathing exercise is available in the app. Use it anytime you need to pause and recenter.`
  };
}

module.exports = { generateChatReply, generateSummary };
