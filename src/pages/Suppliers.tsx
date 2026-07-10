import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Supplier } from '../types';
import { uploadFile, deleteFile } from '../utils/storage';
import { 
  Plus, Search, Edit2, Trash2, X, Truck, Mail, Phone, 
  MapPin, Clipboard, Shield, Loader2, AlertCircle, 
  Calendar, Eye, ChevronRight, FileText, ShoppingBag, DollarSign
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal / Drawer state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // RBAC checks
  const canManage = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync Suppliers in real-time
  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Supplier[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Supplier);
      });
      setSuppliers(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching suppliers:', error);
      setNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'Unable to stream real-time suppliers list'
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [setNotification]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please choose an image file.'
      });
      return;
    }

    try {
      setUploadProgress(0);
      const storagePath = `suppliers/${Date.now()}_${file.name}`;
      const url = await uploadFile(storagePath, file, (progress) => {
        setUploadProgress(progress);
      });
      setLogoUrl(url);
      setUploadProgress(null);
      setNotification({
        type: 'success',
        title: 'Upload Successful',
        message: 'Supplier logo successfully uploaded and optimized.'
      });
    } catch (error) {
      console.error('Logo upload failed:', error);
      setUploadProgress(null);
      setNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Could not upload supplier logo.'
      });
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUrl) {
      try {
        await deleteFile(logoUrl);
        setLogoUrl(null);
      } catch (err) {
        console.error('Logo deletion failed:', err);
      }
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setCompanyName('');
    setSupplierName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setCountry('');
    setTradeLicense('');
    setTaxNumber('');
    setNotes('');
    setStatus('Active');
    setLogoUrl(null);
    setUploadProgress(null);
    setFormModalOpen(true);
  };

  const openEditModal = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row details click
    setEditingSupplier(sup);
    setCompanyName(sup.companyName);
    setSupplierName(sup.supplierName);
    setPhone(sup.phoneNumber);
    setEmail(sup.email);
    setAddress(sup.address);
    setCity(sup.city);
    setCountry(sup.country);
    setTradeLicense(sup.tradeLicense);
    setTaxNumber(sup.taxNumber);
    setNotes(sup.notes);
    setStatus(sup.status);
    setLogoUrl(sup.logo);
    setUploadProgress(null);
    setFormModalOpen(true);
  };

  const openDetailModal = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit modifying suppliers.'
      });
      return;
    }

    if (!companyName.trim() || !supplierName.trim()) return;

    setFormSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        supplierName: supplierName.trim(),
        phoneNumber: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        tradeLicense: tradeLicense.trim(),
        taxNumber: taxNumber.trim(),
        notes: notes.trim(),
        status,
        logo: logoUrl,
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'Unknown'
      };

      if (editingSupplier) {
        // Update
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), payload);
        setNotification({
          type: 'success',
          title: 'Supplier Saved',
          message: `Supplier "${companyName}" successfully updated.`
        });
      } else {
        // Create
        await addDoc(collection(db, 'suppliers'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setNotification({
          type: 'success',
          title: 'Supplier Registered',
          message: `Supplier "${companyName}" successfully registered.`
        });
      }
      setFormModalOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      setNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'An error occurred while saving supplier profile.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, supLogoUrl: string | null) => {
    if (!canManage) {
      setNotification({
        type: 'error',
        title: 'Unauthorized Action',
        message: 'Your role does not permit deleting suppliers.'
      });
      return;
    }

    try {
      if (supLogoUrl) {
        await deleteFile(supLogoUrl);
      }
      await deleteDoc(doc(db, 'suppliers', id));
      setNotification({
        type: 'success',
        title: 'Supplier Deleted',
        message: 'The supplier profile was permanently deleted.'
      });
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'An error occurred while deleting supplier.'
      });
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((sup) => {
    const searchString = `${sup.companyName} ${sup.supplierName} ${sup.email} ${sup.city} ${sup.country}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : sup.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Supplier Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage vendor profiles, purchase history pipelines, and trade certifications.</p>
        </div>
        
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact name, email, or country..."
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

      {/* Suppliers Table/Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400 mt-2 font-mono">Loading supplier directory...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-3">
          <Truck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Suppliers Listed</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">Establish trade relationships by adding your first product supplier.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => {
            return (
              <div 
                key={sup.id}
                onClick={() => openDetailModal(sup)}
                className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-5 shadow-xs hover:shadow transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                {/* Header info */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {sup.logo ? (
                        <img 
                          src={sup.logo} 
                          alt={sup.companyName} 
                          className="h-full w-full object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Truck className="h-5 w-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          sup.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {sup.status}
                        </span>
                        
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate mt-1">{sup.companyName}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">Rep: {sup.supplierName}</p>
                    </div>
                  </div>

                  {/* Quick contact list */}
                  <div className="space-y-2 pt-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{sup.phoneNumber || 'No phone recorded'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{sup.email || 'No email recorded'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{sup.city && sup.country ? `${sup.city}, ${sup.country}` : 'Location unlisted'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[10px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>Registered {new Date(sup.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canManage ? (
                      <>
                        <button
                          onClick={(e) => openEditModal(sup, e)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(sup.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Read Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete overlay */}
                {deleteConfirmId === sup.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col justify-center items-center p-4 text-center z-10 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-2">Delete supplier profile?</h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">This will delete the manufacturer trade listing. Historic products associated with this supplier will lock.</p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleDelete(sup.id, sup.logo)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
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

      {/* Supplier Profile Detail Modal */}
      {detailModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setDetailModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-4.5 w-4.5 text-blue-500" /> Supplier Profile
              </h3>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Profile card summary */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                <div className="h-20 w-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedSupplier.logo ? (
                    <img src={selectedSupplier.logo} alt="Logo" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Truck className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                
                <div className="text-center sm:text-left space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{selectedSupplier.companyName}</h2>
                    <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedSupplier.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {selectedSupplier.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Authorized Agent: <strong>{selectedSupplier.supplierName}</strong></p>
                  <p className="text-[10px] text-slate-400 font-mono">ID Reference: {selectedSupplier.id}</p>
                </div>
              </div>

              {/* Grid with licensing and trade details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Contact Information */}
                <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-500" /> Contact Details
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-semibold">{selectedSupplier.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-semibold">{selectedSupplier.phoneNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">City/Country:</span>
                      <span className="font-semibold">{selectedSupplier.city || 'N/A'}, {selectedSupplier.country || 'N/A'}</span>
                    </div>
                    <div className="pt-1.5 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>{selectedSupplier.address || 'No physical address recorded.'}</span>
                    </div>
                  </div>
                </div>

                {/* Trade Certifications */}
                <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-500" /> Licensing & Trade
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trade License:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSupplier.tradeLicense || 'Pending verification'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tax Reg. Number:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedSupplier.taxNumber || 'Unregistered'}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Registration Date:</span>
                      <span className="text-slate-500">{new Date(selectedSupplier.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Notes */}
              {selectedSupplier.notes && (
                <div className="space-y-2 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-amber-500/5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Vendor Operational Notes
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">{selectedSupplier.notes}</p>
                </div>
              )}

              {/* Purchase History Placeholder */}
              <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-blue-500" /> Purchase History & Ledger
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-blue-500/20 text-blue-500 bg-blue-500/5 uppercase font-mono">
                    Pipeline Preview
                  </span>
                </div>
                
                {/* Visual mock dashboard layout for purchase tracking */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-lg text-center space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Total Orders</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white font-mono">0</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-lg text-center space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Delivered</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white font-mono">0</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-lg text-center space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Total Spent</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white font-mono">$0.00</p>
                  </div>
                </div>

                <div className="border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-lg text-center space-y-2 bg-white/60 dark:bg-slate-900/20">
                  <Clipboard className="h-6 w-6 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Purchase Records Available</p>
                  <p className="text-[10px] text-slate-400 max-w-md mx-auto">This section is reserved for the future **Purchase & POS Transaction Ledger modules**. Once integrated, physical incoming trade pipelines will stream here.</p>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setFormModalOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden shadow-2xl animate-scale-up max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingSupplier ? 'Modify Supplier Profile' : 'Register Supplier'}
              </h3>
              <button 
                onClick={() => setFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Logo Upload Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier / Vendor Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Preview" className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
                    ) : (
                      <Truck className="h-5 w-5 text-slate-400" />
                    )}
                    {uploadProgress !== null && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-[10px] font-bold text-white">
                        <Loader2 className="h-4 w-4 animate-spin mb-1 text-blue-400" />
                        <span>{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-all block">
                        Choose Logo
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-[10px] font-bold text-rose-500 hover:bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">PNG, JPG up to 3MB. Compressed automatically.</p>
                  </div>
                </div>
              </div>

              {/* Company & Contact Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp, Global Trade"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Authorized Agent / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier Email Address</label>
                  <input
                    type="email"
                    placeholder="agent@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 987-6543"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Address Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Corporate Office Address</label>
                <input
                  type="text"
                  placeholder="Street Address, Suite No."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* City & Country Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">City</label>
                  <input
                    type="text"
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Country</label>
                  <input
                    type="text"
                    placeholder="United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Trade License & Tax Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Trade License Number</label>
                  <input
                    type="text"
                    placeholder="TL-98234-A"
                    value={tradeLicense}
                    onChange={(e) => setTradeLicense(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Corporate Tax Reg. No.</label>
                  <input
                    type="text"
                    placeholder="TRN-5542-X"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Internal Supplier Notes</label>
                <textarea
                  placeholder="Record vendor specialties, default payment terms, or lead delivery times..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier Status</label>
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

              {/* Footer Buttons inside Drawer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadProgress !== null}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Supplier'
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
