import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Bell, Moon, Sun, Menu, ChevronDown, User, 
  LogOut, Shield, Key, BellOff, Settings, CheckCircle, AlertTriangle,
  HelpCircle, BookOpen, FileText, LifeBuoy, Bug, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openFeedbackForm } from '../utils/feedback';

interface HeaderProps {
  onMenuToggle: () => void;
  currentTheme: 'light' | 'dark';
  onThemeToggle: () => void;
  onEditProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  currentTheme, 
  onThemeToggle,
  onEditProfileClick 
}) => {
  const { profile, logout, actionLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  // Mock Notification Feed (High Fidelity)
  const notifications = [
    {
      id: 1,
      title: 'Database connection verified',
      desc: 'Durable Firestore backend synchronization is active.',
      time: 'Just now',
      type: 'success',
      icon: CheckCircle,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
    },
    {
      id: 2,
      title: 'RBAC Authorization active',
      desc: 'Roles Super Admin, Admin, Manager, and Staff set up.',
      time: '5 mins ago',
      type: 'info',
      icon: Shield,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20'
    },
    {
      id: 3,
      title: 'Email verification reminder',
      desc: 'Verify your email to satisfy zero-trust security checks.',
      time: '1 hour ago',
      type: 'warning',
      icon: AlertTriangle,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20'
    }
  ];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      
      {/* Left Area: Search & Hamburger */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        {/* Toggle Drawer Button (Mobile/Tablet) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Bar Container */}
        <div className="relative w-full max-w-sm hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="search"
            placeholder="Search index, invoices, SKUs..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
          />
        </div>
      </div>

      {/* Right Area: Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Theme Toggle Button */}
        <button
          onClick={onThemeToggle}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          title={currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {currentTheme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4 text-amber-400" />
          )}
        </button>

        {/* Notification Icon & Menu */}
        <div className="relative" ref={notifyRef}>
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowProfileMenu(false);
              setShowHelpMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {/* High Fidelity Notification Dropdown */}
          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">System Events</span>
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => {
                  const IconComp = n.icon;
                  return (
                    <div key={n.id} className="p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 h-8 w-8 flex items-center justify-center ${n.iconColor}`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.desc}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hover:underline cursor-pointer">
                  View all system logs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Help Menu Dropdown */}
        <div className="relative font-sans" ref={helpRef}>
          <button
            onClick={() => {
              setShowHelpMenu(!showHelpMenu);
              setShowNotificationMenu(false);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
            title="Help & Support"
            id="help-menu-btn"
          >
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <span className="hidden md:inline">Help</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showHelpMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Support & Feedback</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={(e) => { openFeedbackForm(e); setShowHelpMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium text-left cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  <span>User Guide</span>
                </button>
                <button
                  onClick={(e) => { openFeedbackForm(e); setShowHelpMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium text-left cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>Documentation</span>
                </button>
                <button
                  onClick={(e) => { openFeedbackForm(e); setShowHelpMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium text-left cursor-pointer"
                >
                  <LifeBuoy className="h-4 w-4 text-emerald-500" />
                  <span>Contact Support</span>
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={(e) => { openFeedbackForm(e); setShowHelpMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 font-semibold transition-colors text-left cursor-pointer"
                >
                  <Bug className="h-4 w-4 text-rose-500" />
                  <span>Report a Bug</span>
                </button>
                <button
                  onClick={(e) => { openFeedbackForm(e); setShowHelpMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-600 dark:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold transition-colors text-left cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  <span>Send Suggestion</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Header Feedback Quick Link */}
        <button
          onClick={openFeedbackForm}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all border border-blue-500/20 cursor-pointer"
          title="Send Feedback / Suggestion"
          id="header-feedback-btn"
        >
          <MessageSquare className="h-3.5 w-3.5 animate-pulse" />
          <span>Feedback</span>
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Profile Menu & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-2 p-1 pl-1 pr-2 sm:pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 overflow-hidden flex items-center justify-center flex-shrink-0">
              {profile?.profilePhoto ? (
                <img 
                  src={profile.profilePhoto} 
                  alt="Avatar" 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SI'}
                </span>
              )}
            </div>
            
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                {profile?.fullName || 'My Account'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {profile?.role || 'Staff'}
              </p>
            </div>
            
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
              {/* Header Details */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-950 dark:text-white truncate">
                  {profile?.fullName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {profile?.email}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  ID: {profile?.employeeId || 'Not Assigned'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onEditProfileClick();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium text-left"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>My Profile Details</span>
                </button>
                
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  onClick={handleLogout}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors font-semibold text-left disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>{actionLoading ? 'Logging out...' : 'Secure Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
