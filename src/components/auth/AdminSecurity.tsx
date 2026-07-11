import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, UserX, UserCheck, Key, ShieldCheck, MailCheck,
  Search, RefreshCw, Eye, AlertCircle, Ban, ArrowUpRight,
  Fingerprint, Clock, CheckCircle, Smartphone, AlertTriangle
} from 'lucide-react';
import { collection, onSnapshot, query, doc, updateDoc, getDocs, setDoc, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

interface UserAdminRecord {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  accountStatus: 'Active' | 'Pending' | 'Suspended' | 'Disabled' | 'Locked';
  emailVerified: boolean;
  failedAttempts?: number;
  isOnline?: boolean;
  lastActive?: string;
}

interface OTPLogRecord {
  id: string;
  email: string;
  code: string;
  timestamp: string;
  expiresAt: string;
  verified: boolean;
}

interface ResetRequestRecord {
  id: string;
  email: string;
  timestamp: string;
  success: boolean;
  ipAddress?: string;
}

export const AdminSecurity: React.FC = () => {
  const { showNotification } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'otps' | 'resets'>('users');
  
  // Lists
  const [users, setUsers] = useState<UserAdminRecord[]>([]);
  const [otps, setOtps] = useState<OTPLogRecord[]>([]);
  const [resets, setResets] = useState<ResetRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Real-time listener for users
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), async (snap) => {
      const list: UserAdminRecord[] = [];
      snap.forEach((d) => {
        list.push({ uid: d.id, ...d.data() } as UserAdminRecord);
      });

      // If no users exist, seed the active admin list
      if (list.length === 0) {
        const uRef = doc(db, 'users', 'skyautomationtech-uid');
        await setDoc(uRef, {
          uid: 'skyautomationtech-uid',
          fullName: 'Sky Automation Technical Office',
          email: 'skyautomationtech@gmail.com',
          phoneNumber: '+8801700000000',
          role: 'Super Admin',
          accountStatus: 'Active',
          emailVerified: true,
          failedAttempts: 0,
          isOnline: true,
          lastActive: new Date().toISOString()
        });
      } else {
        setUsers(list);
      }
      setLoading(false);
    });

    // Real-time listener for OTPs
    const unsubOtps = onSnapshot(collection(db, 'otp_codes'), async (snap) => {
      const list: OTPLogRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as OTPLogRecord);
      });

      if (list.length === 0) {
        // Seed some sample logs for enterprise validation
        const ref1 = doc(collection(db, 'otp_codes'));
        const ref2 = doc(collection(db, 'otp_codes'));
        try {
          await setDoc(ref1, {
            id: ref1.id,
            email: 'skyautomationtech@gmail.com',
            code: '459102',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
            verified: true
          });
          await setDoc(ref2, {
            id: ref2.id,
            email: 'auditor@skyinventory.pro',
            code: '110394',
            timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
            expiresAt: new Date(Date.now() - 3300 * 1000).toISOString(),
            verified: false
          });
        } catch (e) {}
      } else {
        setOtps(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    // Real-time listener for Reset Requests
    const unsubResets = onSnapshot(collection(db, 'password_reset_requests'), async (snap) => {
      const list: ResetRequestRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ResetRequestRecord);
      });

      if (list.length === 0) {
        const ref = doc(collection(db, 'password_reset_requests'));
        try {
          await setDoc(ref, {
            id: ref.id,
            email: 'employee@skyinventory.pro',
            timestamp: new Date(Date.now() - 7200 * 1000).toISOString(),
            success: true,
            ipAddress: '103.114.102.50'
          });
        } catch (e) {}
      } else {
        setResets(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    });

    return () => {
      unsubUsers();
      unsubOtps();
      unsubResets();
    };
  }, []);

  // Update User accountStatus (Lock/Unlock)
  const handleUpdateStatus = async (uid: string, currentStatus: string, action: 'lock' | 'unlock' | 'suspend') => {
    try {
      let nextStatus: 'Active' | 'Locked' | 'Suspended' = 'Active';
      if (action === 'lock') nextStatus = 'Locked';
      else if (action === 'suspend') nextStatus = 'Suspended';

      const uRef = doc(db, 'users', uid);
      await updateDoc(uRef, {
        accountStatus: nextStatus,
        failedAttempts: action === 'unlock' ? 0 : undefined // Reset attempts if unlocked
      });

      showNotification(`Account successfully marked as ${nextStatus}.`, 'success');
    } catch (err) {
      showNotification('Failed to change user administrative status.', 'error');
    }
  };

  // Reset Failed Attempts Counter
  const handleResetFailedAttempts = async (uid: string) => {
    try {
      const uRef = doc(db, 'users', uid);
      await updateDoc(uRef, {
        failedAttempts: 0,
        accountStatus: 'Active'
      });
      showNotification('Failed login attempt counters reset successfully.', 'success');
    } catch (err) {
      showNotification('Failed to reset counters.', 'error');
    }
  };

  // Filter list
  const filteredUsers = users.filter(u => {
    const s = searchTerm.toLowerCase();
    return u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
  });

  return (
    <div className="bg-[#0b0f19]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 sm:p-8 space-y-8 shadow-2xl relative text-slate-100 overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/25 tracking-wider uppercase text-rose-400 animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" /> Corporate Admin Security Console
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Enterprise Security & Identity Control
          </h2>
          <p className="text-xs text-slate-400">Lock, suspend, track verification tokens, and enforce password resets across accounts</p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'users' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            <span>Profile Lock Control</span>
          </button>
          <button
            onClick={() => setActiveTab('otps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'otps' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span>OTP Dispatch Logs</span>
          </button>
          <button
            onClick={() => setActiveTab('resets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'resets' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Password Resets</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TABS 1: USERS & LOCK CONTROLS */}
        {activeTab === 'users' && (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by profile name, email, or enterprise role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-zinc-950/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-2xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-950/60 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee details</th>
                      <th className="py-3 px-4">Access Credentials</th>
                      <th className="py-3 px-4">Verification State</th>
                      <th className="py-3 px-4">Failed Hits</th>
                      <th className="py-3 px-4 text-right">Emergency Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isLocked = u.accountStatus === 'Locked' || (u.failedAttempts && u.failedAttempts >= 5);
                      return (
                        <tr key={u.uid} className="border-b border-white/5 hover:bg-white/2">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} title={u.isOnline ? 'Online' : 'Offline'} />
                              <div>
                                <p className="font-extrabold text-white text-xs">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{u.role} • {u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-300">
                            {u.phoneNumber || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {u.emailVerified ? (
                                <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                  <ShieldCheck className="h-3 w-3 mr-0.5" /> Email Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400">
                                  <AlertCircle className="h-3 w-3 mr-0.5" /> Email Unverified
                                </span>
                              )}
                              
                              <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded border ${
                                u.accountStatus === 'Active' ? 'bg-blue-500/15 border-blue-500/25 text-blue-400' :
                                u.accountStatus === 'Suspended' ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' :
                                'bg-rose-500/15 border-rose-500/25 text-rose-400'
                              }`}>
                                {u.accountStatus}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono font-bold ${isLocked ? 'text-rose-400' : 'text-slate-300'}`}>
                                {u.failedAttempts || 0} / 5
                              </span>
                              {isLocked && (
                                <span className="inline-flex items-center text-[8px] px-1 py-0.2 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold uppercase">
                                  Node Locked
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isLocked ? (
                                <button
                                  onClick={() => handleResetFailedAttempts(u.uid)}
                                  className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                                  title="Reset password attempts and activate account"
                                >
                                  Unlock User
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(u.uid, u.accountStatus, 'lock')}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                                    title="Force suspend account access lock"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                  {u.accountStatus !== 'Suspended' && (
                                    <button
                                      onClick={() => handleUpdateStatus(u.uid, u.accountStatus, 'suspend')}
                                      className="px-2.5 py-1 text-slate-400 hover:text-white border border-white/5 rounded-lg text-[10px] hover:border-white/10 transition-all cursor-pointer"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  {u.accountStatus === 'Suspended' && (
                                    <button
                                      onClick={() => handleUpdateStatus(u.uid, u.accountStatus, 'unlock')}
                                      className="px-2.5 py-1 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 rounded-lg text-[10px] hover:border-emerald-500/25 transition-all cursor-pointer"
                                    >
                                      Activate
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* TABS 2: OTP LOGS */}
        {activeTab === 'otps' && (
          <motion.div
            key="otps-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10"
          >
            <h3 className="text-xs font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Fingerprint className="h-4.5 w-4.5 text-rose-500" /> Multi-Factor OTP Dispatch Audit Log
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otps.map((log) => {
                const expired = new Date(log.expiresAt).getTime() < Date.now();
                return (
                  <div key={log.id} className="p-4 bg-zinc-950/40 border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-all relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-extrabold text-white truncate max-w-[150px]">{log.email}</p>
                        <p className="text-[9px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        log.verified ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' :
                        expired ? 'bg-slate-500/15 border-white/5 text-slate-400' :
                        'bg-blue-500/15 border-blue-500/25 text-blue-400'
                      }`}>
                        {log.verified ? 'Verified Successfully' : expired ? 'Expired Key' : 'Pending Verification'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950/80 p-2.5 rounded-xl border border-white/5 font-mono">
                      <span className="text-[10px] text-slate-500">Security OTP Key:</span>
                      <span className="text-sm font-black text-rose-400 tracking-wider font-mono">{log.code}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Expires:</span>
                      <span>{new Date(log.expiresAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TABS 3: PASSWORD RESETS */}
        {activeTab === 'resets' && (
          <motion.div
            key="resets-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 relative z-10 text-xs"
          >
            <h3 className="text-xs font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Key className="h-4.5 w-4.5 text-blue-500" /> Password Reset Auditing Trail
            </h3>

            <div className="space-y-2">
              {resets.map((r) => (
                <div key={r.id} className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex items-center justify-between hover:border-white/10 transition-all gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate text-xs">{r.email}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">Dispatched from Terminal Route IP: {r.ipAddress || '127.0.0.1'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[9px] font-mono text-slate-500 block">{new Date(r.timestamp).toLocaleString()}</span>
                    <span className="inline-flex items-center text-[9px] font-bold text-emerald-400 mt-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mr-0.5" /> Dispatched Successfully
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
