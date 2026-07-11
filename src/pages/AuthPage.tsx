import React, { useState, useEffect } from 'react';
import { openFeedbackForm } from '../utils/feedback';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock, User, Phone, Hash, Briefcase, Shield, 
  ArrowRight, ShieldAlert, Sparkles, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const AuthPage: React.FC = () => {
  const { login, register, forgotPassword, actionLoading, error } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify-notice'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Staff');

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);

  // Clear states when mode changes
  useEffect(() => {
    setForgotSuccess(null);
  }, [mode]);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Password validation state
  const getPasswordValidation = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  };

  const isPasswordValid = (password: string) => {
    const v = getPasswordValidation(password);
    return v.length && v.uppercase && v.lowercase && v.number && v.special;
  };

  // Forms submit handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    try {
      await login(loginEmail.trim(), loginPassword, rememberMe);
    } catch (err) {
      // Notification handled in AuthContext
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (regFullName.trim().length < 2) return;
    if (!isPasswordValid(regPassword)) return;
    if (regPassword !== regConfirmPassword) return;

    try {
      await register(
        regEmail.trim(),
        regPassword,
        regFullName.trim(),
        regPhone.trim(),
        regEmployeeId.trim(),
        regRole,
        regDepartment.trim()
      );
      setRegisteredEmail(regEmail);
      setMode('verify-notice');
    } catch (err) {
      // Notification handled in AuthContext
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSuccess(null);

    // Client-side validation of email format before checking
    const trimmedEmail = forgotEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return; // Will be handled by the form validator or can throw custom error if needed.
    }

    try {
      await forgotPassword(trimmedEmail);
      setForgotSuccess("Password reset link has been sent successfully. Please check your inbox and spam folder.");
    } catch (err: any) {
      // Error is handled in AuthContext and rendered inline
    }
  };

  const val = getPasswordValidation(regPassword);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* Left Column: Brand & Hero Slider */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full -translate-x-1/3 translate-y-1/3" />
        
        {/* Brand Header */}
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white text-blue-600 flex items-center justify-center font-black text-xl shadow-lg">
            S
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Sky Inventory</h1>
            <p className="text-[10px] font-semibold tracking-widest text-blue-200 mt-1 uppercase">Enterprise Pro</p>
          </div>
        </div>

        {/* Feature Highlights Carousel/Listing */}
        <div className="relative space-y-8 my-auto max-w-sm">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 border border-white/20 tracking-wider uppercase">
              <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" /> Phase 1 Foundation
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Enterprise Stock & Account Control
            </h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Durable multi-user accounting pipelines mapped over secure role authorization grids.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Role-Based Security (RBAC)</h4>
                <p className="text-[11px] text-blue-200 mt-0.5">Four tiers of distinct functional privileges: Super Admin, Admin, Manager, and Staff.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Email Verification Enforced</h4>
                <p className="text-[11px] text-blue-200 mt-0.5">Guards business data behind explicit verification verification states.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="relative text-xs text-blue-200">
          <p>© 2026 Sky Automation Technologies. All rights reserved.</p>
        </div>

      </div>

      {/* Right Column: Authentication Forms */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900/50 p-6 sm:p-10 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          
          <AnimatePresence mode="wait">
            
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sign In</h3>
                  <p className="text-xs text-slate-500">Access your business dashboard portal</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      placeholder="you@company.com"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                      Remember Me
                    </label>
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl flex gap-2 text-xs text-rose-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify and Enter Dashboard</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-500">
                    Need a corporate profile?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                  <p className="text-[11px]">
                    <button
                      type="button"
                      onClick={openFeedbackForm}
                      className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      Feedback & Support / Report Bug
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* REGISTER MODE */}
            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Profile</h3>
                  <p className="text-xs text-slate-500">Declare a corporate employee credential identity</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" /> Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="Jane Doe"
                    />
                    {regFullName && regFullName.trim().length < 2 && (
                      <p className="text-[10px] text-rose-500 font-medium">Name must be at least 2 characters.</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="jane.doe@company.com"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 text-slate-400" /> Employee ID
                    </label>
                    <input
                      type="text"
                      required
                      value={regEmployeeId}
                      onChange={(e) => setRegEmployeeId(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden font-mono"
                      placeholder="EMP-10492"
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Department
                    </label>
                    <input
                      type="text"
                      required
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="Logistics"
                    />
                  </div>

                  {/* Role Option for Demo testing */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-slate-400" /> Requested Role Tier
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-950 dark:text-slate-100 focus:outline-hidden"
                    >
                      <option value="Staff">Staff (Warehouse / Sales Operator)</option>
                      <option value="Manager">Manager (Supervisory control)</option>
                      <option value="Admin">Admin (Full operations control)</option>
                      <option value="Super Admin">Super Admin (System configuration)</option>
                    </select>
                  </div>

                  {/* Password & Validation Indicator */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-slate-400" /> Choose Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Real-time strict password strength verification checklist */}
                    {regPassword && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-1.5 text-[10px]">
                        <p className="font-semibold text-slate-500">Password requirements:</p>
                        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${val.length ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={val.length ? 'text-emerald-600 dark:text-emerald-400 line-through' : ''}>Min. 8 characters</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${val.uppercase ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={val.uppercase ? 'text-emerald-600 dark:text-emerald-400 line-through' : ''}>Uppercase letter</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${val.lowercase ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={val.lowercase ? 'text-emerald-600 dark:text-emerald-400 line-through' : ''}>Lowercase letter</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${val.number ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={val.number ? 'text-emerald-600 dark:text-emerald-400 line-through' : ''}>A number</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${val.special ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className={val.special ? 'text-emerald-600 dark:text-emerald-400 line-through' : ''}>Special character (@, #, $, etc.)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-slate-400" /> Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="••••••••"
                    />
                    {regConfirmPassword && regPassword !== regConfirmPassword && (
                      <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Passwords do not match.
                      </p>
                    )}
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl flex gap-2 text-xs text-rose-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={actionLoading || !isPasswordValid(regPassword) || regPassword !== regConfirmPassword}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Creating Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Corporate Registration</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                  <p className="text-[11px]">
                    <button
                      type="button"
                      onClick={openFeedbackForm}
                      className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      Feedback & Support / Report Bug
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recover Password</h3>
                  <p className="text-xs text-slate-500">Request password retrieval linkage code</p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Corporate Email
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                      placeholder="you@company.com"
                    />
                  </div>

                  {/* Success display */}
                  {forgotSuccess && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  {/* Error display */}
                  {error && !forgotSuccess && (
                    <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl flex gap-2 text-xs text-rose-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Return to Login Portal
                    </button>
                  </p>
                  <p className="text-[11px]">
                    <button
                      type="button"
                      onClick={openFeedbackForm}
                      className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      Feedback & Support / Report Bug
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* VERIFY NOTICE MODE */}
            {mode === 'verify-notice' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center"
              >
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Verification Dispatch</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    We've sent a zero-trust credential check link to:
                  </p>
                  <p className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {registeredEmail}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Please click the link in your email to satisfy standard account validation. 
                  You can dismiss this portal and enter the application now for testing.
                </p>

                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    I have Verified (Reload Page)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Allow proceeding into dashboard for developer demo purposes
                      window.location.reload();
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Dismiss & Enter App Preview
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={openFeedbackForm}
                      className="text-[11px] text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer"
                    >
                      Feedback & Support / Report Bug
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

    </div>
  );
};
