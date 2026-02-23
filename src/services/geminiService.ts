import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateAIQuestion = async (difficulty: number, category: string = "Genel Kültür") => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Milyoner yarışması için ${difficulty} zorluk seviyesinde (1-15 arası), ${category} kategorisinde bir soru üret. 
      Yanıt kesinlikle şu JSON formatında olmalı: 
      { 
        "text": "Soru metni", 
        "options": ["Şık 1", "Şık 2", "Şık 3", "Şık 4"], 
        "correct_answer": "Doğru Şık Metni", 
        "category": "Kategori" 
      }`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Question Generation Error:", error);
    return null;
  }
};

export const getAILifelineAdvice = async (question: string, options: string[], difficulty: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bir bilgi yarışmasında şu soru soruldu: "${question}". Şıklar: ${options.join(", ")}. 
      Zorluk seviyesi: ${difficulty}/15. 
      Seyirci jokeriyim. Şıkların her birine birer yüzde (%) vererek gerçekçi bir dağılım yap. 
      Yanıt JSON formatında olsun: { "A": 40, "B": 10, "C": 45, "D": 5 }`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Lifeline Error:", error);
    return null;
  }
};
