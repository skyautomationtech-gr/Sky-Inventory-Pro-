import React, { useEffect } from 'react';
import { openFeedbackForm } from '../utils/feedback';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface NotificationToastProps {
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full pointer-events-none flex flex-col items-end gap-2">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 w-full p-4 rounded-xl border shadow-xl bg-white dark:bg-zinc-900 ${
              notification.type === 'success' 
                ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : notification.type === 'error'
                ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20'
                : 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === 'success' && (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {notification.type === 'error' && (
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              )}
              {notification.type === 'info' && (
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="flex-1">
              <p className={`text-sm font-medium ${
                notification.type === 'success'
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : notification.type === 'error'
                  ? 'text-rose-800 dark:text-rose-300'
                  : 'text-blue-800 dark:text-blue-300'
              }`}>
                {notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Notification'}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                {notification.message}
                {notification.type === 'success' && (
                  <span className="block mt-1.5 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-800/20">
                    Transaction successful!{' '}
                    <button
                      onClick={openFeedbackForm}
                      className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Share your feedback
                    </button>
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 ml-4 inline-flex text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors duration-150 rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
