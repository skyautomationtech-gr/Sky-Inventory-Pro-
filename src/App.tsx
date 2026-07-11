import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Breadcrumb } from './components/Breadcrumb';
import { NotificationToast } from './components/NotificationToast';
import { Footer } from './components/Footer';
import { FloatingFeedbackButton } from './components/FloatingFeedbackButton';
import { Dashboard } from './pages/Dashboard';
import { ProfileEdit } from './components/ProfileEdit';
import { ComingSoon } from './pages/ComingSoon';
import { AuthPage } from './pages/AuthPage';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Brands } from './pages/Brands';
import { Suppliers } from './pages/Suppliers';
import { Units } from './pages/Units';
import { WarehousePage } from './pages/Warehouse';
import { InventoryPage } from './pages/Inventory';
import { Purchase } from './pages/Purchase';
import { Customers } from './pages/Customers';
import { POS } from './pages/POS';
import { Sales } from './pages/Sales';
import { Accounting } from './pages/Accounting';
import { Employees } from './pages/Employees';
import { CRM } from './pages/CRM';
import { EnterpriseDashboard } from './components/enterprise/EnterpriseDashboard';
import { EnterpriseAdministration } from './components/enterprise/EnterpriseAdministration';
import { AIDashboard } from './components/enterprise/AIDashboard';
import { SecurityCenter } from './components/auth/SecurityCenter';
import { AdminSecurity } from './components/auth/AdminSecurity';
import { Loader2, AlertTriangle, Mail } from 'lucide-react';
import { testConnection } from './firebase';

const AppContent: React.FC = () => {
  const { user, loading, notification, clearNotification, sendVerificationEmail, actionLoading } = useAuth();
  const [currentView, setCurrentView] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Handle Theme Switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Test Firestore Connection on Boot
  useEffect(() => {
    testConnection();
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20 mx-auto animate-pulse">
            S
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Sky Inventory Pro</h2>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase font-mono">Synchronizing Secure Session...</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <>
        <AuthPage />
        <NotificationToast notification={notification} onClose={clearNotification} />
      </>
    );
  }

  // Main Dashboard Workspace Layout
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex font-sans">
      
      {/* Responsive Left Sidebar Drawer */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          currentTheme={theme} 
          onThemeToggle={toggleTheme}
          onEditProfileClick={() => setCurrentView('Profile')}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20">
          
          {/* Email Verification Banner Warning (if unverified) */}
          {user && !user.emailVerified && user.email !== 'skyautomationtech@gmail.com' && (
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-900/30 px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
                <span className="font-medium leading-relaxed">
                  Your profile has pending verification constraints. Verify your email <strong>({user.email})</strong> to secure write channels.
                </span>
              </div>
              <button
                onClick={sendVerificationEmail}
                disabled={actionLoading}
                className="text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 underline cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {actionLoading ? 'Resending...' : 'Resend Verification Link'}
              </button>
            </div>
          )}

          {/* Page Padding and Breadcrumbs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
            
            <Breadcrumb currentView={currentView} />

            {/* Active View Switcher */}
            {currentView === 'Dashboard' && (
              <Dashboard onQuickActionClick={(view) => setCurrentView(view)} />
            )}

            {currentView === 'Profile' && (
              <ProfileEdit />
            )}

            {currentView === 'Products' && (
              <Products />
            )}

            {currentView === 'Categories' && (
              <Categories />
            )}

            {currentView === 'Brands' && (
              <Brands />
            )}

            {currentView === 'Suppliers' && (
              <Suppliers />
            )}

            {currentView === 'Units' && (
              <Units />
            )}

            {currentView === 'Warehouse' && (
              <WarehousePage />
            )}

            {currentView === 'Inventory' && (
              <InventoryPage />
            )}

            {currentView === 'Purchase' && (
              <Purchase />
            )}

            {currentView === 'Customers' && (
              <Customers />
            )}

            {currentView === 'POS' && (
              <POS />
            )}

            {currentView === 'Sales' && (
              <Sales />
            )}

            {currentView === 'Accounting' && (
              <Accounting />
            )}

            {currentView === 'Employees' && (
              <Employees />
            )}

            {currentView === 'CRM' && (
              <CRM />
            )}

            {currentView === 'Enterprise Dashboard' && (
              <EnterpriseDashboard />
            )}

            {currentView === 'Enterprise Admin' && (
              <EnterpriseAdministration />
            )}

            {currentView === 'AI BI Analytics' && (
              <AIDashboard />
            )}

            {currentView === 'Security Center' && (
              <SecurityCenter />
            )}

            {currentView === 'Admin Security' && (
              <AdminSecurity />
            )}

            {currentView !== 'Dashboard' && 
             currentView !== 'Profile' && 
             currentView !== 'Products' && 
             currentView !== 'Categories' && 
             currentView !== 'Brands' && 
             currentView !== 'Suppliers' && 
             currentView !== 'Units' && 
             currentView !== 'Warehouse' && 
             currentView !== 'Inventory' && 
             currentView !== 'Purchase' && 
             currentView !== 'Customers' && 
             currentView !== 'POS' && 
             currentView !== 'Sales' && 
             currentView !== 'Accounting' && 
             currentView !== 'Employees' && 
             currentView !== 'CRM' && 
             currentView !== 'Enterprise Dashboard' && 
             currentView !== 'Enterprise Admin' && 
             currentView !== 'AI BI Analytics' && 
             currentView !== 'Security Center' && 
             currentView !== 'Admin Security' && (
              <ComingSoon moduleName={currentView} />
            )}

          </div>

          <Footer />

        </main>

      </div>

      {/* Slide-in Notifications Toast */}
      <NotificationToast notification={notification} onClose={clearNotification} />

      {/* Floating Action Feedback Controls */}
      <FloatingFeedbackButton />

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
