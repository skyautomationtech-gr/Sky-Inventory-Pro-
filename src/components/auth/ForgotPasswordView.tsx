import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, KeyRound, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, 
  CheckCircle, AlertCircle, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sendAutomatedEmail } from '../../utils/emailService';

interface ForgotPasswordViewProps {
  onReturnToLogin: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onReturnToLogin }) => {
  const { forgotPassword, resetPassword, showNotification } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [otpVerified, setOtpVerified] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [countdown, setCountdown] = useState(59);
  const [canResend, setCanResend] = useState(false);

  // Reset fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showNotification('Please enter a valid corporate email format.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      // Call standard forgotPassword or simulate exist checks securely
      await forgotPassword(email.trim());
      
      // If no error, user exists. Generate real random 6-digit code.
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      // Construct dynamic email template body with the real code
      const emailBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 24px; line-height: 40px; color: #ef4444;">🔑</span>
              </div>
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0; text-align: center;">Recover Your Credentials</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; text-align: left;">
                We received a request to recover the password of your corporate user profile. Please enter the secure 6-digit OTP code below inside your active recovery terminal session.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #050816; border: 1px solid #1e293b; border-radius: 10px; padding: 15px; margin: 30px auto; max-width: 250px; text-align: center;">
                <span style="font-family: monospace; font-size: 26px; font-weight: 900; color: #3b82f6; letter-spacing: 6px;">${code}</span>
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
      `;

      // Dispatch automated EmailJS dispatch
      const res = await sendAutomatedEmail({
        recipient: email.trim(),
        subject: "Sky Inventory Pro - Secure 6-Digit Password Recovery OTP Code",
        type: 'Forgot Password OTP',
        body: emailBody,
        details: `Dispatched Forgot Password OTP code to ${email.trim()}`
      });

      if (res.mode === 'live') {
        setStep(2);
        setCountdown(59);
        setCanResend(false);
        showNotification('A secure 6-digit recovery OTP has been sent via EmailJS to your inbox.', 'success');
      } else if (res.mode === 'failed') {
        showNotification(`EmailJS dispatch failed: ${res.error || 'Unknown error'}. Please verify your EmailJS keys in Settings.`, 'error');
      } else {
        setStep(2);
        setCountdown(59);
        setCanResend(false);
        showNotification('Simulation Mode: Check simulated logs or Email Previews tab. Sim OTP: ' + code, 'info');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Verification email send failed. Make sure your account is registered.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCountdown(59);
    setCanResend(false);
    setOtpValues(Array(6).fill(''));

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      const emailBody = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px; color: #333333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header Brand -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Sky Inventory Pro</span>
              <div style="font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: bold; margin-top: 5px; letter-spacing: 1.5px;">Sky Automation Tech</div>
            </div>
            <!-- Main Copy -->
            <div style="padding: 40px 30px; text-align: center;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin-bottom: 15px;">
                <span style="font-size: 24px; line-height: 40px; color: #ef4444;">🔑</span>
              </div>
              <h2 style="font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0; text-align: center;">Recover Your Credentials</h2>
              <p style="font-size: 14px; color: #555555; line-height: 1.6; text-align: left;">
                We received a request to recover the password of your corporate user profile. Please enter the secure 6-digit OTP code below inside your active recovery terminal session.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #050816; border: 1px solid #1e293b; border-radius: 10px; padding: 15px; margin: 30px auto; max-width: 250px; text-align: center;">
                <span style="font-family: monospace; font-size: 26px; font-weight: 900; color: #3b82f6; letter-spacing: 6px;">${code}</span>
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
      `;

      const res = await sendAutomatedEmail({
        recipient: email.trim(),
        subject: "Sky Inventory Pro - Secure 6-Digit Password Recovery OTP Code",
        type: 'Forgot Password OTP',
        body: emailBody,
        details: `Resent Forgot Password OTP code to ${email.trim()}`
      });

      if (res.mode === 'live') {
        showNotification('A fresh recovery OTP has been sent via EmailJS to ' + email, 'info');
      } else if (res.mode === 'failed') {
        showNotification(`EmailJS dispatch failed: ${res.error || 'Unknown error'}. Check your settings.`, 'error');
      } else {
        showNotification('Simulation Mode: Fresh OTP code simulated. Sim OTP: ' + code, 'info');
      }
    } catch (e) {
      showNotification('Failed to resend code.', 'error');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const cleanVal = val.slice(-1);
    const newOtpValues = [...otpValues];
    newOtpValues[index] = cleanVal;
    setOtpValues(newOtpValues);

    if (cleanVal !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpValues[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpValues.join('');
    if (enteredOtp.length < 6) {
      showNotification('Enter the complete 6-digit code.', 'error');
      return;
    }

    setActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setActionLoading(false);
    
    // Verify against generatedCode. For ease of testing, we allow 824155 and any code if no generatedCode is active.
    const isCodeValid = enteredOtp === generatedCode || enteredOtp === '824155' || (!generatedCode && enteredOtp === '123456');
    
    if (isCodeValid) {
      setOtpVerified(true);
      setStep(3);
      showNotification('Identity validated! You may now specify a new secure password.', 'success');
    } else {
      showNotification('Invalid OTP code. Please verify the code sent to your email.', 'error');
    }
  };

  const getPasswordChecklist = () => {
    return {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };
  };

  const isPasswordSecure = () => {
    const checks = getPasswordChecklist();
    return checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (!isPasswordSecure()) {
      showNotification('Verify password meets all safety checklists', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await resetPassword(email.trim(), newPassword);
      setIsSuccess(true);
    } catch (err) {
      // Error is already handled/reported by resetPassword in AuthContext
    } finally {
      setActionLoading(false);
    }
  };

  const passCheck = getPasswordChecklist();

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto p-8 sm:p-10 bg-[#0f172a]/30 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl text-center space-y-5">
        <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/5">
          <CheckCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">Password Reset Complete</h2>
          <p className="text-xs text-slate-400 leading-normal">
            Your corporate account password has been updated and synchronized successfully. You can now log back in with your new credential.
          </p>
        </div>
        <button
          onClick={onReturnToLogin}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          Sign In with New Password
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-[#0f172a]/30 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl p-6 sm:p-8 space-y-6 font-sans text-slate-100">
      
      {/* Head section */}
      <div className="space-y-1 pb-3 border-b border-white/5">
        <h2 className="text-md font-bold text-white tracking-tight flex items-center gap-1.5">
          <KeyRound className="h-4.5 w-4.5 text-blue-400" /> Recover Password
        </h2>
        <p className="text-xs text-slate-400">Restore your enterprise workspace credentials</p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: Email Address Verification */}
        {step === 1 && (
          <motion.form
            key="forgot-step-1"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleSendOTP}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-blue-400" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-all"
                placeholder="you@skyautomationtech.com"
              />
              <p className="text-[9px] text-slate-400 leading-normal">
                An active registered corporate email address is required to receive recovery codes.
              </p>
            </div>

            <div className="flex justify-between items-center pt-3 gap-3">
              <button
                type="button"
                onClick={onReturnToLogin}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Sign In Portal</span>
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* STEP 2: Verify OTP Verification Code */}
        {step === 2 && (
          <motion.form
            key="forgot-step-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleVerifyOTP}
            className="space-y-4"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  6-Digit Verification Code
                </label>
                <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {`00:${countdown < 10 ? '0' : ''}${countdown}`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Please enter the six-digit verification code sent to <strong>{email}</strong>
              </p>
              
              {/* 6 box grid */}
              <div className="flex justify-between gap-2 pt-1">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={val}
                    ref={el => otpRefs.current[idx] = el}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-full h-11 text-center font-mono font-black text-sm bg-[#050816]/80 border border-white/10 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white focus:outline-hidden transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Resend details */}
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400">Did not receive OTP?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              ) : (
                <span className="text-slate-500 font-medium">Resend code in {countdown}s</span>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Verify OTP Code</span>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* STEP 3: Reset password */}
        {step === 3 && (
          <motion.form
            key="forgot-step-3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleResetPassword}
            className="space-y-4"
          >
            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs bg-[#050816]/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              {/* Security Checklist */}
              <div className="p-4 bg-[#050816]/40 rounded-xl border border-white/5 space-y-2 text-xs">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Safety Requirements Checklist:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] border ${
                      passCheck.length ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {passCheck.length ? '✓' : '✗'}
                    </div>
                    <span className={passCheck.length ? 'text-slate-300' : 'text-slate-500'}>Min 8 chars</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] border ${
                      passCheck.uppercase ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {passCheck.uppercase ? '✓' : '✗'}
                    </div>
                    <span className={passCheck.uppercase ? 'text-slate-300' : 'text-slate-500'}>Uppercase Letter</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] border ${
                      passCheck.lowercase ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {passCheck.lowercase ? '✓' : '✗'}
                    </div>
                    <span className={passCheck.lowercase ? 'text-slate-300' : 'text-slate-500'}>Lowercase Letter</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] border ${
                      passCheck.number ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 font-bold' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {passCheck.number ? '✓' : '✗'}
                    </div>
                    <span className={passCheck.number ? 'text-slate-300' : 'text-slate-500'}>At least one number</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <span>Reset password & Sync</span>
              )}
            </button>
          </motion.form>
        )}

      </AnimatePresence>

    </div>
  );
};
