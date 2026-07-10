import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Sliders, Check, X, Loader2, 
  Trash2, Layers, AlertCircle, Building2, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ApprovalWorkflow, UserRole, Company } from '../../types';

export const ApprovalWorkflows: React.FC = () => {
  const { profile, logEnterpriseAudit } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rule builder states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [module, setModule] = useState<'Purchases' | 'Sales Discounts' | 'Inventory Adjustments' | 'Payroll' | 'Expenses' | 'Journal Entries' | 'Branch Transfers'>('Purchases');
  const [description, setDescription] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [levels, setLevels] = useState<{ level: number; approverRole: UserRole }[]>([
    { level: 1, approverRole: 'Manager' }
  ]);

  useEffect(() => {
    // 1. Listen to workflow rules
    const unsubWorkflows = onSnapshot(collection(db, 'approval_workflows'), (snap) => {
      const list: ApprovalWorkflow[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as ApprovalWorkflow));
      setWorkflows(list);
    });

    // 2. Listen to companies
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snap) => {
      const list: Company[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Company));
      setCompanies(list);
      if (list.length > 0) setCompanyId(list[0].id);
    });

    // 3. Listen to pending approvals queue (e.g., from inventory transfers, purchases, discounts, etc.)
    // We listen to a generic collection 'pending_approvals' or mock entries from transfers if empty
    const unsubPending = onSnapshot(collection(db, 'pending_approvals'), (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setPendingRequests(list);
      setLoading(false);
    });

    return () => {
      unsubWorkflows();
      unsubCompanies();
      unsubPending();
    };
  }, []);

  const handleAddLevel = () => {
    if (levels.length >= 3) return; // limit to 3 levels
    setLevels([...levels, { level: levels.length + 1, approverRole: 'Admin' }]);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) return;
    const list = levels.filter((_, i) => i !== index).map((lvl, i) => ({
      ...lvl,
      level: i + 1
    }));
    setLevels(list);
  };

  const handleLevelRoleChange = (index: number, role: UserRole) => {
    const list = [...levels];
    list[index].approverRole = role;
    setLevels(list);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !companyId) return;

    const wfId = 'WF-' + Math.floor(1000 + Math.random() * 9000);
    const newRule: ApprovalWorkflow = {
      id: wfId,
      workflowId: wfId,
      companyId,
      module,
      description,
      minAmount: Number(minAmount) || 0,
      approvalLevels: levels,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: profile?.fullName || 'System'
    };

    try {
      await setDoc(doc(db, 'approval_workflows', wfId), newRule);
      await logEnterpriseAudit('Approval Rule Created', null, newRule, companyId, 'default-branch');
      setIsModalOpen(false);
      setDescription('');
      setMinAmount(0);
      setLevels([{ level: 1, approverRole: 'Manager' }]);
    } catch (err) {
      console.error('Save rule error:', err);
    }
  };

  const handleDeleteRule = async (rule: ApprovalWorkflow) => {
    if (!window.confirm('Delete this approval workflow rule?')) return;
    try {
      await deleteDoc(doc(db, 'approval_workflows', rule.id));
      await logEnterpriseAudit('Approval Rule Deleted', rule, null, rule.companyId, 'default-branch');
    } catch (err) {
      console.error('Delete rule error:', err);
    }
  };

  const handleActionPending = async (req: any, action: 'Approved' | 'Rejected') => {
    try {
      // 1. Update the request status
      const reqRef = doc(db, 'pending_approvals', req.id);
      await updateDoc(reqRef, {
        status: action,
        approvedBy: profile?.uid,
        approvedByName: profile?.fullName,
        updatedAt: new Date().toISOString()
      });

      // 2. Log immutable audit trail
      await logEnterpriseAudit(
        `Approval Request ${action}`,
        req,
        { ...req, status: action, approvedBy: profile?.fullName },
        req.companyId,
        req.branchId
      );

      // 3. If it's a branch transfer, update the branch transfer document status as well!
      if (req.sourceType === 'BranchTransfer' && req.sourceId) {
        await updateDoc(doc(db, 'branch_transfers', req.sourceId), {
          approvalStatus: action === 'Approved' ? 'Approved' : 'Rejected',
          approvedBy: profile?.fullName,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update pending approval request:', err);
    }
  };

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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Approval Workflows & Authorization</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Design multi-level, multi-role approval rules for high-value financial, expense, and inventory transactions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Workflow Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rules Configurations column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sliders className="h-4.5 w-4.5 text-blue-500" />
            <span>Workflow Authorization Rules</span>
          </h3>

          <div className="space-y-3">
            {workflows.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-xs italic">No custom approval rules defined.</p>
                <p className="text-[10px] mt-1 font-mono">Transactions bypass approval by default.</p>
              </div>
            ) : (
              workflows.map((rule) => {
                const linkedCompany = companies.find(c => c.id === rule.companyId)?.companyName || 'Group Entity';
                return (
                  <div key={rule.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-mono">
                          {rule.module}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {linkedCompany}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{rule.description}</p>
                      
                      {rule.minAmount !== undefined && rule.minAmount > 0 && (
                        <p className="text-[10px] text-slate-400">
                          Trigger Condition: Amount &gt;= <strong className="text-slate-700 dark:text-slate-300">${rule.minAmount}</strong>
                        </p>
                      )}

                      {/* Levels view */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Levels:</span>
                        <div className="flex items-center gap-1">
                          {rule.approvalLevels.map((lvl, idx) => (
                            <React.Fragment key={lvl.level}>
                              {idx > 0 && <span className="text-slate-300 dark:text-slate-700">→</span>}
                              <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                L{lvl.level}: {lvl.approverRole}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteRule(rule)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Deactivate rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Pending Approvals Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <UserCheck className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
            <span>Authorization Queue</span>
          </h3>
          <p className="text-[10px] text-slate-400">Review, sign, and authorize incoming transactional requests based on active organizational rules.</p>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingRequests.filter(r => r.status === 'Pending').length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs italic">Queue is clear.</p>
                <p className="text-[9px] font-mono mt-1">Zero pending requests need signatures.</p>
              </div>
            ) : (
              pendingRequests.filter(r => r.status === 'Pending').map((req) => (
                <div key={req.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-mono">
                      {req.sourceType || 'Transaction'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{req.title || 'Value Authorization Req'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{req.description}</p>

                  <div className="flex items-center justify-between text-[10px] border-t border-slate-100 dark:border-slate-900 pt-2 text-slate-400">
                    <span>Amt: <strong className="text-slate-700 dark:text-slate-200">${req.amount || 0}</strong></span>
                    <span>By: {req.createdBy || 'Staff'}</span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => handleActionPending(req, 'Approved')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Approve</span>
                    </button>
                    <button 
                      onClick={() => handleActionPending(req, 'Rejected')}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold py-1.5 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* New Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <span>Configure Approval rule</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4 flex-1 overflow-y-auto">
              {/* Parent Company Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Company isolation *</label>
                <select 
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              {/* Module selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Operational Module *</label>
                <select 
                  value={module}
                  onChange={(e) => setModule(e.target.value as any)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="Purchases">Purchases</option>
                  <option value="Sales Discounts">Sales Discounts</option>
                  <option value="Inventory Adjustments">Inventory Adjustments</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Expenses">Expenses</option>
                  <option value="Journal Entries">Journal Entries</option>
                  <option value="Branch Transfers">Branch Transfers</option>
                </select>
              </div>

              {/* Trigger Amount */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Trigger Threshold Amount ($) *</label>
                <input 
                  type="number" 
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
                <p className="text-[9px] text-slate-400">Rules apply only if the total transactional value matches or exceeds this amount.</p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Rule Description *</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Senior manager authorization for purchases > $10,000"
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              {/* Levels Builder */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Multi-Level Chain (Max 3)</span>
                  {levels.length < 3 && (
                    <button 
                      type="button" 
                      onClick={handleAddLevel}
                      className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      + Add Level
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {levels.map((lvl, index) => (
                    <div key={lvl.level} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-xs font-mono font-bold text-slate-400">L{lvl.level}</span>
                      
                      <div className="flex-1">
                        <select 
                          value={lvl.approverRole}
                          onChange={(e) => handleLevelRoleChange(index, e.target.value as UserRole)}
                          className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                        >
                          <option value="Manager">Manager Role</option>
                          <option value="Admin">Admin Role</option>
                          <option value="Super Admin">Super Admin Role</option>
                        </select>
                      </div>

                      {levels.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveLevel(index)}
                          className="text-[10px] text-red-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Establish rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
