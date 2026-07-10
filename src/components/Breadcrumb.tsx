import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  currentView: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentView }) => {
  return (
    <nav className="flex items-center text-zinc-500 dark:text-zinc-400 text-xs font-medium py-1" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <span className="inline-flex items-center text-zinc-400 dark:text-zinc-500">
            <Home className="h-3.5 w-3.5 mr-1" />
            <span>Sky Inventory Pro</span>
          </span>
        </li>
        <li>
          <div className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            <span className="ml-1 md:ml-2 font-medium text-zinc-600 dark:text-zinc-300">
              {currentView === 'Dashboard' ? 'Dashboard' : 'Modules'}
            </span>
          </div>
        </li>
        {currentView !== 'Dashboard' && (
          <li aria-current="page">
            <div className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
              <span className="ml-1 md:ml-2 font-semibold text-blue-600 dark:text-blue-400">
                {currentView}
              </span>
            </div>
          </li>
        )}
      </ol>
    </nav>
  );
};
