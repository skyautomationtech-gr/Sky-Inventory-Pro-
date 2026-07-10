import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Unit } from '../types';
import { 
  Plus, Search, Edit2, Trash2, X, Ruler, 
  Loader2, AlertCircle, Calendar, Eye, Sparkles 
} from 'lucide-react';

const PREDEFINED_UNITS = [
  { name: 'Piece', description: 'Individual single item' },
  { name: 'Box', description: 'Standard wholesale packaged box' },
  { name: 'Pack', description: 'Retail bundle packet' },
  { name: 'Set', description: 'Multi-item consolidated kit set' },
  { name: 'Kg', description: 'Kilogram metric weight unit' },
  { name: 'Gram', description: 'Gram fine weight unit' },
  { name: 'Liter', description: 'Liter liquid volume unit' },
  { name: 'Meter', description: 'Meter linear dimension unit' },
];

export const Units: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // RBAC check
  const canManage = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync Units in real-time
  useEffect(() => {
    const q = query(collection(db, 'units'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Unit[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Unit);
      });
      setUnits(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching units:', error);
      setNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'Unable to stream real-time units'
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [setNotification]);

  // Handle Seeding of Predefined Units if list is empty
  const handleSeedPredefined = async () => {
    if (!canManage) return;
    setFormSubmitting(true);
    try {
      let seededCount = 0;
      for (const pre of PREDEFINED_UNITS) {
        // Only seed if it doesn't already exist in active list
        const exists = units.some(u => u.name.toLowerCase() === pre.name.toLowerCase());
        if (!exists) {
          await addDoc(collection(db, 'units'), {
            name: pre.name,
            description: pre.description,
            status: 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.uid || 'System'
          });
          seededCount++;
        }
      }
      setNotification({
        type: 'success',
        title: 'Seeding Completed',
        message: `Successfully seeded ${seededCount} standard predefined units.`
      });
    } catch (error) {
      console.error('Error seeding units:', error);
      setNotification({
        type: 'error',
        title: 'Seeding Failed',
        message: 'Could not write predefined units to database.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingUnit(null);
    setName('');
    setDescription('');
    setStatus('Active');
    setModalOpen(true);
  };

  const openEditModal = (u: Unit) => {
    setEditingUnit(u);
    setName(u.name);
    setDescription(u.description);
    setStatus(u.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit modifying units.'
      });
      return;
    }

    if (!name.trim()) return;

    setFormSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'Unknown'
      };

      if (editingUnit) {
        // Update
        await updateDoc(doc(db, 'units', editingUnit.id), payload);
        setNotification({
          type: 'success',
          title: 'Unit Saved',
          message: `Unit "${name}" successfully updated.`
        });
      } else {
        // Create
        await addDoc(collection(db, 'units'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setNotification({
          type: 'success',
          title: 'Unit Created',
          message: `Custom unit "${name}" successfully registered.`
        });
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving unit:', error);
      setNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'An error occurred while saving unit.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit deleting units.'
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'units', id));
      setNotification({
        type: 'success',
        title: 'Unit Deleted',
        message: 'The measurement unit was permanently deleted.'
      });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting unit:', error);
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'An error occurred while deleting the unit.'
      });
    }
  };

  // Filter units based on search & status
  const filteredUnits = units.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Unit Management</h1>
          <p className="text-xs text-slate-500 mt-1">Regulate custom measurements, counting scales, and box sets.</p>
        </div>
        
        <div className="flex gap-2.5">
          {canManage && (
            <>
              <button
                onClick={handleSeedPredefined}
                disabled={formSubmitting}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Seed Standard Units
              </button>
              
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Unit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          {(['All', 'Active', 'Inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30' 
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border border-slate-200/30 dark:border-slate-800/50 hover:bg-slate-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Units List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400 mt-2 font-mono">Loading units metrics...</p>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
          <Ruler className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Measurement Units</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Click "Seed Standard Units" or "Add Unit" to establish baseline product measurement metrics.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredUnits.map((u) => {
            return (
              <div 
                key={u.id} 
                className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-4 shadow-xs flex flex-col justify-between hover:shadow transition-all relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs uppercase font-mono">
                      {u.name.substring(0, 3)}
                    </div>
                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      u.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {u.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white font-mono">{u.name}</h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 min-h-[32px]">{u.description || 'No description provided.'}</p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="font-mono">Creator: {u.createdBy === 'System' ? 'Default Preset' : 'Staff/Admin'}</span>
                  
                  <div className="flex items-center gap-0.5">
                    {canManage ? (
                      <>
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Read Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation Overlay */}
                {deleteConfirmId === u.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col justify-center items-center p-3 text-center z-10 animate-fade-in">
                    <AlertCircle className="h-6 w-6 text-rose-500" />
                    <h4 className="text-[10px] font-bold text-slate-800 dark:text-white mt-1">Delete unit "{u.name}"?</h4>
                    <div className="flex gap-1.5 mt-3">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-2 py-1 rounded-md cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingUnit ? 'Modify Unit' : 'Register Custom Unit'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dozen, Roll, Gross"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description</label>
                <textarea
                  placeholder="e.g. Contains 12 nested units"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unit Status</label>
                <div className="flex gap-4">
                  {(['Active', 'Inactive'] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="status"
                        checked={status === s}
                        onChange={() => setStatus(s)}
                        className="rounded-full border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {formSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    'Save Unit'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
