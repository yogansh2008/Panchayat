const API_KEY = "AIzaSyAYtOdaVM-TOaVS0qteCjRhds1rSVZpMDc";

export const askPanchayatAI = async (prompt: string, contextData: string) => {
  try {
    const fullPrompt = `
      You are the AI assistant for 'Panchayat', a community management app.
      Answer the user's question based ONLY on the provided context data.
      If the data is missing, say "Information not available."
      Do not hallucinate any information.
      
      Context Data:
      ${contextData}
      
      User Question:
      ${prompt}
    `;

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-pro"];
    let lastError = "Failed to fetch response";

    for (const modelName of models) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      } else {
        console.error(`AI API Error (${modelName}):`, data);
        lastError = data.error?.message || lastError;
        // If it's a 429 (High Demand), 503 (Overloaded), or 404 (Not Found), we retry next model
        if (res.status === 404 || res.status === 429 || res.status >= 500) {
          continue;
        }
        // If it's an API Key error (400, 403), stop immediately
        break;
      }
    }
    
    return "API Error: " + lastError;
  } catch (error: any) {
    console.error("AI Error:", error);
    return "Failed to connect to AI assistant. " + error.message;
  }
};
