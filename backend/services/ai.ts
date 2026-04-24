// ─────────────────────────────────────────────────────────────────────────────
// Panchayat — AI Service (Vertex AI Gemini)
// Uses Vertex AI Express API key (AQ. format) from Google Cloud Console
// ─────────────────────────────────────────────────────────────────────────────

// 🔐 API key loaded from .env — never committed to GitHub
const API_KEY    = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const PROJECT_ID = 'panchayat-38159';
const LOCATION   = 'us-central1';

// Vertex AI endpoint builder
const vertexUrl = (model: string) =>
  `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent?key=${API_KEY}`;

// Fallback: standard Gemini API endpoint (works with AIzaSy... keys)
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;

const LOCAL_ANSWERS: Record<string, string> = {
  'hi': 'Namaste! 🙏 I\'m your Panchayat AI assistant. How can I help you today?',
  'hello': 'Namaste! 🙏 I\'m your Panchayat AI assistant. How can I help you today?',
  'hey': 'Hey there! How can I assist you with your society matters today? 🏘️',
  'loudspeaker': 'Loudspeaker and loud music are strictly not allowed after 11:00 PM to ensure peace for all residents. 🔇',
  'music': 'Loud music should be kept at a reasonable volume. No loud music or parties are allowed beyond 11:00 PM. 🎵',
  'noise': 'We maintain a quiet environment for all residents. Any noise-making activities should stop by 11:00 PM.',
  'security': 'Our society has 24/7 security guarding the main gate. You can contact them via the intercom or the Emergency section.',
  'bill': 'You can check and pay your maintenance bills in the "My Bills" section under your Profile tab. 💳',
  'maintenance': 'For maintenance queries, please check the "My Bills" section or contact the society office.',
  'complaint': 'You can raise a complaint or issue through the "Complaints" section in the app. Our team will look into it promptly.',
};

const checkLocalKnowledge = (prompt: string): string | null => {
  const p = prompt.toLowerCase().trim();
  for (const [key, val] of Object.entries(LOCAL_ANSWERS)) {
    if (p.includes(key)) return val;
  }
  return null;
};

export const askPanchayatAI = async (prompt: string, contextData: string): Promise<string> => {
  // 🏁 Try local knowledge first to save API quota
  const local = checkLocalKnowledge(prompt);
  if (local) return local;

  if (!API_KEY) {
    return '⚠️ AI assistant is not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.';
  }

  const fullPrompt = `
You are the AI assistant for 'Panchayat', a community management app for residential societies.
Answer the user's question based on the provided society context data below.
If the specific information is not in the context, say "I don't have that information yet. Please contact your society admin."
Be helpful, concise, and conversational. Use simple language.

=== Society Context Data ===
${contextData}
===========================

User Question: ${prompt}
  `.trim();

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  });

  const headers = { 'Content-Type': 'application/json' };

  // Detect key type: AQ. = Vertex AI, AIzaSy = standard Gemini
  const isVertexKey = API_KEY.startsWith('AQ.');

  // Models to try in order
  const models = isVertexKey
    ? ['gemini-2.0-flash-001', 'gemini-1.5-flash-001', 'gemini-1.0-pro-001']
    : ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash-latest'];

  let lastError = 'Failed to get response from AI';

  for (const model of models) {
    try {
      const url = isVertexKey ? vertexUrl(model) : geminiUrl(model);
      console.log(`[AI] Trying ${isVertexKey ? 'Vertex AI' : 'Gemini'} model: ${model}`);

      const res = await fetch(url, { method: 'POST', headers, body: requestBody });
      const data = await res.json();

      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[AI] Success with model: ${model}`);
          return text.trim();
        }
        lastError = 'No content in AI response';
        continue;
      }

      // Handle errors
      console.error(`[AI] Error (${model}) ${res.status}:`, data?.error?.message);
      lastError = data?.error?.message || `HTTP ${res.status}`;

      // Retry on: model not found (404), rate limit (429), server error (5xx)
      if (res.status === 404 || res.status === 429 || res.status >= 500) continue;

      // Stop on auth errors (401, 403) — retrying won't help
      if (res.status === 401 || res.status === 403) {
        return `🔐 API Key Error: ${lastError}\n\nPlease check your API key in the .env file.`;
      }

      break;
    } catch (fetchErr: any) {
      console.error(`[AI] Fetch failed (${model}):`, fetchErr.message);
      lastError = fetchErr.message;
      continue;
    }
  }

  return `❌ AI Error: ${lastError}`;
};
