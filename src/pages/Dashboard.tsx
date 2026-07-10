import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Boxes, ClipboardList, TrendingUp, AlertTriangle, 
  DollarSign, Sparkles, User, Shield, CheckCircle, 
  Settings, Scan, RefreshCw, Layers, ArrowRight, ShieldCheck, Database, HardDrive 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, testConnection } from '../firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { QuickStats, ActivityLog } from '../types';

interface DashboardProps {
  onQuickActionClick: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onQuickActionClick }) => {
  const { profile, user, showNotification } = useAuth();
  
  const [stats, setStats] = useState<QuickStats>({
    totalProducts: 0,
    stockValue: 0,
    outOfStock: 0,
    lowStockCount: 0,
    dailySalesCount: 0,
    dailyRevenue: 0
  });

  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [dbStatus, setDbStatus] = useState<boolean | null>(null);

  // 1. Sync & Seed Stats
  useEffect(() => {
    if (!user) return;

    const statsDocRef = doc(db, 'system_stats', 'global');
    
    // Use onSnapshot for real-time live data syncing
    const unsubscribe = onSnapshot(statsDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.data() as QuickStats);
        setDbStatus(true);
      } else {
        // Doc doesn't exist, seed it with default zero values in the database!
        const defaultStats: QuickStats = {
          totalProducts: 0,
          stockValue: 0.00,
          outOfStock: 0,
          lowStockCount: 0,
          dailySalesCount: 0,
          dailyRevenue: 0.00
        };
        try {
          await setDoc(statsDocRef, defaultStats);
          setStats(defaultStats);
          setDbStatus(true);
        } catch (err) {
          console.error("Error seeding default stats:", err);
          setDbStatus(false);
          try {
            handleFirestoreError(err, OperationType.CREATE, 'system_stats/global');
          } catch (inner) {}
        }
      }
      setLoadingStats(false);
    }, (error) => {
      console.error("Failed to snapshot stats:", error);
      setLoadingStats(false);
      setDbStatus(false);
      try {
        handleFirestoreError(error, OperationType.GET, 'system_stats/global');
      } catch (inner) {}
    });

    return unsubscribe;
  }, [user]);

  // 2. Fetch Recent Activity Logs
  useEffect(() => {
    if (!user) return;

    const logsCollectionRef = collection(db, 'activity_logs');
    const logsQuery = query(logsCollectionRef, orderBy('timestamp', 'desc'), limit(5));

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logs: ActivityLog[] = [];
      snapshot.forEach((doc) => {
        logs.push(doc.data() as ActivityLog);
      });
      setRecentLogs(logs);
      setLoadingLogs(false);
    }, (error) => {
      console.error("Failed to snapshot activity logs:", error);
      setLoadingLogs(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      } catch (inner) {}
    });

    return unsubscribe;
  }, [user]);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(val);
  };

  return (
    <div className="space-y-8 py-4 px-2">
      
      {/* 1. Header / Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-indigo-500/10 blur-2xl rounded-full" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-md border border-white/20 tracking-wider uppercase">
              <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" /> Foundation Engine Live
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome Back, {profile?.fullName || 'Operator'}
            </h1>
            <p className="text-xs text-blue-100/90 max-w-xl leading-relaxed">
              Sky Inventory Pro is configured with active Firestore secure synchronization. 
              Role-Based Access Control is enforced on all transactional endpoints.
            </p>
          </div>

          <div className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-4 items-center">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center text-white font-semibold">
              {profile?.role?.substring(0, 2).toUpperCase() || 'ST'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold leading-none">{profile?.role || 'Staff'}</p>
              <p className="text-[10px] text-blue-200 mt-1">{profile?.department || 'Operations'}</p>
              <p className="text-[10px] text-blue-200 mt-0.5 font-mono text-zinc-300">ID: {profile?.employeeId || 'Pending'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. System Status Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Zero-Trust Environment Status
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Continuous integrity scans for Cloud resources</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            System Secure
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/40 dark:border-slate-800/50 flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Firebase Authentication</p>
              <p className="text-[9px] text-emerald-500 font-medium">Synced & Guarded</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/40 dark:border-slate-800/50 flex items-center gap-3">
            <Database className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Cloud Firestore DB</p>
              <p className={`text-[9px] font-medium ${dbStatus === false ? 'text-rose-500' : 'text-emerald-500'}`}>
                {dbStatus === false ? 'Connection Restricted' : 'Active Channel Ready'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/40 dark:border-slate-800/50 flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Firebase Cloud Storage</p>
              <p className="text-[9px] text-emerald-500 font-medium">Ready (Profile Buckets)</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Statistics Bento Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
            Live Business Stats
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Directly connected to cloud document databases</p>
        </div>

        {loadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {/* 1. Total Products */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Products</span>
                <Boxes className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight font-mono">
                  {stats.totalProducts}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Catalog count</p>
              </div>
            </div>

            {/* 2. Stock Value */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Asset Value</span>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight font-mono">
                  {formatCurrency(stats.stockValue)}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Cumulative valuation</p>
              </div>
            </div>

            {/* 3. Out of stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Out of Stock</span>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-2">
                <p className={`text-xl sm:text-2xl font-black tracking-tight font-mono ${stats.outOfStock > 0 ? 'text-rose-600' : 'text-slate-950 dark:text-white'}`}>
                  {stats.outOfStock}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Immediate reorder</p>
              </div>
            </div>

            {/* 4. Low stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Low Stock</span>
                <ClipboardList className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <p className={`text-xl sm:text-2xl font-black tracking-tight font-mono ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-950 dark:text-white'}`}>
                  {stats.lowStockCount}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Under safety limit</p>
              </div>
            </div>

            {/* 5. Daily Sales */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sales Today</span>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight font-mono">
                  {stats.dailySalesCount}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Completed invoices</p>
              </div>
            </div>

            {/* 6. Daily Revenue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Revenue Today</span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight font-mono">
                  {formatCurrency(stats.dailyRevenue)}
                </p>
                <p className="text-[9px] text-slate-400 mt-1">Inflow today</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Grid: Quick Actions & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Bento: Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-80">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
              Quick Operational Control
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <button 
                onClick={() => onQuickActionClick('Products')}
                className="p-3 text-left bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200/50 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 rounded-2xl transition-all group"
              >
                <Boxes className="h-4.5 w-4.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">Add Product</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Catalog entry</p>
              </button>

              <button 
                onClick={() => onQuickActionClick('POS')}
                className="p-3 text-left bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200/50 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 rounded-2xl transition-all group"
              >
                <TrendingUp className="h-4.5 w-4.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">New Sale (POS)</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Invoicing panel</p>
              </button>

              <button 
                onClick={() => onQuickActionClick('QR Scanner')}
                className="p-3 text-left bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200/50 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 rounded-2xl transition-all group"
              >
                <Scan className="h-4.5 w-4.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">Scan Barcode</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Quick dispatch</p>
              </button>

              <button 
                onClick={() => onQuickActionClick('Settings')}
                className="p-3 text-left bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200/50 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 rounded-2xl transition-all group"
              >
                <Settings className="h-4.5 w-4.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">System Config</p>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Audit & levels</p>
              </button>
            </div>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={() => onQuickActionClick('Profile')}
              className="w-full py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <User className="h-3.5 w-3.5" />
              <span>Configure My Profile Credentials</span>
            </button>
          </div>
        </div>

        {/* Right Bento: Audit Log / Recent Activities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between h-80">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Immutable System Activity Logs
              </h3>
              <span className="text-[10px] font-medium text-slate-400">Live feed</span>
            </div>

            {loadingLogs ? (
              <div className="mt-4 space-y-3">
                 {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 dark:bg-slate-950 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p>No activity logs recorded yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Actions on this profile will produce secure logs.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-52 overflow-y-auto pr-1">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/30 dark:border-slate-800/30 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm sm:max-w-md">
                        {log.details}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        By: <span className="font-medium text-slate-600 dark:text-slate-300">{log.userName}</span> ({log.userRole})
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-400 flex-shrink-0 font-medium">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span>Security audit compliant</span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">
              Full registry audit trail <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
