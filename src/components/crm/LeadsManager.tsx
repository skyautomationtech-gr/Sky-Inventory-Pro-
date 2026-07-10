import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Search, CheckCircle, ChevronRight, X, Mail, Phone, 
  Briefcase, DollarSign, Calendar, RefreshCw, UserCheck, SlidersHorizontal
} from 'lucide-react';
import { CRMLead, LeadSource, LeadStatus, Employee } from '../../types';

interface LeadsManagerProps {
  leads: CRMLead[];
  employees: Employee[];
  onCreateLead: (lead: Omit<CRMLead, 'id' | 'leadId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onUpdateLead: (id: string, updated: Partial<CRMLead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onConvertLeadToCustomer: (lead: CRMLead) => Promise<void>;
}

export const LeadsManager: React.FC<LeadsManagerProps> = ({
  leads,
  employees,
  onCreateLead,
  onUpdateLead,
  onDeleteLead,
  onConvertLeadToCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  
  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [convertConfirmLead, setConvertConfirmLead] = useState<CRMLead | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('Website');
  const [assignedTo, setAssignedTo] = useState('');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('New');
  const [expectedValue, setExpectedValue] = useState(5000);
  const [expectedClosingDate, setExpectedClosingDate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingLead(null);
    setFullName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setSource('Website');
    setAssignedTo(employees[0]?.id || '');
    setLeadStatus('New');
    setExpectedValue(5000);
    setExpectedClosingDate(new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10)); // 30 days out
    setNotes('');
    setFormOpen(true);
  };

  const openEditModal = (lead: CRMLead) => {
    setEditingLead(lead);
    setFullName(lead.fullName);
    setCompanyName(lead.companyName);
    setPhone(lead.phone);
    setEmail(lead.email);
    setSource(lead.source);
    setAssignedTo(lead.assignedTo);
    setLeadStatus(lead.status);
    setExpectedValue(lead.expectedValue);
    setExpectedClosingDate(lead.expectedClosingDate);
    setNotes(lead.notes);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    try {
      const selectedEmployee = employees.find(emp => emp.id === assignedTo);
      const assignedName = selectedEmployee ? selectedEmployee.fullName : 'Unassigned';

      const data = {
        fullName,
        companyName,
        phone,
        email,
        source,
        assignedTo,
        assignedName,
        status: leadStatus,
        expectedValue: Number(expectedValue),
        expectedClosingDate,
        notes,
      };

      if (editingLead) {
        await onUpdateLead(editingLead.id, data);
      } else {
        await onCreateLead(data);
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertConfirm = async () => {
    if (!convertConfirmLead) return;
    setSubmitting(true);
    try {
      await onConvertLeadToCustomer(convertConfirmLead);
      setConvertConfirmLead(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filters apply
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.leadId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'New': return 'bg-blue-500/10 text-blue-500';
      case 'Contacted': return 'bg-amber-500/10 text-amber-500';
      case 'Qualified': return 'bg-purple-500/10 text-purple-500';
      case 'Proposal': return 'bg-indigo-500/10 text-indigo-500';
      case 'Nurturing': return 'bg-cyan-500/10 text-cyan-500';
      case 'Converted': return 'bg-emerald-500/10 text-emerald-500';
      default: return 'bg-rose-500/10 text-rose-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-900 p-4 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl">
        <div className="flex flex-1 gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search Leads (ID, Name, Company, Email)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-white"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
            <option value="Nurturing">Nurturing</option>
            <option value="Lost">Lost</option>
            <option value="Converted">Converted</option>
          </select>

          <select
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-white hidden sm:block"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="All">All Sources</option>
            <option value="Website">Website</option>
            <option value="Cold Call">Cold Call</option>
            <option value="Referral">Referral</option>
            <option value="Exhibition">Exhibition</option>
            <option value="Social Media">Social Media</option>
            <option value="Partner">Partner</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button 
          onClick={openAddModal}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 w-full md:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Create New Lead
        </button>
      </div>

      {/* Grid List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider font-mono">
                <th className="p-3.5 font-medium">Lead Details</th>
                <th className="p-3.5 font-medium">Contact</th>
                <th className="p-3.5 font-medium">Assignment</th>
                <th className="p-3.5 font-medium">Expected revenue</th>
                <th className="p-3.5 font-medium">Closing date</th>
                <th className="p-3.5 font-medium">Status</th>
                <th className="p-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-400">No leads found matching your conditions.</td>
                </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300">
                    <td className="p-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-zinc-400">{lead.leadId}</span>
                          <span className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1 py-0.2 rounded">{lead.source}</span>
                        </div>
                        <p className="font-bold text-zinc-900 dark:text-white mt-1">{lead.fullName}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{lead.companyName}</p>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5 text-zinc-500">
                        <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email || 'No email'}</p>
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone || 'No phone'}</p>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-400">{lead.assignedName}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-blue-600 dark:text-blue-400">${lead.expectedValue?.toLocaleString()}</span>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-500">
                      {lead.expectedClosingDate || 'N/A'}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'Converted' && (
                          <button 
                            onClick={() => setConvertConfirmLead(lead)}
                            className="bg-emerald-600 text-white p-1.5 rounded hover:bg-emerald-700 transition"
                            title="Convert to Customer"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(lead)}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 transition"
                          title="Edit Lead"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteLead(lead.id)}
                          className="bg-rose-600 text-white p-1.5 rounded hover:bg-rose-700 transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingLead ? `Update Lead Info (${editingLead.leadId})` : 'Create New CRM Pipeline Lead'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Contact Full Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Company Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Phone Number</label>
                  <input 
                    type="text"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Email Address</label>
                  <input 
                    type="email"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Lead Source</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={source}
                    onChange={e => setSource(e.target.value as LeadSource)}
                  >
                    <option value="Website">Website</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Referral">Referral</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Assigned Account executive</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Pipeline Status</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={leadStatus}
                    onChange={e => setLeadStatus(e.target.value as LeadStatus)}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Nurturing">Nurturing</option>
                    <option value="Lost">Lost</option>
                    {editingLead && <option value="Converted">Converted</option>}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Expected Value ($)</label>
                  <input 
                    type="number" required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={expectedValue}
                    onChange={e => setExpectedValue(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Est. Closing Date</label>
                  <input 
                    type="date" required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white font-mono"
                    value={expectedClosingDate}
                    onChange={e => setExpectedClosingDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Negotiation Notes / Brief</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white h-16"
                  placeholder="Record summary details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center"
              >
                {submitting ? 'Processing Lead...' : editingLead ? 'Update Lead' : 'Launch New Pipeline Lead'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Convert Confirm Dialog Modal */}
      {convertConfirmLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Convert Lead to Operational Customer?</h3>
              <p className="text-xs text-zinc-400">
                This action transforms <b>{convertConfirmLead.fullName}</b> from lead status into a permanent CRM customer account profile with automated loyalty balances.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setConvertConfirmLead(null)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 rounded py-2 text-xs font-bold transition"
              >
                Back
              </button>
              <button 
                onClick={handleConvertConfirm} disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded py-2 text-xs font-bold transition flex items-center justify-center"
              >
                {submitting ? 'Converting...' : 'Yes, Convert Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
