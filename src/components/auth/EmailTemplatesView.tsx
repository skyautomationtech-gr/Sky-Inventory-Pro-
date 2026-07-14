import React, { useState, useEffect } from 'react';
import { Mail, Check, X, ArrowLeft, Send, Copy, AlertCircle, Calendar, Sparkles, Database, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import emailjs from '@emailjs/browser';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const EmailTemplatesView: React.FC = () => {
  const { showNotification } = useAuth();
  const [activeTemplate, setActiveTemplate] = useState<'welcome' | 'forgot' | 'received' | 'result'>('welcome');
  const [testEmail, setTestEmail] = useState('you@skyautomationtech.com');
  const [sendingTest, setSendingTest] = useState(false);

  // Firestore DB configuration state
  const [dbServiceId, setDbServiceId] = useState('');
  const [dbTemplateId, setDbTemplateId] = useState('');
  const [dbPublicKey, setDbPublicKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const cleanKey = (val: any) => {
    if (!val || typeof val !== 'string') return '';
    return val.replace(/^["']|["']$/g, '').trim();
  };

  const envServiceId = cleanKey((import.meta as any).env.VITE_EMAILJS_SERVICE_ID);
  const envTemplateId = cleanKey((import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID);
  const envPublicKey = cleanKey((import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY);

  // Active configurations: Environment takes precedence, Firestore acts as backup, with working system fallbacks
  const activeServiceId = cleanKey(envServiceId || dbServiceId || 'service_sat_erpgz');
  const activeTemplateId = cleanKey(envTemplateId || dbTemplateId || 'template_jrdxwoc');
  const activePublicKey = cleanKey(envPublicKey || dbPublicKey || '9sc_p6Sj4qHSXc_Va');
  const isEmailJSConfigured = !!(activeServiceId && activeTemplateId && activePublicKey);

  // Load from Firestore
  useEffect(() => {
    const fetchDbSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'integration_settings', 'emailjs'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setDbServiceId(data.serviceId || '');
          setDbTemplateId(data.templateId || '');
          setDbPublicKey(data.publicKey || '');
        }
      } catch (err) {
        console.error('Failed to load EmailJS settings from Firestore:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchDbSettings();
  }, []);

  const handleSaveDbSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'integration_settings', 'emailjs'), {
        serviceId: dbServiceId.trim(),
        templateId: dbTemplateId.trim(),
        publicKey: dbPublicKey.trim(),
        updatedAt: new Date().toISOString()
      });
      showNotification('EmailJS credentials synchronized to database successfully!', 'success');
    } catch (err: any) {
      console.error('Error saving EmailJS settings to database:', err);
      showNotification('Failed to synchronize credentials: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    if (isEmailJSConfigured) {
      try {
        await emailjs.send(
          activeServiceId!,
          activeTemplateId!,
          {
            to_email: testEmail,
            email_to: testEmail,
            subject: templates[activeTemplate].subject,
            message_html: templates[activeTemplate].body,
            message: templates[activeTemplate].body.replace(/<[^>]*>/g, ''), // Plain text version fallback
          },
          activePublicKey!
        );
        showNotification(`Real test email successfully dispatched via EmailJS to ${testEmail}!`, 'success');
      } catch (err: any) {
        console.error("EmailJS dispatch failed:", err);
        showNotification(`EmailJS send failed: ${err.text || err.message || err}`, 'error');
      } finally {
        setSendingTest(false);
      }
    } else {
      // Sandbox fallback mode
      setTimeout(() => {
        setSendingTest(false);
        showNotification(`Sandbox simulation: Test email successfully dispatched to ${testEmail}!`, 'success');
      }, 1000);
    }
  };

  const templates = {
    welcome: {
      name: "Welcome & Onboarding",
      subject: "Welcome to Sky Inventory Pro - Getting Started with your Enterprise ERP",
      body: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0;">Welcome aboard, partner!</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6;">
                Your corporate user profile has been successfully authorized and registered inside the Sky Inventory Pro Enterprise ERP engine. You can now access your branch terminals, double-entry ledgers, and CRM workflows.
              </p>
              
              <!-- Getting Started Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="margin-top: 0; font-size: 12px; font-weight: bold; color: #334155; text-transform: uppercase; letter-spacing: 1px;">Getting Started Checkmarks:</h4>
                <ul style="padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;">Log into your branch terminal with your active password.</li>
                  <li style="margin-bottom: 8px;">Synchronize your physical inventory bin locations.</li>
                  <li style="margin-bottom: 8px;">Link your daily cashier double-entry cashbooks.</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="#" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; border-radius: 6px; font-size: 13px; font-weight: bold; text-decoration: none; display: inline-block;">Log Into Your ERP Suite</a>
              </div>
            </div>
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">This is an automated system transactional notice from Sky Automation Tech Compliance Dept.</p>
              <p style="margin: 5px 0 0 0;">House 24, Road 5, Dhanmondi, Dhaka, Bangladesh</p>
            </div>
          </div>
        </div>
      `
    },
    forgot: {
      name: "Forgot Password Recovery",
      subject: "Sky Inventory Pro - Secure 6-Digit Password Recovery OTP Code",
      body: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: #ef4444/10; border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 24px; color: #ef4444;">🔑</span>
              </div>
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0; text-align: center;">Recover Your Credentials</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; text-align: left;">
                We received a request to recover the password of your corporate user profile. Please enter the secure 6-digit OTP code below inside your active recovery terminal session.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #050816; border: 1px solid #1e293b; border-radius: 10px; padding: 15px; margin: 30px auto; max-width: 250px; text-align: center;">
                <span style="font-family: monospace; font-size: 26px; font-weight: 900; color: #3b82f6; letter-spacing: 6px;">824155</span>
              </div>

              <p style="font-size: 11px; color: #ef4444; font-weight: bold; margin-top: 20px;">
                WARNING: This recovery OTP is highly sensitive and is only active for 5 minutes. NEVER share this code with anyone, including support staff.
              </p>
            </div>
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">This is an automated system transactional notice from Sky Automation Tech Compliance Dept.</p>
              <p style="margin: 5px 0 0 0;">Dhaka Headquarters, Bangladesh</p>
            </div>
          </div>
        </div>
      `
    },
    received: {
      name: "Onboarding Application Received",
      subject: "Sky Inventory Pro - Onboarding Registration Request Filed Successfully",
      body: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0;">Onboarding Request Filed Successfully</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6;">
                Dear Candidate, we have successfully received and recorded your corporate onboarding application request. Below are your registration details for compliance audit logs:
              </p>
              
              <!-- Details list -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; font-family: monospace; font-size: 12px; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between; border-b: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                  <span style="color: #64748b;">Registration ID:</span>
                  <span style="font-weight: bold; color: #0f172a;">SAT-REG-1001</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-b: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
                  <span style="color: #64748b;">Role Requested:</span>
                  <span style="font-weight: bold; color: #0f172a;">Warehouse Operator</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Target Department:</span>
                  <span style="font-weight: bold; color: #0f172a;">Logistics & Supply Chain</span>
                </div>
              </div>

              <p style="font-size: 13px; color: #555555; line-height: 1.5;">
                Our Super Admin team is currently auditing your compliance document attachments (CV, Academic Certificates, National ID card Scans). Once reviewed, an automated notification containing your access authorization results will be triggered.
              </p>
            </div>
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">This is an automated system transactional notice from Sky Automation Tech Compliance Dept.</p>
              <p style="margin: 5px 0 0 0;">Dhaka Headquarters, Bangladesh</p>
            </div>
          </div>
        </div>
      `
    },
    result: {
      name: "Review Approval / Rejection Result",
      subject: "Sky Inventory Pro Onboarding Result - Profile Activated",
      body: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 20px; font-weight: bold; color: #10b981; margin-top: 0; text-align: center;">Onboarding Application APPROVED</h2>
              
              <p style="font-size: 14px; color: #555555; line-height: 1.6;">
                Congratulations! We are delighted to inform you that following our compliance and qualification audits, your application request for joining Sky Inventory Pro as a <strong>Warehouse Operator</strong> has been officially approved.
              </p>
              
              <div style="border-left: 4px solid #10b981; background-color: #f0fdf4; border-radius: 4px; padding: 15px; margin: 20px 0; font-size: 13px; line-height: 1.5; color: #047857;">
                <strong>Branch Assignments:</strong> DHAKA CENTRAL HUB 01<br/>
                <strong>Reporting Date:</strong> 2026-08-01 (Expected)
              </div>

              <p style="font-size: 13px; color: #555555; line-height: 1.5;">
                Please contact the human resource and compliance Desk should you require any workspace credential coordination.
              </p>
            </div>
            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0;">This is an automated system transactional notice from Sky Automation Tech Compliance Dept.</p>
              <p style="margin: 5px 0 0 0;">Dhaka Headquarters, Bangladesh</p>
            </div>
          </div>
        </div>
      `
    }
  };

  const activeTemplateData = templates[activeTemplate];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 font-sans">
      
      {/* Selection row bar */}
      <div className="p-4 bg-[#0f172a]/30 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-2xl">
        <div className="flex bg-[#050816]/60 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          {Object.entries(templates).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setActiveTemplate(key as any)}
              className={`flex-1 sm:flex-initial text-[10px] font-bold py-2 px-3.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTemplate === key 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Test Send Trigger */}
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@email.com"
            className="text-xs px-3.5 py-2 bg-[#050816]/60 border border-white/5 rounded-xl text-white focus:outline-hidden focus:border-blue-500 w-full sm:w-48"
          />
          <button
            onClick={handleSendTest}
            disabled={sendingTest}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {sendingTest ? <span className="animate-spin">⏳</span> : <Send className="h-3.5 w-3.5" />}
            <span>Dispatch Test Email</span>
          </button>
        </div>
      </div>

      {/* EmailJS Status & Connection Guide */}
      <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-all space-y-4 ${
        isEmailJSConfigured 
          ? 'bg-[#10b981]/5 border-[#10b981]/20 text-[#10b981]' 
          : 'bg-[#f59e0b]/5 border-[#f59e0b]/15 text-[#f59e0b]/90'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl border ${
            isEmailJSConfigured 
              ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]' 
              : 'bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]'
          }`}>
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 font-mono">
              {isEmailJSConfigured ? 'EmailJS Connection: Active' : 'EmailJS Sandbox Simulation Mode'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isEmailJSConfigured 
                ? 'Your EmailJS credentials have been detected! Notifications will be dispatched directly to actual email addresses.' 
                : 'Configure your EmailJS keys inside this panel or via system variables to activate live email dispatch. Currently running in safe mock simulation mode.'}
            </p>
          </div>
        </div>

        {/* Database Credentials Sync Form */}
        <form onSubmit={handleSaveDbSettings} className="p-4 bg-[#050816]/60 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                EmailJS API Credentials Manager (Sync to Firestore)
              </span>
            </div>
            {isEmailJSConfigured && (
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">VITE_EMAILJS_SERVICE_ID</label>
              <input
                type="text"
                value={dbServiceId}
                onChange={(e) => setDbServiceId(e.target.value)}
                placeholder={envServiceId ? 'Using env variable...' : 'e.g. service_xxxxxxx'}
                disabled={!!envServiceId}
                className="w-full text-xs bg-[#0f172a]/80 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 disabled:opacity-40 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">VITE_EMAILJS_TEMPLATE_ID</label>
              <input
                type="text"
                value={dbTemplateId}
                onChange={(e) => setDbTemplateId(e.target.value)}
                placeholder={envTemplateId ? 'Using env variable...' : 'e.g. template_xxxxxxx'}
                disabled={!!envTemplateId}
                className="w-full text-xs bg-[#0f172a]/80 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 disabled:opacity-40 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">VITE_EMAILJS_PUBLIC_KEY</label>
              <input
                type="text"
                value={dbPublicKey}
                onChange={(e) => setDbPublicKey(e.target.value)}
                placeholder={envPublicKey ? 'Using env variable...' : 'e.g. user_xxxxxxxxxxxxxxxx'}
                disabled={!!envPublicKey}
                className="w-full text-xs bg-[#0f172a]/80 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500 disabled:opacity-40 font-mono"
              />
            </div>
          </div>

          {!envServiceId && (
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/5"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                <span>Sync to Database</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Frame Preview box */}
      <div className="bg-[#0f172a]/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Inbox header mockup */}
        <div className="bg-[#050816]/60 p-4 border-b border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 font-bold text-blue-400 uppercase tracking-widest">Inbox Preview</span>
            <span>Date: Today</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
              <span className="text-slate-500 font-bold font-mono">From:</span>
              <span className="text-slate-200 font-bold">Sky Automation Tech Compliance &lt;compliance@skyautomationtech.com&gt;</span>
            </div>

            <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
              <span className="text-slate-500 font-bold font-mono">To:</span>
              <span className="text-slate-200 font-bold">{testEmail}</span>
            </div>

            <div className="flex justify-between pb-0.5">
              <span className="text-slate-500 font-bold font-mono">Subject:</span>
              <span className="text-blue-400 font-bold">{activeTemplateData.subject}</span>
            </div>
          </div>
        </div>

        {/* Real HTML IFrame Renderer inside the card */}
        <div className="bg-slate-100 p-1 sm:p-4 min-h-[450px] overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: activeTemplateData.body }} />
        </div>
      </div>

    </div>
  );
};
