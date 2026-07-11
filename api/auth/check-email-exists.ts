import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
let adminDb: Firestore | null = null;

function getFirebaseAdminDb(): Firestore | null {
  if (adminDb) return adminDb;

  try {
    let projectId = 'ai-studio-f61e4795-6077-497b-9686-702c3002f385';
    
    // Read config if available
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.projectId) {
        projectId = config.projectId;
      }
    }

    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (privateKey && clientEmail) {
        // Explicit service account config for environments like Vercel
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        // Local/Cloud Run container execution with Application Default Credentials
        initializeApp({
          projectId,
        });
      }
    }
    
    adminDb = getFirestore();
    return adminDb;
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  // Setup CORS Headers
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
    const { email, clientDetails } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Validate email format
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: "Invalid email address format." });
    }

    const db = getFirebaseAdminDb();
    if (!db) {
      return res.status(500).json({ error: "Database service unavailable." });
    }

    const usersCollection = db.collection('users');
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
    const ipAddress = clientDetails?.ipAddress || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const device = clientDetails?.device || 'Desktop';
    const browser = clientDetails?.browser || 'Unknown Browser';
    const location = clientDetails?.location || 'Localhost, Dev';

    // Log in audit log
    const auditLogsCollection = db.collection('audit_logs');
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

    return res.status(200).json({ exists });
  } catch (error: any) {
    console.error("Check email exists error in serverless function:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
