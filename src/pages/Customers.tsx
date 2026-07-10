import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Customer, CustomerLedgerEntry } from '../types';
import { 
  Plus, Search, Edit2, Trash2, X, Users, Mail, Phone, 
  MapPin, Clipboard, Shield, Loader2, AlertCircle, 
  Calendar, Eye, ChevronRight, FileText, ShoppingBag, DollarSign,
  Award, TrendingUp, MessageSquare, Clock, UserCheck
} from 'lucide-react';

export const Customers: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Retail' | 'Wholesale' | 'VIP' | 'Corporate'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal / Drawer state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // CRM notes state
  const [crmNote, setCrmNote] = useState('');
  const [crmLogs, setCrmLogs] = useState<{ id: string; note: string; date: string; author: string }[]>([]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [customerType, setCustomerType] = useState<'Retail' | 'Wholesale' | 'VIP' | 'Corporate'>('Retail');
  const [creditLimit, setCreditLimit] = useState(1000);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // RBAC checks
  const canManage = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync Customers in real-time
  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Customer);
      });
      setCustomers(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching customers:', error);
      setNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'Unable to stream real-time customers list'
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [setNotification]);

  // Sync Customer Ledger entries
  useEffect(() => {
    const q = query(collection(db, 'customer_ledger'), orderBy('transactionDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: CustomerLedgerEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push({ id: docSnap.id, ...docSnap.data() } as CustomerLedgerEntry);
      });
      setLedgerEntries(entries);
    }, (error) => {
      console.error('Error fetching customer ledger:', error);
    });

    return unsubscribe;
  }, []);

  // Sync selected customer's fake CRM notes from local storage or static mock just for CRM placeholder
  useEffect(() => {
    if (selectedCustomer) {
      const savedNotes = localStorage.getItem(`crm_notes_${selectedCustomer.id}`);
      if (savedNotes) {
        setCrmLogs(JSON.parse(savedNotes));
      } else {
        setCrmLogs([
          {
            id: 'init-crm',
            note: `Customer profile registered as ${selectedCustomer.customerType} account. Opening balance: $${selectedCustomer.openingBalance}. Credit limit: $${selectedCustomer.creditLimit}.`,
            date: selectedCustomer.createdAt,
            author: 'System'
          }
        ]);
      }
    }
  }, [selectedCustomer]);

  const handleAddCrmNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !crmNote.trim()) return;

    const newLog = {
      id: Date.now().toString(),
      note: crmNote,
      date: new Date().toISOString(),
      author: profile?.fullName || 'Staff Member'
    };

    const updatedLogs = [newLog, ...crmLogs];
    setCrmLogs(updatedLogs);
    localStorage.setItem(`crm_notes_${selectedCustomer.id}`, JSON.stringify(updatedLogs));
    setCrmNote('');
    setNotification({
      type: 'success',
      title: 'CRM Log Added',
      message: 'New client follow-up interaction recorded successfully.'
    });
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setCountry('');
    setCustomerType('Retail');
    setCreditLimit(1000);
    setOpeningBalance(0);
    setNotes('');
    setStatus('Active');
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFullName(cust.fullName);
    setCompanyName(cust.companyName);
    setPhone(cust.phone);
    setEmail(cust.email);
    setAddress(cust.address);
    setCity(cust.city);
    setCountry(cust.country);
    setCustomerType(cust.customerType);
    setCreditLimit(cust.creditLimit);
    setOpeningBalance(cust.openingBalance);
    setNotes(cust.notes);
    setStatus(cust.status);
    setFormModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Full Name is required.'
      });
      return;
    }

    setFormSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const creatorUid = user?.uid || 'unknown';

      if (editingCustomer) {
        // Edit Customer
        const balanceDiff = 0; // In case we want to reconcile, keep it simple
        const customerRef = doc(db, 'customers', editingCustomer.id);
        const updatedData: Partial<Customer> = {
          fullName,
          companyName,
          phone,
          email,
          address,
          city,
          country,
          customerType,
          creditLimit: Number(creditLimit),
          notes,
          status,
          updatedAt: timestamp
        };

        await updateDoc(customerRef, updatedData);

        setNotification({
          type: 'success',
          title: 'Customer Updated',
          message: `${fullName} has been updated successfully.`
        });
      } else {
        // Create Customer
        const customId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
        const customerIdDoc = doc(collection(db, 'customers'));
        
        const newCustomer: Customer = {
          id: customerIdDoc.id,
          customerId: customId,
          fullName,
          companyName,
          phone,
          email,
          address,
          city,
          country,
          customerType,
          creditLimit: Number(creditLimit),
          openingBalance: Number(openingBalance),
          currentBalance: Number(openingBalance), // Start balance equals opening balance
          loyaltyPoints: 0,
          notes,
          status,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid
        };

        await setDoc(customerIdDoc, newCustomer);

        // If opening balance > 0, write to customer ledger
        if (Number(openingBalance) !== 0) {
          const ledgerRef = doc(collection(db, 'customer_ledger'));
          const ledgerEntry: CustomerLedgerEntry = {
            id: ledgerRef.id,
            customerId: customerIdDoc.id,
            transactionType: 'Opening Balance',
            referenceId: customerIdDoc.id,
            referenceNumber: customId,
            debit: Number(openingBalance) > 0 ? Number(openingBalance) : 0,
            credit: Number(openingBalance) < 0 ? Math.abs(Number(openingBalance)) : 0,
            balanceAfter: Number(openingBalance),
            description: 'Customer Account Opened with Balance',
            transactionDate: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: creatorUid
          };
          await setDoc(ledgerRef, ledgerEntry);
        }

        setNotification({
          type: 'success',
          title: 'Customer Created',
          message: `${fullName} was added as a new customer.`
        });
      }

      setFormModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      setNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Something went wrong while saving customer profile.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
      setNotification({
        type: 'success',
        title: 'Customer Deleted',
        message: `${name} has been deleted successfully.`
      });
      setDeleteConfirmId(null);
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        setDetailModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Only Administrators can delete custom customer accounts.'
      });
    }
  };

  // Filter logic
  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = 
      cust.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.phone.includes(searchTerm) ||
      cust.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || cust.customerType === typeFilter;
    const matchesStatus = statusFilter === 'All' || cust.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Ledger calculation for detailed modal
  const customerLedger = selectedCustomer 
    ? ledgerEntries.filter(entry => entry.customerId === selectedCustomer.id)
    : [];

  const totalDebit = customerLedger.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = customerLedger.reduce((sum, item) => sum + (item.credit || 0), 0);
  const lifetimeValue = customerLedger
    .filter(e => e.transactionType === 'Sale')
    .reduce((sum, item) => sum + (item.debit || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Total Customers</span>
            <span className="text-2xl font-bold text-white mt-1 block">{customers.length}</span>
          </div>
          <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">VIP / Corporate Customers</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">
              {customers.filter(c => c.customerType === 'VIP' || c.customerType === 'Corporate').length}
            </span>
          </div>
          <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Total Receivables</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              ${customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Active Accounts</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {customers.filter(c => c.status === 'Active').length}
            </span>
          </div>
          <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search customers by name, ID, phone, email or company..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="bg-slate-950 border border-slate-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="All">All Customer Types</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="VIP">VIP</option>
            <option value="Corporate">Corporate</option>
          </select>

          <select
            className="bg-slate-950 border border-slate-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Customer Listing */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <span>Streaming Enterprise Customer database...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Users className="h-12 w-12 text-slate-800 mb-3" />
            <span className="font-bold">No customers found</span>
            <span className="text-sm text-zinc-500 mt-1">Try refining your filters or adding a new customer record.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 bg-slate-950 border-b border-slate-800 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Credit Limit</th>
                  <th className="px-6 py-4 text-right">Outstanding Bal</th>
                  <th className="px-6 py-4 text-right">Loyalty Points</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-950/40 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base">{cust.fullName}</div>
                      <div className="text-zinc-500 text-xs font-mono mt-0.5">{cust.customerId} {cust.companyName && `| ${cust.companyName}`}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <Phone className="h-3 w-3 text-zinc-500" /> {cust.phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-1">
                        <Mail className="h-3 w-3 text-zinc-500" /> {cust.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase border tracking-wide ${
                        cust.customerType === 'Retail' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/10' :
                        cust.customerType === 'Wholesale' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' :
                        cust.customerType === 'VIP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/10'
                      }`}>
                        {cust.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-400">
                      ${cust.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${cust.currentBalance > 0 ? 'text-rose-400' : cust.currentBalance < 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        ${cust.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-amber-500 font-bold font-mono">
                      ⭐ {cust.loyaltyPoints || 0} pts
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                        cust.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10' : 'bg-rose-500/15 text-rose-400 border-rose-500/10'
                      }`}>
                        {cust.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title="View Ledger / Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(cust)}
                              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                              title="Edit Details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {deleteConfirmId === cust.id ? (
                              <div className="flex items-center gap-1 bg-rose-500/15 border border-rose-500/20 rounded p-1">
                                <button
                                  onClick={() => handleDeleteCustomer(cust.id, cust.fullName)}
                                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-1.5"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] text-zinc-400 hover:text-white px-1 border-l border-rose-500/20"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(cust.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                                title="Delete Account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {editingCustomer ? `Edit Customer Profile - ${editingCustomer.customerId}` : 'Create New Customer'}
              </h2>
              <button 
                onClick={() => setFormModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Enter customer's full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Company Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Company or Corporate Name (Optional)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Email Address</label>
                  <input
                    type="email"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="customer@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Customer Type</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="VIP">VIP</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Credit Limit ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                  />
                </div>

                {!editingCustomer && (
                  <div>
                    <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Opening Balance ($)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="Positive: Customer owes, Negative: Advance paid"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Account Status</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Street Address</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="123 Corporate Blvd"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">City</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Country</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-bold text-xs uppercase">Internal Notes</label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 min-h-[60px]"
                  placeholder="Enter custom specifications, payment schedules or specific instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-zinc-300 font-bold text-sm px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/15"
                >
                  {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detailed View / Ledger Modal */}
      {detailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-none">{selectedCustomer.fullName}</h2>
                  <span className="text-xs text-zinc-500 font-mono tracking-wider mt-1.5 block">
                    {selectedCustomer.customerId} | {selectedCustomer.companyName || 'No Registered Company'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Layout body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
              
              {/* Profile Details Column (1/3) */}
              <div className="space-y-4">
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2">Profile Overview</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Customer Type</span>
                      <span className="text-white mt-0.5 font-bold">{selectedCustomer.customerType}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Contact Number</span>
                      <span className="text-white mt-0.5 block flex items-center gap-1.5 font-mono">
                        <Phone className="h-3.5 w-3.5 text-zinc-500" /> {selectedCustomer.phone || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Email Address</span>
                      <span className="text-white mt-0.5 block flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-zinc-500" /> {selectedCustomer.email || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Address</span>
                      <span className="text-white mt-0.5 block flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                        {selectedCustomer.address 
                          ? `${selectedCustomer.address}, ${selectedCustomer.city}, ${selectedCustomer.country}` 
                          : 'No Address saved'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Credit Limit</span>
                      <span className="text-zinc-300 mt-0.5 block font-bold font-mono">
                        ${selectedCustomer.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Loyalty Balance</span>
                      <span className="text-amber-400 mt-0.5 block font-bold font-mono">
                        ⭐ {selectedCustomer.loyaltyPoints || 0} Points Available
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 text-xs block font-bold">Registration Date</span>
                      <span className="text-white mt-0.5 block font-mono text-xs">
                        {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CRM Notes Component */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 space-y-4">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-blue-400" /> CRM Communications
                  </h3>
                  
                  <form onSubmit={handleAddCrmNote} className="space-y-2">
                    <textarea
                      className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-blue-500 min-h-[60px]"
                      placeholder="Add follow-up notes, phone logs, or loyalty arrangements..."
                      value={crmNote}
                      onChange={(e) => setCrmNote(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={!crmNote.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition"
                    >
                      Record Conversation
                    </button>
                  </form>

                  {/* Note logs timeline */}
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                    {crmLogs.map((log) => (
                      <div key={log.id} className="bg-slate-900 border border-slate-800/50 p-2.5 rounded-lg text-xs">
                        <div className="flex items-center justify-between text-zinc-500 font-bold mb-1">
                          <span>{log.author}</span>
                          <span className="font-mono text-[10px]">{new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">{log.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Customer Ledger & Purchases Column (2/3) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Financial KPI stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Lifetime Purchases</span>
                    <span className="text-lg font-bold text-white mt-1 block">
                      ${lifetimeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Total Payments Received</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">
                      ${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Net Account Balance</span>
                    <span className={`text-lg font-bold mt-1 block ${selectedCustomer.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ${selectedCustomer.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Ledger History Listing */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-emerald-400" /> Account Transaction History (Ledger)
                    </h3>
                    <span className="text-xs text-zinc-500">All Purchases, Returns, Payments</span>
                  </div>

                  {customerLedger.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500">
                      <FileText className="h-10 w-10 mx-auto text-slate-800 mb-2" />
                      <span className="text-sm">No transaction records registered in general ledger</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-slate-950 border-b border-slate-800 text-zinc-400 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reference No</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Debit (+)</th>
                            <th className="px-4 py-3 text-right">Credit (-)</th>
                            <th className="px-4 py-3 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {customerLedger.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-950/30">
                              <td className="px-4 py-3 font-mono text-[11px]">
                                {new Date(entry.transactionDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-zinc-400">
                                {entry.referenceNumber}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wide ${
                                  entry.transactionType === 'Sale' ? 'bg-rose-500/10 text-rose-400 border-rose-500/10' :
                                  entry.transactionType === 'Payment' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                                  entry.transactionType === 'Return' ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' :
                                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/10'
                                }`}>
                                  {entry.transactionType}
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-[150px] truncate" title={entry.description}>
                                {entry.description}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-rose-400">
                                {entry.debit > 0 ? `$${entry.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                {entry.credit > 0 ? `$${entry.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold font-mono text-white">
                                ${entry.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
