import { GoogleGenAI } from "@google/genai";

// Cache Gemini client initialization
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (aiClient) return aiClient;
  
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { prompt, contextData } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();
    const contents = `
You are the Chief AI Business Intelligence Officer for Sky Inventory Pro, an enterprise-grade ERP system.
Your goal is to provide deep financial, inventory, sales, and purchasing insights, forecasts, anomaly detection, and actionable strategic recommendations.

CONTEXT METRICS PROVIDED:
${JSON.stringify(contextData, null, 2)}

USER REQUEST / ANALYTICS GOAL:
${prompt}

Provide a comprehensive, professional BI report with:
1. EXECUTIVE SUMMARY: High-level overview of findings.
2. FINANCIAL & STOCK FORECASTS: Numerical projection with confidence intervals (e.g. next 30/60 days).
3. ANOMALY & RISK DETECTION: Identify abnormal spikes, drop-offs, slow-moving items, or cash leaks.
4. ACTIONABLE RECOMMENDATIONS: Clear, structured, prioritize bullet points.

Return your response in standard markdown. Keep it highly detailed, data-driven, and business-focused. Avoid conversational filler or generalities. Reference the real metrics provided in your analysis.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
    });

    return res.status(200).json({ result: response?.text || "No insights generated." });
  } catch (error: any) {
    console.error("Gemini BI Error in serverless function:", error);
    return res.status(500).json({ error: error.message || "Failed to perform AI analysis" });
  }
}
