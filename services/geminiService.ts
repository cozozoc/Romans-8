import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development. In a real environment, the key should be set.
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getVerseExplanation = async (verseText: string): Promise<string> => {
  if (!API_KEY) {
    return "AI features are disabled because the API key is not configured.";
  }

  try {
    const prompt = `You are a helpful Bible study assistant. Explain the following verse from Romans 8 (NLT) in simple, easy-to-understand terms for someone trying to memorize it. Focus on the core meaning and its encouragement for a believer. Keep it concise (2-4 sentences). Verse: "${verseText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        topP: 1,
        topK: 32,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate explanation from AI.");
  }
};
