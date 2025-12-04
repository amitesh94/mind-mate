// Groq AI Integration (Primary)
let groqClient = null;
let hasGroq = false;

try {
  const Groq = require('groq-sdk');
  if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    hasGroq = true;
    console.log('✅ Groq AI integration ENABLED');
    console.log(`   Model: ${process.env.GROQ_MODEL || 'mixtral-8x7b-32768'}`);
    console.log(`   API Key: ${process.env.GROQ_API_KEY.substring(0, 10)}...`);
  } else {
    console.log('⚠️  GROQ_API_KEY not found in .env — Groq DISABLED');
  }
} catch (err) {
  console.log('⚠️  Groq SDK failed to load:', err.message);
  hasGroq = false;
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
const GROQ_SYSTEM_PROMPT = `You are Mind Mate, an empathetic workplace wellness assistant. 
Your role is to:
- Listen actively and validate emotions
- Provide supportive, non-medical guidance
- Keep responses concise (under 70 words) and warm
- Suggest breathing exercises or brief breaks when appropriate
- Never provide medical diagnosis or treatment
- Maintain a calm, understanding tone
- Focus on emotional wellbeing and workplace stress management

IMPORTANT FORMATTING GUIDELINES:
- If the user asks for a list, use markdown bullet points (-)
- If the user asks for numbered steps, use markdown ordered lists (1. 2. 3.)
- If the user asks for a table/comparison, use markdown tables (| header | header |)
- Use **bold** for emphasis and important keywords
- Use clear markdown formatting for readability
- Keep markdown simple and clean
- Always maintain empathetic tone even in formatted content`;

// ============================================
// MAIN: Generate Chat Reply (Groq Primary)
// ============================================
async function generateChatReply(message) {
  // Try Groq FIRST
  if (hasGroq && groqClient) {
    try {
      console.log('📤 [Groq] Attempting to generate reply...');
      console.log(`   Message: "${message.substring(0, 50)}..."`);
      
      const response = await groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: GROQ_SYSTEM_PROMPT // ✅ Updated with formatting guidelines
          },
          {
            role: 'user',
            content: message
          }
        ],
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 200, // ✅ Increased to accommodate formatted content
        top_p: 1,
        stream: false
      });

      const reply = response.choices[0]?.message?.content || '';
      console.log(`✅ [Groq] SUCCESS - Reply received (${reply.length} chars)`);
      console.log(`   Response: "${reply.substring(0, 60)}..."`);
      
      return reply.trim();
    } catch (err) {
      console.error('❌ [Groq] ERROR:', err.message);
      console.error('   Full error:', err);
    }
  } else {
    if (!hasGroq) {
      console.log('⚠️  [Groq] Not configured - using fallback');
    }
  }

  // Fallback: Deterministic responses
  console.log('📌 Using FALLBACK response');
  const fallbacks = [
    `Thanks for sharing — I hear you. Take a moment to notice your breath. If you'd like, tell me more and I can help reflect on what might help next.`,
    `It sounds like you're going through something. Remember, it's okay to feel this way. What's one small thing that usually helps you feel better?`,
    `I appreciate you opening up. Your feelings are valid. Consider taking a short break — even 2 minutes of deep breathing can help reset your mind.`,
    `Thank you for trusting me with this. You're doing great by checking in with yourself. What would feel most supportive right now?`
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================
// Generate Summary (Groq Primary)
// ============================================
async function generateSummary(entries) {
  if (hasGroq && groqClient) {
    try {
      const entriesSummary = entries
        .slice(-12)
        .map((e, i) => `Entry ${i + 1}: Mood ${e.mood}/5, Stress ${e.stress}/5`)
        .join('\n');

      console.log('📤 [Groq] Generating summary...');
      console.log(`   Entries: ${entries.length}`);

      const response = await groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a wellness insights analyst. Analyze mood entries and provide a 4-part summary:
1. Overview (1-2 sentences about overall pattern)
2. Trends (observable patterns or changes)
3. Suggestions (practical, brief wellness tips)
4. Resources (encourage use of breathing exercise or break)

Keep each section to 1-2 sentences. Be supportive and non-clinical.`
          },
          {
            role: 'user',
            content: `Please analyze these mood entries:\n\n${entriesSummary}`
          }
        ],
        model: GROQ_MODEL,
        temperature: 0.5,
        max_tokens: 400,
        top_p: 1,
        stream: false
      });

      const summary = response.choices[0]?.message?.content || '';
      console.log(`✅ [Groq] Summary generated (${summary.length} chars)`);
      
      return summary.trim(); // ✅ Return plain string, not wrapped in {raw: ...}
    } catch (err) {
      console.error('❌ [Groq] Summary error:', err.message);
    }
  }

  // Fallback summary
  const count = entries.length;
  const fallbackSummary = `
Overview: I reviewed your last ${count} entries and noticed some patterns in your mood and stress levels.

Trends: Overall mood shows gentle fluctuations; stress has occasional spikes. You seem to have good and challenging moments throughout your week.

Suggestions: Try short breathing breaks (2-3 min) during peak stress times. A quick walk or stretch can help reset your mind and energy.

Resources: A guided breathing exercise is available in the app. Use it anytime you need to pause and recenter.`;

  return fallbackSummary.trim(); // ✅ Return plain string
}

// ============================================
// Get Provider Info
// ============================================
function getProviderInfo() {
  return {
    provider: hasGroq ? 'Groq AI' : 'Fallback',
    model: hasGroq ? GROQ_MODEL : 'deterministic',
    status: hasGroq ? 'connected' : 'disconnected',
    apiKeyConfigured: !!process.env.GROQ_API_KEY
  };
}

module.exports = { 
  generateChatReply, 
  generateSummary,
  getProviderInfo
};
