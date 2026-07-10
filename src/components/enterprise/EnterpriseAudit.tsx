import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, SlidersHorizontal, Eye, Loader2, Calendar, 
  MapPin, ShieldAlert, Laptop, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { EnterpriseAuditLog } from '../../types';

export const EnterpriseAudit: React.FC = () => {
  const [audits, setAudits] = useState<EnterpriseAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [activeLogForDetail, setActiveLogForDetail] = useState<EnterpriseAuditLog | null>(null);

  useEffect(() => {
    // Listen to audit_logs collection (up to 200 logs for client-side search/filter)
    const unsub = onSnapshot(collection(db, 'audit_logs'), (snap) => {
      const list: EnterpriseAuditLog[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as EnterpriseAuditLog);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAudits(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLogs = audits.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole ? log.userRole === selectedRole : true;
    const matchesAction = selectedAction ? log.action === selectedAction : true;

    return matchesSearch && matchesRole && matchesAction;
  });

  // Unique actions for filters
  const uniqueActions = Array.from(new Set(audits.map(log => log.action)));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Audit Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zero-trust cryptographic operational logging. Audit trails are immutable and trace system state mutations.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, user, IP..." 
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Role Filter */}
        <div>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <option value="">-- All Roles --</option>
            <option>Super Admin</option>
            <option>Admin</option>
            <option>Manager</option>
            <option>Staff</option>
          </select>
        </div>

        {/* Action Type Filter */}
        <div>
          <select 
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <option value="">-- All Actions --</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button 
          onClick={() => { setSearchQuery(''); setSelectedRole(''); setSelectedAction(''); }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-purple-500" />
            <span>Audit Ledger ({filteredLogs.length} events matching)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Immutable Blockchain Vault</span>
        </div>

        <div className="overflow-x-auto text-[11px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
              <p>No secure audit trails match the current filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Enterprise User</th>
                  <th className="p-4">Network Info</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-600 dark:text-slate-300">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{log.action}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-semibold block text-slate-800 dark:text-slate-200">{log.userName}</span>
                        <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">{log.userRole}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono">
                          <Laptop className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.ipAddress} ({log.device})</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                          <MapPin className="h-3 w-3" />
                          <span>{log.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setActiveLogForDetail(log)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-blue-500 cursor-pointer"
                        title="View Detailed Payload comparison"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* State Difference Drawer Modal */}
      {activeLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full w-full max-w-2xl shadow-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">State Mutation Payload</h3>
                  <p className="text-[10px] text-slate-400">Action: <strong className="text-slate-700 dark:text-slate-200">{activeLogForDetail.action}</strong></p>
                </div>
                <button onClick={() => setActiveLogForDetail(null)} className="text-slate-400 hover:text-slate-950 dark:hover:text-white cursor-pointer">✕ Close</button>
              </div>

              {/* Side-by-side Payload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[70vh] overflow-y-auto pt-2 text-[10px] font-mono">
                {/* Old value block */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-mono w-max mb-2 uppercase tracking-wider">Before state (Old)</span>
                  <pre className="flex-1 overflow-x-auto text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {activeLogForDetail.oldValue ? JSON.stringify(activeLogForDetail.oldValue, null, 2) : 'No previous state (Creation event)'}
                  </pre>
                </div>

                {/* New value block */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 flex flex-col">
                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-mono w-max mb-2 uppercase tracking-wider">After state (New)</span>
                  <pre className="flex-1 overflow-x-auto text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {activeLogForDetail.newValue ? JSON.stringify(activeLogForDetail.newValue, null, 2) : 'Record Deleted'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setActiveLogForDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
