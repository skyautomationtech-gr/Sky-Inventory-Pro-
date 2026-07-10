import React, { useState } from 'react';
import { 
  Search, ShieldAlert, Mail, Phone, MapPin, DollarSign, Calendar, Clock, Award,
  ShoppingBag, HelpCircle, FileText, Plus, MessageSquare, Star, ArrowDownLeft, ArrowUpRight,
  User, CheckCircle, Tag, Paperclip, Send, Settings, Eye, Check, Users
} from 'lucide-react';
import { 
  CRMCustomer, SalesOrder, SupportTicket, CommunicationLog, 
  CustomerFeedback, LoyaltyTransaction, CommChannel, MembershipLevel 
} from '../../types';

interface Customer360Props {
  customers: CRMCustomer[];
  salesOrders: SalesOrder[];
  tickets: SupportTicket[];
  communicationLogs: CommunicationLog[];
  feedback: CustomerFeedback[];
  loyaltyTransactions: LoyaltyTransaction[];
  onUpdateCustomer: (id: string, updated: Partial<CRMCustomer>) => Promise<void>;
  onAddCommunicationLog: (log: Omit<CommunicationLog, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onAddFeedback: (feed: Omit<CustomerFeedback, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onAddLoyaltyTransaction: (trans: Omit<LoyaltyTransaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
}

export const Customer360: React.FC<Customer360Props> = ({
  customers,
  salesOrders,
  tickets,
  communicationLogs,
  feedback,
  loyaltyTransactions,
  onUpdateCustomer,
  onAddCommunicationLog,
  onAddFeedback,
  onAddLoyaltyTransaction,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'purchases' | 'tickets' | 'timeline' | 'loyalty' | 'feedback'>('profile');
  
  // Create / Log state
  const [commChannel, setCommChannel] = useState<CommChannel>('Email');
  const [commDirection, setCommDirection] = useState<'Incoming' | 'Outgoing' | 'Internal'>('Outgoing');
  const [commSummary, setCommSummary] = useState('');
  const [commDetails, setCommDetails] = useState('');
  const [commAttachment, setCommAttachment] = useState('');

  // Feedback form
  const [feedRating, setFeedRating] = useState(5);
  const [feedReview, setFeedReview] = useState('');
  const [feedType, setFeedType] = useState<'Complaint' | 'Suggestion' | 'Compliment' | 'Other'>('Compliment');
  const [feedScore, setFeedScore] = useState(10); // 1-10

  // Points adjustments
  const [pointAmount, setPointAmount] = useState(0);
  const [pointType, setPointType] = useState<'Earn' | 'Redeem'>('Earn');
  const [pointNotes, setPointNotes] = useState('');

  // Editing preferences
  const [editPrefs, setEditPrefs] = useState(false);
  const [prefPayment, setPrefPayment] = useState('Cash');
  const [prefProducts, setPrefProducts] = useState('');
  const [custInternalNotes, setCustInternalNotes] = useState('');

  // Selected customer computed
  const currentCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Filters
  const filteredCustomers = customers.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectCust = (id: string) => {
    setSelectedCustomerId(id);
    const selected = customers.find(c => c.id === id);
    if (selected) {
      setPrefPayment(selected.preferredPaymentMethod || 'Cash');
      setPrefProducts((selected.preferredProducts || []).join(', '));
      setCustInternalNotes(selected.internalNotes || '');
    }
    setActiveTab('profile');
    setEditPrefs(false);
  };

  // Initialize selected customer
  React.useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      selectCust(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  if (customers.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-10 text-center">
        <Users className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-3">No Customers Available</h3>
        <p className="text-xs text-zinc-500 mt-1">Convert a Lead to customer or register them to see Customer 360 profiles.</p>
      </div>
    );
  }

  // Aggregate Customer Data
  const custSales = salesOrders.filter(so => so.customerId === currentCustomer?.id);
  const totalSpend = custSales.filter(so => so.salesStatus === 'Completed').reduce((acc, curr) => acc + curr.grandTotal, 0);
  const duePayments = custSales.filter(so => so.paymentStatus !== 'Paid' && so.salesStatus !== 'Cancelled').reduce((acc, curr) => acc + curr.dueAmount, 0);
  const returnsCount = salesOrders.filter(so => so.customerId === currentCustomer?.id && so.salesStatus === 'Returned').length;
  
  const custTickets = tickets.filter(t => t.customerId === currentCustomer?.id);
  const openTickets = custTickets.filter(t => ['Open', 'Assigned', 'In Progress', 'Reopened'].includes(t.status)).length;

  const custLogs = communicationLogs.filter(log => log.customerId === currentCustomer?.id);
  const custFeedback = feedback.filter(f => f.customerId === currentCustomer?.id);
  const custLoyaltyTrans = loyaltyTransactions.filter(t => t.customerId === currentCustomer?.id);

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    try {
      const prodList = prefProducts.split(',').map(p => p.trim()).filter(Boolean);
      await onUpdateCustomer(currentCustomer.id, {
        preferredPaymentMethod: prefPayment,
        preferredProducts: prodList,
        internalNotes: custInternalNotes,
      });
      setEditPrefs(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer || !commSummary.trim() || !commDetails.trim()) return;
    try {
      await onAddCommunicationLog({
        customerId: currentCustomer.id,
        customerName: currentCustomer.fullName,
        channel: commChannel,
        direction: commDirection,
        agentId: 'CURRENT_USER', // handled in save
        agentName: 'System Agent',
        summary: commSummary,
        details: commDetails,
        attachments: commAttachment ? [{ name: 'Log Attachment', url: commAttachment }] : []
      });
      setCommSummary('');
      setCommDetails('');
      setCommAttachment('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer || !feedReview.trim()) return;
    try {
      await onAddFeedback({
        customerId: currentCustomer.id,
        customerName: currentCustomer.fullName,
        rating: feedRating,
        review: feedReview,
        type: feedType,
        satisfactionScore: feedScore,
        responseStatus: 'Pending',
      });
      setFeedReview('');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePointsAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer || pointAmount <= 0) return;
    try {
      const pEarned = pointType === 'Earn' ? pointAmount : 0;
      const pRedeemed = pointType === 'Redeem' ? pointAmount : 0;
      await onAddLoyaltyTransaction({
        customerId: currentCustomer.id,
        customerName: currentCustomer.fullName,
        pointsEarned: pEarned,
        pointsRedeemed: pRedeemed,
        type: pointType,
        notes: pointNotes || 'Manual Loyalty Balance Adjustment',
      });
      setPointAmount(0);
      setPointNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const getMembershipLevelColor = (level: MembershipLevel) => {
    switch (level) {
      case 'Platinum': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'Gold': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Silver': return 'bg-zinc-400/15 text-zinc-600 dark:text-zinc-400 border-zinc-400/25';
      default: return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Roster Panel */}
      <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-220px)]">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search Customers..." 
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filteredCustomers.map(cust => (
            <button
              key={cust.id}
              onClick={() => selectCust(cust.id)}
              className={`w-full text-left p-3 rounded-lg text-xs transition-all flex items-center justify-between border ${
                cust.id === currentCustomer?.id
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-100'
                  : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{cust.fullName}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{cust.companyName || 'Retail Customer'}</p>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getMembershipLevelColor(cust.membershipLevel || 'Bronze')}`}>
                {cust.membershipLevel || 'Bronze'}
              </span>
            </button>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="text-center py-6 text-zinc-400 text-xs">No customer matches search.</div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="lg:col-span-9 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-6">
        {/* Banner with 360 overview metrics */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{currentCustomer?.fullName}</h2>
              <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded border ${getMembershipLevelColor(currentCustomer?.membershipLevel || 'Bronze')}`}>
                {currentCustomer?.membershipLevel || 'Bronze'}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 font-mono">({currentCustomer?.customerId})</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">{currentCustomer?.companyName || 'Individual retail profile'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
            <div className="text-center border-r border-zinc-200 dark:border-zinc-800 pr-4">
              <span className="text-[9px] text-zinc-400 uppercase font-mono block">Total Lifetime spend</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-center border-r border-zinc-200 dark:border-zinc-800 px-4">
              <span className="text-[9px] text-zinc-400 uppercase font-mono block">Loyalty Balance</span>
              <span className="text-sm font-extrabold text-amber-500">{currentCustomer?.loyaltyPoints || 0} pts</span>
            </div>
            <div className="text-center border-r border-zinc-200 dark:border-zinc-800 px-4">
              <span className="text-[9px] text-zinc-400 uppercase font-mono block">Open Tickets</span>
              <span className="text-sm font-extrabold text-rose-500">{openTickets}</span>
            </div>
            <div className="text-center pl-4">
              <span className="text-[9px] text-zinc-400 uppercase font-mono block">Outstanding Due</span>
              <span className={`text-sm font-extrabold ${duePayments > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
                ${duePayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-4 overflow-x-auto pb-px scrollbar-thin">
            {[
              { id: 'profile', label: '360 Profile Info' },
              { id: 'purchases', label: `Purchase History (${custSales.length})` },
              { id: 'tickets', label: `Service Tickets (${custTickets.length})` },
              { id: 'timeline', label: `Communication Timeline (${custLogs.length})` },
              { id: 'loyalty', label: 'Loyalty Program' },
              { id: 'feedback', label: `Customer Feedback (${custFeedback.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-xs font-bold pb-2 transition-all shrink-0 border-b-2 px-1 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="min-h-[300px]">
          {activeTab === 'profile' && currentCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Contact & Core Details</h3>
                <div className="space-y-2.5 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-150 dark:border-zinc-900">
                    <span className="text-zinc-400">Email Address</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentCustomer.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-150 dark:border-zinc-900">
                    <span className="text-zinc-400">Phone Number</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentCustomer.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-150 dark:border-zinc-900">
                    <span className="text-zinc-400">Client Type</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentCustomer.customerType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-150 dark:border-zinc-900">
                    <span className="text-zinc-400">Credit Limit</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">${currentCustomer.creditLimit?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Address</span>
                    <span className="font-semibold text-zinc-850 dark:text-zinc-250 truncate max-w-[200px]" title={currentCustomer.address}>
                      {currentCustomer.address}, {currentCustomer.city}, {currentCustomer.country}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Profile Attachments</span>
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-center text-xs text-zinc-400">
                    <Paperclip className="h-4 w-4 mx-auto text-zinc-300 mb-1" />
                    <span>No customer profile documents attached yet.</span>
                  </div>
                </div>
              </div>

              {/* Preferences & Internal Notes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Account Preferences</h3>
                  <button 
                    onClick={() => setEditPrefs(!editPrefs)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {editPrefs ? 'Cancel' : 'Edit Preferences'}
                  </button>
                </div>

                {editPrefs ? (
                  <form onSubmit={handleUpdatePreferences} className="space-y-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Preferred Payment Method</label>
                      <select 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 text-xs text-zinc-800 dark:text-white"
                        value={prefPayment}
                        onChange={e => setPrefPayment(e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Preferred Products (SKUs, comma separated)</label>
                      <input 
                        type="text"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 text-xs text-zinc-800 dark:text-white"
                        placeholder="e.g. SKY-MAC, SKY-WIN"
                        value={prefProducts}
                        onChange={e => setPrefProducts(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Internal Staff Notes</label>
                      <textarea 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded px-2.5 py-1.5 text-xs text-zinc-800 dark:text-white h-20"
                        placeholder="Internal confidential notes (not visible to customer)..."
                        value={custInternalNotes}
                        onChange={e => setCustInternalNotes(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded py-2 text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Save Preferences & Notes
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono block">Preferred Payment Mode</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1 block">{currentCustomer.preferredPaymentMethod || 'Not Configured'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono block">Preferred SKUs/Products</span>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {currentCustomer.preferredProducts && currentCustomer.preferredProducts.length > 0 ? (
                          currentCustomer.preferredProducts.map((p, i) => (
                            <span key={i} className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 font-medium italic">None declared</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono block text-rose-400">Internal Confidential Notes</span>
                      <p className="text-zinc-500 mt-1 italic text-[11px] leading-relaxed bg-rose-500/5 dark:bg-rose-500/[0.02] p-2.5 rounded border border-rose-500/10">
                        {currentCustomer.internalNotes || 'No restricted notes recorded for this customer profile.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Invoices & Returns History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                      <th className="pb-2 font-medium">Invoice No</th>
                      <th className="pb-2 font-medium">Salesperson</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Payment</th>
                      <th className="pb-2 font-medium">Grand Total</th>
                      <th className="pb-2 font-medium">Outstanding</th>
                      <th className="pb-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-zinc-400">No invoices found for this customer.</td>
                      </tr>
                    ) : (
                      custSales.map(order => (
                        <tr key={order.id} className="border-b border-zinc-100 dark:border-zinc-900 text-zinc-800 dark:text-zinc-300">
                          <td className="py-2.5 font-bold">{order.invoiceNumber}</td>
                          <td className="py-2.5">{order.salespersonName}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.salesStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                              order.salesStatus === 'Draft' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-rose-500/10 text-rose-500'
                            }`}>{order.salesStatus}</span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              order.paymentStatus === 'Partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>{order.paymentStatus}</span>
                          </td>
                          <td className="py-2.5 font-bold">${order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 font-semibold text-rose-500">${order.dueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 text-right font-mono">{order.salesDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Service Tickets History</h3>
              <div className="space-y-3">
                {custTickets.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400">No support tickets found for this customer.</div>
                ) : (
                  custTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-zinc-400 text-xs">{ticket.ticketNumber}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            ticket.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>{ticket.priority}</span>
                          <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">{ticket.category}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{ticket.description}</p>
                        <p className="text-[11px] text-zinc-400">Assigned: {ticket.assignedName} | Department: {ticket.department}</p>
                      </div>
                      <div className="md:text-right flex md:flex-col justify-between items-end shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ticket.status === 'Closed' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-blue-500/10 text-blue-500'
                        }`}>{ticket.status}</span>
                        <span className="text-[10px] font-mono text-zinc-400 mt-2">Opened: {ticket.createdDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Log New Comm Form */}
              <form onSubmit={handleLogCommunication} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-12">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono mb-2">Record Interactive Interaction Log</h3>
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Channel</label>
                  <select 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                    value={commChannel}
                    onChange={e => setCommChannel(e.target.value as CommChannel)}
                  >
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Internal Note">Internal Note</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Direction</label>
                  <select 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                    value={commDirection}
                    onChange={e => setCommDirection(e.target.value as any)}
                  >
                    <option value="Outgoing">Outgoing</option>
                    <option value="Incoming">Incoming</option>
                    <option value="Internal">Internal Note</option>
                  </select>
                </div>
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Interaction Summary</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Discussed bulk discount offer..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                    value={commSummary}
                    onChange={e => setCommSummary(e.target.value)}
                  />
                </div>
                <div className="md:col-span-9">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Detailed Conversation Log</label>
                  <textarea 
                    required
                    placeholder="Provide conversation details..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white h-12"
                    value={commDetails}
                    onChange={e => setCommDetails(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 flex items-end">
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white rounded py-2 text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3 w-3" /> Save Log
                  </button>
                </div>
              </form>

              {/* Timeline list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Communication Timeline</h3>
                <div className="relative pl-6 border-l border-zinc-200 dark:border-zinc-800 ml-3 space-y-5">
                  {custLogs.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 pl-0 border-l-0">No communications logged yet.</div>
                  ) : (
                    custLogs.map(log => (
                      <div key={log.id} className="relative">
                        {/* Timeline bubble */}
                        <div className="absolute -left-[31px] top-0.5 h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500">
                          {log.channel === 'Phone Call' ? <Phone className="h-3 w-3" /> :
                           log.channel === 'Email' ? <Mail className="h-3 w-3" /> :
                           <MessageSquare className="h-3 w-3" />}
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3 text-xs">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{log.summary}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Today'}</span>
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{log.details}</p>
                          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                            <span>Logged by: {log.agentName}</span>
                            <span className="bg-zinc-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {log.channel} ({log.direction})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'loyalty' && (
            <div className="space-y-6">
              {/* Loyalty Adjustment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handlePointsAdjust} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Adjust Loyalty Balance</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Adjustment Type</label>
                      <select 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                        value={pointType}
                        onChange={e => setPointType(e.target.value as any)}
                      >
                        <option value="Earn">Earn (Add Points)</option>
                        <option value="Redeem">Redeem (Deduct Points)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Point Amount</label>
                      <input 
                        type="number"
                        required
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                        value={pointAmount}
                        onChange={e => setPointAmount(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Reason / Remarks</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Campaign reward points..."
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                      value={pointNotes}
                      onChange={e => setPointNotes(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 text-white rounded py-2 text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Adjust Points Balance
                  </button>
                </form>

                {/* Loyalty Tier Progress */}
                <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-150 dark:border-zinc-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono mb-2">Membership Status</h3>
                    <div className="flex items-center gap-3 mt-4">
                      <Award className="h-10 w-10 text-amber-500" />
                      <div>
                        <span className="text-xs text-zinc-400">Current Rank</span>
                        <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-none mt-1">{currentCustomer.membershipLevel || 'Bronze'} Tier</h4>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-500">
                      <span>Tier Tiering Level Progress</span>
                      <span>{currentCustomer.loyaltyPoints || 0} pts total</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, ((currentCustomer.loyaltyPoints || 0) / 1000) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-zinc-400 block italic">Bronze (0 pts) • Silver (200 pts) • Gold (500 pts) • Platinum (1000 pts)</span>
                  </div>
                </div>
              </div>

              {/* Loyalty History table */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Loyalty Statement</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                        <th className="pb-2 font-medium">Earned</th>
                        <th className="pb-2 font-medium">Redeemed</th>
                        <th className="pb-2 font-medium">Transaction Type</th>
                        <th className="pb-2 font-medium">Notes</th>
                        <th className="pb-2 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custLoyaltyTrans.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-zinc-400">No loyalty transactions recorded yet.</td>
                        </tr>
                      ) : (
                        custLoyaltyTrans.map(trans => (
                          <tr key={trans.id} className="border-b border-zinc-100 dark:border-zinc-900 text-zinc-800 dark:text-zinc-300">
                            <td className="py-2.5 text-emerald-500 font-bold">+{trans.pointsEarned}</td>
                            <td className="py-2.5 text-rose-500 font-bold">-{trans.pointsRedeemed}</td>
                            <td className="py-2.5 font-semibold">{trans.type}</td>
                            <td className="py-2.5 text-zinc-500">{trans.notes}</td>
                            <td className="py-2.5 text-right font-mono">{trans.createdAt ? new Date(trans.createdAt).toLocaleDateString() : 'Today'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Log Feedback */}
              <form onSubmit={handleLogFeedback} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Record Feedback & Complaint Registry</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Feedback Type</label>
                    <select 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                      value={feedType}
                      onChange={e => setFeedType(e.target.value as any)}
                    >
                      <option value="Complaint">Complaint</option>
                      <option value="Suggestion">Suggestion</option>
                      <option value="Compliment">Compliment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Star Rating (1-5)</label>
                    <div className="flex gap-1.5 items-center mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          type="button" 
                          key={star} 
                          onClick={() => setFeedRating(star)}
                          className="text-amber-400 hover:scale-110 transition shrink-0"
                        >
                          <Star className={`h-5 w-5 ${star <= feedRating ? 'fill-amber-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">NPS Score (1-10)</label>
                    <input 
                      type="number"
                      min={1} max={10} required
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white"
                      value={feedScore}
                      onChange={e => setFeedScore(Math.min(10, Math.max(1, Number(e.target.value))))}
                    />
                  </div>

                  <div className="space-y-1 flex items-end">
                    <button 
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded py-2 text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Record Feedback
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Review Notes / Details</label>
                  <textarea 
                    required
                    placeholder="Enter customer complaints or compliments here..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs mt-1 text-zinc-800 dark:text-white h-16"
                    value={feedReview}
                    onChange={e => setFeedReview(e.target.value)}
                  />
                </div>
              </form>

              {/* Feedback History */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Feedback Logs</h3>
                <div className="space-y-3">
                  {custFeedback.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400">No feedback entries captured.</div>
                  ) : (
                    custFeedback.map(f => (
                      <div key={f.id} className="p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                              f.type === 'Complaint' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                            }`}>{f.type}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: f.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                            <span className="text-[10px] text-zinc-400">(NPS: {f.satisfactionScore}/10)</span>
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 italic mt-1.5">"{f.review}"</p>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'Today'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
