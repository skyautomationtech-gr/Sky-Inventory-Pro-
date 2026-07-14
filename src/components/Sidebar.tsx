import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Boxes, ClipboardList, Layers, Award, 
  Truck, Users, DollarSign, ShoppingCart, Monitor, 
  Warehouse, BarChart3, Calculator, UserCog, Barcode, 
  Scan, Settings, X, ShieldAlert, Scale, Target, Sparkles,
  Shield, UserCheck, Mail, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  name: string;
  icon: any;
}

interface MenuGroup {
  groupName: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    groupName: 'Core',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    groupName: 'Enterprise Control',
    items: [
      { name: 'Enterprise Dashboard', icon: ShieldAlert },
      { name: 'Enterprise Admin', icon: Settings },
      { name: 'AI BI Analytics', icon: Sparkles }
    ]
  },
  {
    groupName: 'Inventory',
    items: [
      { name: 'Products', icon: Boxes },
      { name: 'Inventory', icon: ClipboardList },
      { name: 'Categories', icon: Layers },
      { name: 'Brands', icon: Award },
      { name: 'Units', icon: Scale }
    ]
  },
  {
    groupName: 'Relations',
    items: [
      { name: 'Suppliers', icon: Truck },
      { name: 'Customers', icon: Users },
      { name: 'CRM', icon: Target }
    ]
  },
  {
    groupName: 'Transactions',
    items: [
      { name: 'Sales', icon: DollarSign },
      { name: 'Purchase', icon: ShoppingCart },
      { name: 'POS', icon: Monitor }
    ]
  },
  {
    groupName: 'Operations',
    items: [
      { name: 'Warehouse', icon: Warehouse },
      { name: 'Employees', icon: UserCog }
    ]
  },
  {
    groupName: 'Utilities',
    items: [
      { name: 'Barcode', icon: Barcode },
      { name: 'QR Scanner', icon: Scan }
    ]
  },
  {
    groupName: 'Security & Identity',
    items: [
      { name: 'Security Center', icon: Shield },
      { name: 'Admin Security', icon: UserCheck },
      { name: 'Admin Approval Dashboard', icon: ClipboardCheck },
      { name: 'Email Previews', icon: Mail }
    ]
  },
  {
    groupName: 'Systems',
    items: [
      { name: 'Reports', icon: BarChart3 },
      { name: 'Accounting', icon: Calculator },
      { name: 'Settings', icon: Settings }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, onClose }) => {
  const { profile } = useAuth();

  const handleItemClick = (name: string) => {
    setCurrentView(name);
    // Close sidebar on mobile after clicking
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Admin': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Manager': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const userRole = profile?.role || 'Staff';
  const isSecurityAdmin = ['Super Admin', 'Admin', 'Manager'].includes(userRole);
  const isSuperOrAdmin = ['Super Admin', 'Admin'].includes(userRole);

  const filteredMenuGroups = MENU_GROUPS.map(group => {
    let items = group.items;
    if (group.groupName === 'Security & Identity') {
      items = items.filter(item => {
        if (item.name === 'Admin Security') return isSecurityAdmin;
        if (item.name === 'Admin Approval Dashboard') return isSuperOrAdmin;
        if (item.name === 'Email Previews') return isSuperOrAdmin;
        return true;
      });
    }
    return { ...group, items };
  }).filter(group => group.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 border-r border-slate-800/80 text-slate-300 w-64">
      {/* Header / Brand */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-lg tracking-tight shadow-md shadow-blue-500/10">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white leading-none">
              Sky Inventory
            </span>
            <span className="text-[9px] font-bold text-blue-400 tracking-wider uppercase mt-1 leading-none">
              PRO EDITION
            </span>
          </div>
        </div>
        
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
            {profile?.profilePhoto ? (
              <img 
                src={profile.profilePhoto} 
                alt="Profile" 
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xs font-bold text-slate-300">
                {profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SI'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.fullName || 'Active Session'}
            </p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {profile?.email}
            </p>
            <div className="mt-1 flex">
              <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeColor(profile?.role || 'Staff')}`}>
                {profile?.role || 'Staff'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {filteredMenuGroups.map((group) => (
          <div key={group.groupName} className="space-y-1">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
              {group.groupName}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.name;
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleItemClick(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 group ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${
                        isActive 
                          ? 'text-white' 
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`} />
                      <span className="truncate">{item.name}</span>
                      {/* Interactive hover micro-effects */}
                      {!isActive && (
                        <span className="ml-auto w-1 h-1 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-center flex-shrink-0">
        <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600">
          Sky Inventory Pro v1.0.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:flex lg:flex-shrink-0 h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Responsive Overlay) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Sidebar Slide-out */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl h-full flex flex-col"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
