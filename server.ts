import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Firebase Admin SDK
  let adminDb: Firestore | null = null;
  let projectId = 'ai-studio-f61e4795-6077-497b-9686-702c3002f385';
  let dbId: string = '(default)';
  let firebaseApiKey = '';

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.projectId) {
        projectId = config.projectId;
      }
      if (config.firestoreDatabaseId) {
        dbId = config.firestoreDatabaseId;
      }
      if (config.apiKey) {
        firebaseApiKey = config.apiKey;
      }
    } catch (err) {
      console.error("Failed to parse firebase-applet-config.json:", err);
    }
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: projectId
      });
    }
    adminDb = dbId && dbId !== '(default)' ? getFirestore(dbId) : getFirestore();
    console.log("Firebase Admin SDK initialized successfully with project ID:", projectId, "and database ID:", dbId);

    // Auto-seed user-provided correct EmailJS keys into Firestore to guarantee zero-config immediate operation
    try {
      const emailJsSettingsRef = adminDb.collection('integration_settings').doc('emailjs');
      await emailJsSettingsRef.set({
        serviceId: 'service_sat_erpgz',
        templateId: 'template_jrdxwoc',
        publicKey: '9sc_p6Sj4qHSXc_Va',
        updatedAt: new Date().toISOString(),
        seededBySystem: true
      }, { merge: true });
      console.log("Successfully seeded/synced correct EmailJS credentials in Firestore.");
    } catch (seedErr) {
      console.error("Non-fatal: Could not seed EmailJS settings in Firestore startup:", seedErr);
    }
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

      // We use Firestore REST API to query the user by email
      const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${firebaseApiKey}`;
      
      const queryPayload = {
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'email' },
              op: 'EQUAL',
              value: { stringValue: trimmedEmail }
            }
          },
          limit: 1
        }
      };

      let response = await fetch(runQueryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Firestore query failed: ${errText}`);
      }

      let results = await response.json();
      
      // Fallback for case-insensitive match if initial search was empty
      const lowercaseEmail = trimmedEmail.toLowerCase();
      if ((!Array.isArray(results) || results.length === 0 || !results[0].document) && trimmedEmail !== lowercaseEmail) {
        const fallbackPayload = {
          structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: lowercaseEmail }
              }
            },
            limit: 1
          }
        };
        response = await fetch(runQueryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload)
        });
        if (response.ok) {
          results = await response.json();
        }
      }

      const exists = Array.isArray(results) && results.length > 0 && !!results[0].document;
      let userProfile: any = null;

      if (exists) {
        const doc = results[0].document;
        const fields = doc.fields || {};
        userProfile = {};
        for (const [key, val] of Object.entries(fields)) {
          const valueObj = val as any;
          if ('stringValue' in valueObj) userProfile[key] = valueObj.stringValue;
          else if ('integerValue' in valueObj) userProfile[key] = parseInt(valueObj.integerValue, 10);
          else if ('doubleValue' in valueObj) userProfile[key] = parseFloat(valueObj.doubleValue);
          else if ('booleanValue' in valueObj) userProfile[key] = valueObj.booleanValue;
        }
        const parts = doc.name.split('/');
        userProfile.id = parts[parts.length - 1];
      }

      // Extract client details or derive on server
      const ipAddress = clientDetails?.ipAddress || req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const device = clientDetails?.device || 'Desktop';
      const browser = clientDetails?.browser || 'Unknown Browser';
      const location = clientDetails?.location || 'Localhost, Dev';

      // Log in audit log using Firestore REST API
      const logId = 'log_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      const writeLogUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/audit_logs?documentId=${logId}&key=${firebaseApiKey}`;
      
      const ipStr = Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress);

      const auditRecord = {
        fields: {
          id: { stringValue: logId },
          uid: { stringValue: userProfile?.uid || 'unauthenticated' },
          userName: { stringValue: userProfile?.fullName || 'Unauthenticated User' },
          userRole: { stringValue: userProfile?.role || 'None' },
          action: { stringValue: 'Password Reset Request' },
          ipAddress: { stringValue: ipStr },
          device: { stringValue: device },
          browser: { stringValue: browser },
          location: { stringValue: location },
          timestamp: { stringValue: new Date().toISOString() },
          companyId: { stringValue: userProfile?.companyId || 'default-company' },
          branchId: { stringValue: userProfile?.branchId || 'default-branch' }
        }
      };

      const logResponse = await fetch(writeLogUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditRecord)
      });

      if (!logResponse.ok) {
        const logErrText = await logResponse.text();
        console.warn("Failed to write audit log via REST API:", logErrText);
      }

      return res.json({ exists });
    } catch (error: any) {
      console.error("Check email exists error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Secure server-side password reset in Firebase Authentication
  app.post("/api/auth/reset-password", async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const trimmedEmail = email.trim();
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
      }

      // Update password using Admin SDK getAuth()
      const authAdmin = getAuth();
      const userRecord = await authAdmin.getUserByEmail(trimmedEmail);
      await authAdmin.updateUser(userRecord.uid, { password });

      // Log in audit log using Firestore REST API
      const logId = 'log_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      const writeLogUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/audit_logs?documentId=${logId}&key=${firebaseApiKey}`;
      
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const ipStr = Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress);

      const auditRecord = {
        fields: {
          id: { stringValue: logId },
          uid: { stringValue: userRecord.uid },
          userName: { stringValue: userRecord.displayName || userRecord.email || 'User' },
          userRole: { stringValue: 'None' },
          action: { stringValue: 'Password Reset Completed' },
          ipAddress: { stringValue: ipStr },
          device: { stringValue: 'Server' },
          browser: { stringValue: 'Node.js' },
          location: { stringValue: 'Server' },
          timestamp: { stringValue: new Date().toISOString() },
          companyId: { stringValue: 'default-company' },
          branchId: { stringValue: 'default-branch' }
        }
      };

      const logResponse = await fetch(writeLogUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditRecord)
      });

      if (!logResponse.ok) {
        const logErrText = await logResponse.text();
        console.warn("Failed to write password reset audit log:", logErrText);
      }

      return res.json({ success: true, message: "Password updated successfully in Firebase Authentication." });
    } catch (error: any) {
      console.error("Password reset error:", error);
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
