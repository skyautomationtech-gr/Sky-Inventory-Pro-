import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginView } from '../components/auth/LoginView';
import { RegistrationView } from '../components/auth/RegistrationView';
import { ForgotPasswordView } from '../components/auth/ForgotPasswordView';
import { AdminReviewView } from '../components/auth/AdminReviewView';
import { EmailTemplatesView } from '../components/auth/EmailTemplatesView';
import { Sparkles, ArrowLeft, Shield } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'login' | 'register' | 'forgot' | 'admin-review' | 'email-templates'>('login');

  return (
    <div className="min-h-screen bg-[#050816] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Top Banner indicating Sandbox state if not in main login */}
      {activeMode !== 'login' && (
        <div className="max-w-4xl mx-auto w-full mb-4">
          <div className="bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-mono text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Sky Inventory Pro Auth Sandbox</span>
            </span>
            <button
              onClick={() => setActiveMode('login')}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 transition-all cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Return to Login Portal</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center my-auto w-full">
        <div className="w-full max-w-7xl">
          <AnimatePresence mode="wait">
            {activeMode === 'login' && (
              <motion.div
                key="login-pane"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
              >
                <LoginView 
                  onSwitchMode={(m) => setActiveMode(m as any)} 
                  onShowAdminReview={() => setActiveMode('admin-review')}
                  onShowEmailTemplates={() => setActiveMode('email-templates')}
                />
              </motion.div>
            )}

            {activeMode === 'register' && (
              <motion.div
                key="register-pane"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <RegistrationView onReturnToLogin={() => setActiveMode('login')} />
              </motion.div>
            )}

            {activeMode === 'forgot' && (
              <motion.div
                key="forgot-pane"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <ForgotPasswordView onReturnToLogin={() => setActiveMode('login')} />
              </motion.div>
            )}

            {activeMode === 'admin-review' && (
              <motion.div
                key="admin-review-pane"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <AdminReviewView />
              </motion.div>
            )}

            {activeMode === 'email-templates' && (
              <motion.div
                key="email-templates-pane"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <EmailTemplatesView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Corporate Compliance Footer */}
      <footer className="w-full text-center py-4 border-t border-white/5 text-[10px] text-slate-600 font-mono tracking-wider mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>POWERED BY SKY AUTOMATION TECH CO. LTD • SECURED VIA IDENTITY PRO®</p>
          <p className="flex items-center gap-1 text-[9px] text-blue-500/60">
            <Shield className="h-3 w-3" /> ISO 27001 CORPORATE SECURITY AUDIT ACTIVE
          </p>
        </div>
      </footer>

    </div>
  );
};
