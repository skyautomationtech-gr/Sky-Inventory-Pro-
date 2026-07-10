import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Server-side API endpoint for Gemini BI forecasting & analytics
  app.post("/api/v1/ai/bi-analysis", async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, contextData } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Format a structured request for the Gemini 3.5 Flash model
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

      res.json({ result: response?.text || "No insights generated." });
    } catch (error: any) {
      console.error("Gemini BI Error:", error);
      res.status(500).json({ error: error.message || "Failed to perform AI analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
