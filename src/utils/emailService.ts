import emailjs from '@emailjs/browser';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface EmailPayload {
  recipient: string;
  subject: string;
  type: 'Welcome Onboarding' | 'Forgot Password OTP' | 'Registration Received' | 'Approval Result';
  body: string;
  applicantName?: string;
  details?: string;
}

export const sendAutomatedEmail = async (payload: EmailPayload): Promise<{ success: boolean; mode: 'live' | 'simulation' | 'failed'; error?: string }> => {
  const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID;
  const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY;
  
  const isEmailJSConfigured = !!(serviceId && templateId && publicKey);
  const logRef = doc(collection(db, 'email_logs'));

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
          subject: payload.subject,
          message_html: payload.body,
          message: payload.body.replace(/<[^>]*>/g, ''), // Strip tags for plain text fallback
          applicant_name: payload.applicantName || 'Applicant'
        },
        publicKey
      );

      logData.status = 'Delivered';
      await setDoc(logRef, logData);
      return { success: true, mode: 'live' };
    } catch (err: any) {
      console.error('EmailJS automated dispatch failed:', err);
      logData.status = 'Failed';
      logData.details = `Live send failed: ${err.text || err.message || JSON.stringify(err)}`;
      await setDoc(logRef, logData);
      return { success: false, mode: 'failed', error: err.message || err.text };
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
