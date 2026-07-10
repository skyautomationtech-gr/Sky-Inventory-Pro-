import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Edit2, Trash2, Globe, FileText, 
  Loader2, Mail, Phone, Calendar, DollarSign, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Company } from '../../types';

export const CompanyManager: React.FC = () => {
  const { profile, logEnterpriseAudit } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [businessType, setBusinessType] = useState('Corporation');
  const [tradeLicense, setTradeLicense] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('English');
  const [fiscalYear, setFiscalYear] = useState('Jan - Dec');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'companies'), (snap) => {
      const list: Company[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Company);
      });
      setCompanies(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingCompany(null);
    setCompanyName('');
    setLegalName('');
    setBusinessType('Corporation');
    setTradeLicense('');
    setTaxNumber('');
    setVatNumber('');
    setRegistrationNumber('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setCountry('United States');
    setCity('');
    setAddress('');
    setCurrency('USD');
    setTimezone('UTC');
    setLanguage('English');
    setFiscalYear('Jan - Dec');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setCompanyName(comp.companyName);
    setLegalName(comp.legalName);
    setBusinessType(comp.businessType);
    setTradeLicense(comp.tradeLicense);
    setTaxNumber(comp.taxNumber);
    setVatNumber(comp.vatNumber);
    setRegistrationNumber(comp.registrationNumber);
    setEmail(comp.email);
    setPhone(comp.phone);
    setWebsite(comp.website);
    setCountry(comp.country);
    setCity(comp.city);
    setAddress(comp.address);
    setCurrency(comp.currency);
    setTimezone(comp.timezone);
    setLanguage(comp.language);
    setFiscalYear(comp.fiscalYear);
    setStatus(comp.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !legalName) return;

    const compId = editingCompany ? editingCompany.id : 'COMP-' + Math.floor(100000 + Math.random() * 900000);
    const companyData: Company = {
      id: compId,
      companyId: compId,
      companyName,
      legalName,
      businessType,
      tradeLicense,
      taxNumber,
      vatNumber,
      registrationNumber,
      email,
      phone,
      website,
      country,
      city,
      address,
      logo: editingCompany?.logo || null,
      currency,
      timezone,
      language,
      fiscalYear,
      status,
      createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingCompany ? editingCompany.createdBy : (profile?.fullName || 'Admin')
    };

    try {
      await setDoc(doc(db, 'companies', compId), companyData);
      
      // Immutable Enterprise Audit Logging
      await logEnterpriseAudit(
        editingCompany ? 'Company Details Updated' : 'New Company Registered',
        editingCompany || null,
        companyData,
        compId,
        'default-branch'
      );

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save company:', err);
    }
  };

  const handleDelete = async (comp: Company) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${comp.companyName}? This is a destructive enterprise operation.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'companies', comp.id));
      await logEnterpriseAudit('Company Deleted', comp, null, comp.id, 'default-branch');
    } catch (err) {
      console.error('Delete company error:', err);
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Enterprise Company Profiles</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage multiple legal corporate entities. Every asset, audit, and invoice links back to a designated company.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Register Company</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {companies.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No company profiles registered. Use the button to register your primary organization.</p>
          </div>
        ) : (
          companies.map((comp) => (
            <div key={comp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 flex items-center justify-center text-blue-500">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{comp.companyName}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {comp.companyId}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${comp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                    {comp.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Legal: <strong>{comp.legalName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Globe className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{comp.city}, {comp.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{comp.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{comp.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Currency: <strong>{comp.currency}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Fiscal: {comp.fiscalYear}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <button 
                  onClick={() => openEditModal(comp)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Edit Corporate Parameters"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => handleDelete(comp)}
                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Deregister Company"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span>{editingCompany ? 'Edit Organization profile' : 'Register New Organisation'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Company Name *</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Legal Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Legal Corporate Name *</label>
                  <input 
                    type="text" 
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Business Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Business Type</label>
                  <select 
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option>Corporation</option>
                    <option>LLC</option>
                    <option>Partnership</option>
                    <option>Sole Proprietorship</option>
                    <option>Holding Group</option>
                  </select>
                </div>

                {/* Registration Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Registration Number</label>
                  <input 
                    type="text" 
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Trade License */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Trade License No.</label>
                  <input 
                    type="text" 
                    value={tradeLicense}
                    onChange={(e) => setTradeLicense(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Tax Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tax Identification No. (TIN)</label>
                  <input 
                    type="text" 
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Vat Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">VAT Registration No.</label>
                  <input 
                    type="text" 
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Fiscal Year */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Fiscal Year Calendar</label>
                  <select 
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option>Jan - Dec</option>
                    <option>Apr - Mar</option>
                    <option>Jul - Jun</option>
                    <option>Oct - Sep</option>
                  </select>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Corporate Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Corporate Phone</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Accounting Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>AED</option>
                    <option>SAR</option>
                    <option>INR</option>
                    <option>CAD</option>
                  </select>
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">HQ Country</label>
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">HQ City</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* Timezone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Timezone</label>
                  <select 
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <option>UTC</option>
                    <option>EST (UTC-5)</option>
                    <option>PST (UTC-8)</option>
                    <option>GMT (UTC+0)</option>
                    <option>GST (UTC+4)</option>
                    <option>IST (UTC+5.5)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Operational Status</label>
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

              {/* Full Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Full Physical Address</label>
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
                  Save Organization details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
