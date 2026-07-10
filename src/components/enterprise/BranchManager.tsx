import React, { useState, useEffect } from 'react';
import { 
  GitBranch, Plus, Edit2, Trash2, User, Globe, MapPin, 
  Loader2, Mail, Phone, Clock, Building2, Layers, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Branch, Company, Warehouse } from '../../types';

export const BranchManager: React.FC = () => {
  const { profile, logEnterpriseAudit } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form states
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [openingDate, setOpeningDate] = useState('');
  const [workingHours, setWorkingHours] = useState('09:00 - 18:00');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Warehouse selection modal state
  const [activeBranchForWarehouse, setActiveBranchForWarehouse] = useState<Branch | null>(null);

  useEffect(() => {
    // Listen to branches
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      const list: Branch[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Branch));
      setBranches(list);
    });

    // Listen to companies
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (snap) => {
      const list: Company[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Company));
      setCompanies(list);
      if (list.length > 0) setCompanyId(list[0].id);
    });

    // Listen to warehouses to link
    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setWarehouses(list);
      setLoading(false);
    });

    return () => {
      unsubBranches();
      unsubCompanies();
      unsubWarehouses();
    };
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setBranchCode('BR-' + Math.floor(100 + Math.random() * 900));
    setBranchName('');
    setManager('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setCountry('United States');
    setOpeningDate(new Date().toISOString().split('T')[0]);
    setWorkingHours('09:00 - 18:00');
    setStatus('Active');
    if (companies.length > 0) setCompanyId(companies[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (br: Branch) => {
    setEditingBranch(br);
    setBranchCode(br.branchCode);
    setBranchName(br.branchName);
    setCompanyId(br.companyId);
    setManager(br.manager);
    setPhone(br.phone);
    setEmail(br.email);
    setAddress(br.address);
    setCity(br.city);
    setCountry(br.country);
    setOpeningDate(br.openingDate || new Date().toISOString().split('T')[0]);
    setWorkingHours(br.workingHours);
    setStatus(br.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !companyId || !branchCode) return;

    const brId = editingBranch ? editingBranch.id : 'BRCH-' + Math.floor(100000 + Math.random() * 900000);
    const branchData: Branch = {
      id: brId,
      branchId: brId,
      companyId,
      branchCode,
      branchName,
      manager,
      phone,
      email,
      address,
      city,
      country,
      openingDate,
      status,
      workingHours,
      createdAt: editingBranch ? editingBranch.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingBranch ? editingBranch.createdBy : (profile?.fullName || 'Admin')
    };

    try {
      await setDoc(doc(db, 'branches', brId), branchData);
      
      await logEnterpriseAudit(
        editingBranch ? 'Branch Details Updated' : 'New Branch Opened',
        editingBranch || null,
        branchData,
        companyId,
        brId
      );

      setIsModalOpen(false);
    } catch (err) {
      console.error('Save branch error:', err);
    }
  };

  const handleDelete = async (br: Branch) => {
    if (!window.confirm(`Are you sure you want to shut down branch ${br.branchName}?`)) return;
    try {
      await deleteDoc(doc(db, 'branches', br.id));
      await logEnterpriseAudit('Branch Deleted', br, null, br.companyId, br.id);
    } catch (err) {
      console.error('Delete branch error:', err);
    }
  };

  const toggleWarehouseAssignment = async (wh: Warehouse, brId: string | null) => {
    try {
      const whRef = doc(db, 'warehouses', wh.id);
      await updateDoc(whRef, {
        branchId: brId || null
      });

      await logEnterpriseAudit(
        brId ? 'Warehouse Assigned to Branch' : 'Warehouse Unassigned from Branch',
        { ...wh, branchId: (wh as any).branchId || null },
        { ...wh, branchId: brId },
        wh.id,
        brId || 'unassigned'
      );
    } catch (err) {
      console.error('Warehouse assignment update failed:', err);
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Branch Network</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure and manage multi-branch operations, store hours, local site managers, and mapping of warehouses to active branches.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Open New Branch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.length === 0 ? (
          <div className="col-span-3 text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No branches registered. Click "Open New Branch" to expand your corporate footprint.</p>
          </div>
        ) : (
          branches.map((br) => {
            const linkedCompany = companies.find(c => c.id === br.companyId)?.companyName || 'Corporate Holding';
            const linkedWhs = warehouses.filter(wh => (wh as any).branchId === br.id);

            return (
              <div key={br.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2.5">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                        <GitBranch className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{br.branchName}</h3>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{linkedCompany}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${br.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                      {br.status}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Mgr: <strong>{br.manager || 'Unassigned'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Hours: {br.workingHours || '09:00 - 18:00'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{br.address}, {br.city}</span>
                    </div>

                    {/* Linked Warehouses Container */}
                    <div className="mt-4 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1.5">Linked Warehouses ({linkedWhs.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedWhs.length === 0 ? (
                          <span className="text-[9px] text-slate-400 italic">No warehouses assigned.</span>
                        ) : (
                          linkedWhs.map(wh => (
                            <span key={wh.id} className="inline-flex items-center text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                              {wh.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center">
                  <button 
                    onClick={() => setActiveBranchForWarehouse(br)}
                    className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="h-3 w-3" />
                    <span>Assign Storage</span>
                  </button>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => openEditModal(br)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(br)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warehouse Assignment Modal */}
      {activeBranchForWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Assign Warehouses</h3>
                <p className="text-[10px] text-slate-500">Route warehouse operations through <strong>{activeBranchForWarehouse.branchName}</strong></p>
              </div>
              <button onClick={() => setActiveBranchForWarehouse(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {warehouses.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-4">No warehouses registered in ERP.</p>
              ) : (
                warehouses.map((wh) => {
                  const isAssignedToThis = (wh as any).branchId === activeBranchForWarehouse.id;
                  const isAssignedToOther = (wh as any).branchId && (wh as any).branchId !== activeBranchForWarehouse.id;
                  const otherBranchName = branches.find(b => b.id === (wh as any).branchId)?.branchName || 'Another Branch';

                  return (
                    <div key={wh.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{wh.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Code: {wh.code}</p>
                        {isAssignedToOther && (
                          <span className="text-[8px] font-semibold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded mt-1 inline-block">Mapped to {otherBranchName}</span>
                        )}
                      </div>

                      <button 
                        onClick={() => toggleWarehouseAssignment(wh, isAssignedToThis ? null : activeBranchForWarehouse.id)}
                        className={`text-[9px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                          isAssignedToThis 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/20' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAssignedToThis ? 'Unlink' : 'Link Storage'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setActiveBranchForWarehouse(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-emerald-500" />
                <span>{editingBranch ? 'Edit Branch Configuration' : 'Open New Branch'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Parent Company Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Parent Company Entity *</label>
                <select 
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="">-- Choose Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Branch Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Branch Name *</label>
                  <input 
                    type="text" 
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Branch Code */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Branch Code *</label>
                  <input 
                    type="text" 
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Manager */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Branch Manager</label>
                  <input 
                    type="text" 
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Working Hours */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Working Hours</label>
                  <input 
                    type="text" 
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Local Contact Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Local Contact Phone</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">City</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Country</label>
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Opening Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Opening Date</label>
                  <input 
                    type="date" 
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Physical Street Address</label>
                <textarea 
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Save Branch settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
