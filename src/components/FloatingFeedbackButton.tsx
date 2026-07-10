import React, { useState } from 'react';
import { MessageSquare, Heart } from 'lucide-react';
import { openFeedbackForm } from '../utils/feedback';

export const FloatingFeedbackButton: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center font-sans">
      {/* Tooltip */}
      {showTooltip && (
        <div className="mr-3 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[11px] font-bold rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-200">
          Send Feedback
        </div>
      )}

      {/* Button */}
      <button
        onClick={openFeedbackForm}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Send Feedback"
        id="floating-feedback-btn"
        className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 group"
      >
        <MessageSquare className="h-5 w-5 transition-transform group-hover:rotate-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </button>
    </div>
  );
};
