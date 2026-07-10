import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { openFeedbackForm } from '../utils/feedback';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 mt-12 border-t border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="text-slate-400 dark:text-slate-500 font-medium text-center sm:text-left">
          <span>© 2026 Sky Inventory Pro. Powered by Sky Automation Technologies. v1.0.0</span>
        </div>
        
        <button
          onClick={openFeedbackForm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 font-bold transition-all cursor-pointer shadow-2xs"
          id="footer-feedback-btn"
        >
          <LifeBuoy className="h-4 w-4 text-blue-500" />
          <span>Send Feedback & Support</span>
        </button>
      </div>
    </footer>
  );
};
