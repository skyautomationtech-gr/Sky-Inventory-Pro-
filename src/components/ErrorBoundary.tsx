import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { openFeedbackForm } from '../utils/feedback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-lg space-y-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-900/30">
              <AlertTriangle className="h-7 w-7 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Unexpected Runtime Exception</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                An internal subsystem error (Code 500) has interrupted your operational stream.
              </p>
              {this.state.error && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-left">
                  <p className="font-mono text-[10px] text-rose-500 font-bold overflow-x-auto whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer font-sans"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Dashboard</span>
              </button>
              
              <button
                onClick={openFeedbackForm}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer font-sans"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                <span>Report Problem</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
