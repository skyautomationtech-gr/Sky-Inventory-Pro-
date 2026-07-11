import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Firebase Admin SDK
  let adminDb: Firestore | null = null;
  try {
    let projectId = 'ai-studio-f61e4795-6077-497b-9686-702c3002f385';
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.projectId) {
        projectId = config.projectId;
      }
    }
    
    if (getApps().length === 0) {
      initializeApp({
        projectId: projectId
      });
    }
    adminDb = getFirestore();
    console.log("Firebase Admin SDK initialized successfully with project ID:", projectId);
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }

  // Secure server-side check for email existence & password reset audit logging
  app.post("/api/auth/check-email-exists", async (req: express.Request, res: express.Response) => {
    try {
      const { email, clientDetails } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }

      // Validate email format
      const trimmedEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "Invalid email address format." });
      }

      if (!adminDb) {
        return res.status(500).json({ error: "Database service unavailable." });
      }

      const usersCollection = adminDb.collection('users');
      const lowercaseEmail = trimmedEmail.toLowerCase();

      // Query the user
      let querySnapshot = await usersCollection.where('email', '==', trimmedEmail).limit(1).get();
      if (querySnapshot.empty && trimmedEmail !== lowercaseEmail) {
        querySnapshot = await usersCollection.where('email', '==', lowercaseEmail).limit(1).get();
      }

      const exists = !querySnapshot.empty;
      let userProfile: any = null;
      if (exists) {
        const doc = querySnapshot.docs[0];
        userProfile = { id: doc.id, ...doc.data() };
      }

      // Extract client details or derive on server
      const ipAddress = clientDetails?.ipAddress || req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const device = clientDetails?.device || 'Desktop';
      const browser = clientDetails?.browser || 'Unknown Browser';
      const location = clientDetails?.location || 'Localhost, Dev';

      // Log in audit log
      const auditLogsCollection = adminDb.collection('audit_logs');
      const logRef = auditLogsCollection.doc();
      const auditRecord = {
        id: logRef.id,
        uid: userProfile?.uid || 'unauthenticated',
        userName: userProfile?.fullName || 'Unauthenticated User',
        userRole: userProfile?.role || 'None',
        action: 'Password Reset Request',
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        device,
        browser,
        location,
        oldValue: null,
        newValue: {
          email: trimmedEmail,
          success: exists,
          details: exists ? 'Password reset link sent successfully.' : 'No account found with this email address.'
        },
        timestamp: new Date().toISOString(),
        companyId: userProfile?.companyId || 'default-company',
        branchId: userProfile?.branchId || 'default-branch'
      };

      await logRef.set(auditRecord);

      return res.json({ exists });
    } catch (error: any) {
      console.error("Check email exists error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

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
