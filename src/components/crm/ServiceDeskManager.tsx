import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Ticket, ArrowRight, Eye, MessageSquare, ShieldAlert, X,
  Clock, CheckCircle, RefreshCw, Send, Paperclip, AlertTriangle, Play
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { SupportTicket, TicketMessage, TicketPriority, TicketCategory, TicketStatus, Employee, CRMCustomer } from '../../types';

interface ServiceDeskManagerProps {
  tickets: SupportTicket[];
  employees: Employee[];
  customers: CRMCustomer[];
  onCreateTicket: (ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdDate' | 'auditHistory'>) => Promise<void>;
  onUpdateTicket: (id: string, updated: Partial<SupportTicket>) => Promise<void>;
  onAddTicketMessage: (msg: Omit<TicketMessage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
}

export const ServiceDeskManager: React.FC<ServiceDeskManagerProps> = ({
  tickets,
  employees,
  customers,
  onCreateTicket,
  onUpdateTicket,
  onAddTicketMessage,
}) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  // Real-time messages for selected ticket
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // Message Form fields
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newMsgAttachment, setNewMsgAttachment] = useState('');

  // Ticket creation fields
  const [customerId, setCustomerId] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [category, setCategory] = useState<TicketCategory>('Technical Support');
  const [department, setDepartment] = useState('Customer Support');
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');

  // Status transitions
  const [workflowStatus, setWorkflowStatus] = useState<TicketStatus>('Open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Subscribe to messages in real-time when ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'ticket_messages'),
      where('ticketId', '==', selectedTicket.id),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TicketMessage[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as TicketMessage);
      });
      setMessages(list);
    }, (err) => {
      console.error('Error loading ticket messages:', err);
    });

    return unsubscribe;
  }, [selectedTicket]);

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !description.trim()) return;
    setSubmitting(true);
    try {
      const selCust = customers.find(c => c.id === customerId);
      const customerName = selCust ? selCust.fullName : 'Retail Customer';

      const selEmp = employees.find(emp => emp.id === assignedTo);
      const assignedName = selEmp ? selEmp.fullName : 'Unassigned';

      await onCreateTicket({
        customerId,
        customerName,
        priority,
        category,
        department,
        assignedTo,
        assignedName,
        status: 'Open',
        description,
        resolutionNotes: '',
      });
      setFormOpen(false);
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newMessage.trim()) return;
    try {
      await onAddTicketMessage({
        ticketId: selectedTicket.id,
        senderId: 'CURRENT_USER', // handled in save/context
        senderName: profile?.fullName || 'Support Agent',
        senderType: 'Employee',
        message: newMessage,
        isInternalNote,
        attachments: newMsgAttachment ? [{ name: 'Ticket Attachment', url: newMsgAttachment }] : []
      });
      setNewMessage('');
      setIsInternalNote(false);
      setNewMsgAttachment('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const auditTrail = selectedTicket.auditHistory || [];
      const newAudit = [
        ...auditTrail,
        {
          timestamp,
          status: workflowStatus,
          updatedBy: profile?.fullName || 'Agent',
          remarks: remarks || `Status moved to ${workflowStatus}`
        }
      ];

      const updateData: Partial<SupportTicket> = {
        status: workflowStatus,
        auditHistory: newAudit,
        updatedAt: timestamp,
      };

      if (workflowStatus === 'Resolved' || workflowStatus === 'Closed') {
        updateData.resolutionNotes = resolutionNotes;
        updateData.closedDate = timestamp.slice(0, 10);
      }

      await onUpdateTicket(selectedTicket.id, updateData);
      
      // Update local details state
      setSelectedTicket({
        ...selectedTicket,
        ...updateData,
      });

      setRemarks('');
      setResolutionNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter apply
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'High': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Medium': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-zinc-400/15 text-zinc-500 border-zinc-400/20';
    }
  };

  const getStatusColor = (s: TicketStatus) => {
    switch (s) {
      case 'Open': return 'bg-blue-500/10 text-blue-500';
      case 'Assigned': return 'bg-indigo-500/10 text-indigo-500';
      case 'In Progress': return 'bg-cyan-500/10 text-cyan-500';
      case 'Waiting for Customer': return 'bg-purple-500/10 text-purple-500';
      case 'Resolved': return 'bg-emerald-500/10 text-emerald-500';
      case 'Closed': return 'bg-zinc-500/10 text-zinc-400';
      default: return 'bg-rose-500/10 text-rose-500'; // Reopened
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Tickets Panel */}
      <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-220px)] space-y-3">
        <div className="flex justify-between items-center flex-shrink-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Service Desk Tickets</h3>
          <button 
            onClick={() => {
              setCustomerId(customers[0]?.id || '');
              setAssignedTo(employees[0]?.id || '');
              setFormOpen(true);
            }}
            className="bg-blue-600 text-white rounded px-2.5 py-1 text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Open Ticket
          </button>
        </div>

        <div className="relative flex-shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search Tickets..." 
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <select 
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-800 dark:text-white"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select 
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-[11px] text-zinc-800 dark:text-white"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setWorkflowStatus(ticket.status);
              }}
              className={`p-3 rounded-lg text-xs transition-all border cursor-pointer ${
                ticket.id === selectedTicket?.id
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                  : 'bg-transparent border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono font-bold text-zinc-400">{ticket.ticketNumber}</span>
                <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="font-bold text-zinc-900 dark:text-white truncate">{ticket.customerName}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{ticket.description}</p>
              <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-850 text-[10px] text-zinc-400">
                <span>{ticket.category}</span>
                <span className={`px-1 rounded font-bold ${getPriorityBadge(ticket.priority)}`}>{ticket.priority}</span>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && (
            <div className="text-center py-10 text-zinc-400">No support tickets found.</div>
          )}
        </div>
      </div>

      {/* Right Conversation Workspace */}
      <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 min-h-[calc(100vh-220px)] flex flex-col justify-between">
        {selectedTicket ? (
          <div className="flex-1 flex flex-col h-[calc(100vh-270px)] justify-between">
            {/* Header info & Workflow Transitions */}
            <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400">{selectedTicket.ticketNumber}</span>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">{selectedTicket.customerName}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{selectedTicket.category} • Assigned to: {selectedTicket.assignedName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${getStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>

              {/* Workflow Status Form */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-250 dark:border-zinc-900 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-3">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Transition Status</label>
                  <select 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs mt-1 text-zinc-800 dark:text-white"
                    value={workflowStatus}
                    onChange={e => setWorkflowStatus(e.target.value as TicketStatus)}
                  >
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Waiting for Customer</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                </div>

                <div className="md:col-span-6">
                  {['Resolved', 'Closed'].includes(workflowStatus) ? (
                    <div>
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Resolution / Closure Notes</label>
                      <input 
                        type="text" required
                        placeholder="Define how it was resolved..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs mt-1 text-zinc-800 dark:text-white"
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Transition Remarks</label>
                      <input 
                        type="text"
                        placeholder="Log remarks..."
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs mt-1 text-zinc-800 dark:text-white"
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button 
                    onClick={handleUpdateStatus} disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-1 font-bold text-xs transition"
                  >
                    Apply Trigger
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Messages Timeline & Audit Logs */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Ticket Initial Description */}
              <div className="p-3 bg-blue-50/20 dark:bg-blue-500/[0.02] border border-blue-500/15 rounded-xl text-xs text-blue-900 dark:text-blue-100">
                <span className="font-bold uppercase text-[9px] tracking-wider block text-blue-500">Ticket Opening Description:</span>
                <p className="mt-1 leading-relaxed">{selectedTicket.description}</p>
                <span className="text-[9px] text-zinc-400 mt-2 block font-mono">Opened Date: {selectedTicket.createdDate}</span>
              </div>

              {/* Chat Thread */}
              {messages.map(msg => {
                const isAgent = msg.senderType === 'Employee';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <span className="font-bold">{msg.senderName}</span>
                      <span>({msg.senderType})</span>
                      {msg.isInternalNote && (
                        <span className="bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded text-[8px] font-bold font-mono">
                          PRIVATE INTERNAL NOTE
                        </span>
                      )}
                    </div>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs border ${
                      msg.isInternalNote 
                        ? 'bg-amber-500/5 border-amber-500/25 text-amber-900 dark:text-amber-200'
                        : isAgent 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'bg-zinc-50 border-zinc-150 text-zinc-800 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-200/20">
                          {msg.attachments.map((file, i) => (
                            <a 
                              key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] flex items-center gap-1 text-blue-300 font-bold hover:underline"
                            >
                              <Paperclip className="h-3 w-3 shrink-0" /> Attachment Link
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Audit trail trail */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">Ticket Life-Cycle Audit logs</span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {selectedTicket.auditHistory?.map((audit, i) => (
                    <div key={i} className="text-[10px] text-zinc-500 flex items-start gap-1 font-mono">
                      <span className="text-zinc-400 shrink-0">[{new Date(audit.timestamp).toLocaleTimeString()}]</span>
                      <span><b>{audit.updatedBy}</b> moved status to <b>{audit.status}</b>: <span className="italic">"{audit.remarks}"</span></span>
                    </div>
                  ))}
                  {!selectedTicket.auditHistory?.length && (
                    <div className="text-[10px] text-zinc-400 font-mono italic">No workflow transitions logged.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 flex-shrink-0">
              <div className="flex gap-2 items-center text-xs">
                {/* Internal Note checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-500 select-none">
                  <input 
                    type="checkbox" 
                    className="rounded border-amber-500 bg-transparent text-amber-500 focus:ring-0 h-3.5 w-3.5"
                    checked={isInternalNote}
                    onChange={e => setIsInternalNote(e.target.checked)}
                  />
                  <span className="font-bold text-[10px] uppercase">Log as Private Staff Note</span>
                </label>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={isInternalNote ? "Enter confidential internal staff notes..." : "Respond to customer or employee..."}
                  required
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded px-3 py-2 text-xs text-zinc-800 dark:text-white"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-blue-600 text-white rounded px-4 py-2 text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-10 text-zinc-400 dark:text-zinc-600">
            <Ticket className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest font-mono">Select a support ticket</span>
            <p className="text-[11px] mt-1">Select any ticket from the left panel to engage resolving support and logging comments.</p>
          </div>
        )}
      </div>

      {/* Ticket Create Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Register Support Helpdesk Ticket</h3>
              <button onClick={() => setFormOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Customer Profile</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.companyName || 'Retail'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Ticket Priority</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={priority}
                    onChange={e => setPriority(e.target.value as TicketPriority)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Ticket Category</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={category}
                    onChange={e => setCategory(e.target.value as TicketCategory)}
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing">Billing</option>
                    <option value="Product Defect">Product Defect</option>
                    <option value="Logistics">Logistics</option>
                    <option value="General Query">General Query</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Internal Support Department</label>
                  <input 
                    type="text" required
                    placeholder="e.g. Help Desk Level 2"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Assigned Support Staff</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Full Complaint Description</label>
                <textarea 
                  required
                  placeholder="Enter details of what needs to be solved..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white h-24"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center"
              >
                {submitting ? 'Submitting ticket...' : 'Open Helpdesk Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
