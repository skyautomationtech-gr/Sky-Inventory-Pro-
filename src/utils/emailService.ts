import emailjs from '@emailjs/browser';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface EmailPayload {
  recipient: string;
  subject: string;
  type: 'Welcome Onboarding' | 'Forgot Password OTP' | 'Registration Received' | 'Approval Result' | 'Login OTP' | 'Email Verification OTP';
  body: string;
  applicantName?: string;
  details?: string;
}

export const sendAutomatedEmail = async (payload: EmailPayload): Promise<{ success: boolean; mode: 'live' | 'simulation' | 'failed'; error?: string }> => {
  const cleanKey = (val: any) => {
    if (!val || typeof val !== 'string') return '';
    return val.replace(/^["']|["']$/g, '').trim();
  };

  let serviceId = cleanKey((import.meta as any).env.VITE_EMAILJS_SERVICE_ID);
  let templateId = cleanKey((import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID);
  let publicKey = cleanKey((import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY);
  
  // Try to load from Firestore if environment variables are missing
  if (!serviceId || !templateId || !publicKey) {
    try {
      const settingsDoc = await getDoc(doc(db, 'integration_settings', 'emailjs'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.serviceId && data.templateId && data.publicKey) {
          serviceId = cleanKey(data.serviceId);
          templateId = cleanKey(data.templateId);
          publicKey = cleanKey(data.publicKey);
        }
      }
    } catch (dbErr) {
      console.warn('Could not load EmailJS settings from integration_settings/emailjs:', dbErr);
    }
  }

  // Fallback to user-provided working EmailJS credentials to ensure 100% operational OTP delivery
  if (!serviceId || !templateId || !publicKey) {
    serviceId = serviceId || 'service_sat_erpgz';
    templateId = templateId || 'template_jrdxwoc';
    publicKey = publicKey || '9sc_p6Sj4qHSXc_Va';
  }

  const isEmailJSConfigured = !!(serviceId && templateId && publicKey);
  const logRef = doc(collection(db, 'email_logs'));

  // Attempt to extract 6-digit OTP code if present in the email body or subject
  let extractedOtp = '';
  const otpMatch = payload.body.match(/\b\d{6}\b/);
  if (otpMatch) {
    extractedOtp = otpMatch[0];
  }

  const plainTextMessage = payload.body.replace(/<[^>]*>/g, '').trim();

  const logData = {
    id: logRef.id,
    recipient: payload.recipient,
    subject: payload.subject,
    type: payload.type,
    timestamp: new Date().toISOString(),
    status: isEmailJSConfigured ? 'Pending' : 'Simulated',
    details: payload.details || `Email of type "${payload.type}" successfully dispatched.`
  };

  if (isEmailJSConfigured) {
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: payload.recipient,
          email_to: payload.recipient,
          recipient: payload.recipient,
          to_name: payload.applicantName || payload.recipient.split('@')[0] || 'User',
          from_name: 'Sky Inventory Pro',
          subject: payload.subject,
          message_html: payload.body,
          message: plainTextMessage,
          applicant_name: payload.applicantName || 'Applicant',
          // Pass the OTP code under all common variable names in case the user's template expects a specific one
          otp: extractedOtp,
          code: extractedOtp,
          otp_code: extractedOtp,
          verification_code: extractedOtp,
          otpCode: extractedOtp
        },
        publicKey
      );

      logData.status = 'Delivered';
      try {
        await setDoc(logRef, logData);
      } catch (logErr) {
        console.error('Failed to log delivered email to Firestore:', logErr);
      }
      return { success: true, mode: 'live' };
    } catch (err: any) {
      const errMsg = err?.text || err?.message || JSON.stringify(err);
      console.warn('EmailJS live dispatch failed:', errMsg);
      
      logData.status = 'Failed';
      logData.details = `Live send failed: ${errMsg}`;
      try {
        await setDoc(logRef, logData);
      } catch (logErr) {
        console.error('Failed to log failed email attempt to Firestore:', logErr);
      }
      return { success: false, mode: 'failed', error: errMsg };
    }
  } else {
    // Sandbox / Simulation fallback
    try {
      await setDoc(logRef, logData);
      console.log(`[EmailJS Simulation] Email dispatched to ${payload.recipient} | Subject: ${payload.subject}`);
      return { success: true, mode: 'simulation' };
    } catch (e: any) {
      console.error('Failed to log simulated email to Firestore:', e);
      return { success: true, mode: 'simulation', error: e.message };
    }
  }
};
