import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, orderBy, where, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { 
  CRMLead, CRMOpportunity, SupportTicket, TicketMessage, CRMFollowup, 
  CustomerFeedback, LoyaltyTransaction, CommunicationLog, CRMCustomer, 
  Employee, SalesOrder, Customer, MembershipLevel 
} from '../types';

// Import sub components
import { CrmDashboard } from '../components/crm/CrmDashboard';
import { Customer360 } from '../components/crm/Customer360';
import { LeadsManager } from '../components/crm/LeadsManager';
import { OpportunitiesManager } from '../components/crm/OpportunitiesManager';
import { ServiceDeskManager } from '../components/crm/ServiceDeskManager';
import { CrmReports } from '../components/crm/CrmReports';

import { 
  LayoutDashboard, Users, Target, ShieldCheck, Ticket, BarChart3, 
  Award, HeartHandshake, Loader2, AlertTriangle, RefreshCw 
} from 'lucide-react';

export const CRM: React.FC = () => {
  const { user, profile, setNotification } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | '360' | 'leads' | 'opps' | 'tickets' | 'reports'>('dashboard');

  // Real-time collection states
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [crmCustomers, setCrmCustomers] = useState<CRMCustomer[]>([]);
  
  // ERP integrations
  const [standardCustomers, setStandardCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  const [loading, setLoading] = useState(true);

  // Sync real-time CRM and ERP data from Firestore
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubLeads = onSnapshot(query(collection(db, 'crm_leads'), orderBy('createdAt', 'desc')), (snap) => {
      const list: CRMLead[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CRMLead));
      setLeads(list);
    });

    const unsubOpps = onSnapshot(query(collection(db, 'crm_opportunities'), orderBy('createdAt', 'desc')), (snap) => {
      const list: CRMOpportunity[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CRMOpportunity));
      setOpportunities(list);
    });

    const unsubTickets = onSnapshot(query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc')), (snap) => {
      const list: SupportTicket[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SupportTicket));
      setTickets(list);
    });

    const unsubComms = onSnapshot(query(collection(db, 'communication_logs'), orderBy('createdAt', 'desc')), (snap) => {
      const list: CommunicationLog[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CommunicationLog));
      setCommunicationLogs(list);
    });

    const unsubFeedback = onSnapshot(query(collection(db, 'customer_feedback'), orderBy('createdAt', 'desc')), (snap) => {
      const list: CustomerFeedback[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CustomerFeedback));
      setFeedback(list);
    });

    const unsubLoyalty = onSnapshot(query(collection(db, 'loyalty_transactions'), orderBy('createdAt', 'desc')), (snap) => {
      const list: LoyaltyTransaction[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LoyaltyTransaction));
      setLoyaltyTransactions(list);
    });

    const unsubCrmCusts = onSnapshot(collection(db, 'crm_customers'), (snap) => {
      const list: CRMCustomer[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as CRMCustomer));
      setCrmCustomers(list);
    });

    // Core ERP syncs
    const unsubStdCusts = onSnapshot(collection(db, 'customers'), (snap) => {
      const list: Customer[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Customer));
      setStandardCustomers(list);
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      const list: Employee[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Employee));
      setEmployees(list);
    });

    const unsubSales = onSnapshot(collection(db, 'sales_orders'), (snap) => {
      const list: SalesOrder[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SalesOrder));
      setSalesOrders(list);
      setLoading(false);
    });

    return () => {
      unsubLeads();
      unsubOpps();
      unsubTickets();
      unsubComms();
      unsubFeedback();
      unsubLoyalty();
      unsubCrmCusts();
      unsubStdCusts();
      unsubEmployees();
      unsubSales();
    };
  }, [user]);

  // Aggregate standard customer with CRM customer fields
  const mergedCrmCustomers = useMemo(() => {
    return standardCustomers.map(cust => {
      const crmMatch = crmCustomers.find(cc => cc.customerId === cust.customerId);
      return {
        ...cust,
        customerId: cust.customerId,
        id: cust.id,
        fullName: cust.fullName,
        companyName: cust.companyName || 'Retail Customer',
        phone: cust.phone || '',
        email: cust.email || '',
        address: cust.address || '',
        city: cust.city || '',
        country: cust.country || '',
        customerType: cust.customerType || 'Retail',
        creditLimit: cust.creditLimit || 5000,
        loyaltyPoints: crmMatch?.loyaltyPoints || 0,
        membershipLevel: crmMatch?.membershipLevel || 'Bronze',
        preferredPaymentMethod: crmMatch?.preferredPaymentMethod || 'Cash',
        preferredProducts: crmMatch?.preferredProducts || [],
        internalNotes: crmMatch?.internalNotes || '',
      } as CRMCustomer;
    });
  }, [standardCustomers, crmCustomers]);

  // --- ACTIONS ---

  // Leads
  const handleCreateLead = async (leadData: Omit<CRMLead, 'id' | 'leadId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const leadId = `LED-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(db, 'crm_leads'), {
        ...leadData,
        leadId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'System',
      });
      setNotification({ message: `Successfully registered pipeline lead ${leadId}!`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Lead Creation failed: ${err.message}`, type: 'error' });
    }
  };

  const handleUpdateLead = async (id: string, updatedFields: Partial<CRMLead>) => {
    try {
      await updateDoc(doc(db, 'crm_leads', id), {
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      });
      setNotification({ message: 'Pipeline lead updated successfully!', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'crm_leads', id));
      setNotification({ message: 'Lead record removed from funnel.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Deletion failed: ${err.message}`, type: 'error' });
    }
  };

  // Convert Lead to Customer (Durable ERP Transaction)
  const handleConvertLeadToCustomer = async (lead: CRMLead) => {
    try {
      // 1. Check duplicate emails
      const isDuplicate = standardCustomers.some(c => c.email?.toLowerCase() === lead.email?.toLowerCase() && lead.email);
      if (isDuplicate) {
        throw new Error('Customer with this email address already exists in standard customers.');
      }

      // 2. Generate custom unique ids
      const customerId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toISOString();

      // 3. Add to Standard ERP Customers collection
      const custDocRef = doc(collection(db, 'customers'));
      await setDoc(custDocRef, {
        customerId,
        fullName: lead.fullName,
        companyName: lead.companyName || 'Retail Customer',
        phone: lead.phone || '',
        email: lead.email || '',
        address: 'Conversion Address Registered',
        city: 'Conversion',
        country: 'Conversion',
        customerType: 'Retail',
        creditLimit: 10000,
        dueAmount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'System',
      });

      // 4. Create matching CRM Profile extensions (membership, preferred payment, etc.)
      const crmDocRef = doc(collection(db, 'crm_customers'));
      await setDoc(crmDocRef, {
        customerId,
        customerName: lead.fullName,
        loyaltyPoints: 100, // 100 welcome points!
        membershipLevel: 'Bronze' as MembershipLevel,
        preferredPaymentMethod: 'Cash',
        preferredProducts: [],
        internalNotes: lead.notes || 'Converted from CRM pipeline lead.',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'System',
      });

      // 5. Create initial loyalty earn transaction
      await addDoc(collection(db, 'loyalty_transactions'), {
        customerId: custDocRef.id,
        customerName: lead.fullName,
        pointsEarned: 100,
        pointsRedeemed: 0,
        type: 'Earn',
        notes: 'Lead Conversion Welcome Bonus',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'System',
      });

      // 6. Set Lead to 'Converted'
      await updateDoc(doc(db, 'crm_leads', lead.id), {
        status: 'Converted',
        updatedAt: timestamp,
      });

      setNotification({ message: `Successfully converted ${lead.fullName} to Customer ${customerId}!`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Lead conversion transaction failed: ${err.message}`, type: 'error' });
    }
  };

  // Opportunities
  const handleCreateOpportunity = async (oppData: Omit<CRMOpportunity, 'id' | 'opportunityId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const opportunityId = `OPP-${Math.floor(100000 + Math.random() * 900000)}`;
      await addDoc(collection(db, 'crm_opportunities'), {
        ...oppData,
        opportunityId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'System',
      });
      setNotification({ message: `Launched pipeline deal ${opportunityId}!`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Deal creation failed: ${err.message}`, type: 'error' });
    }
  };

  const handleUpdateOpportunity = async (id: string, updatedFields: Partial<CRMOpportunity>) => {
    try {
      await updateDoc(doc(db, 'crm_opportunities', id), {
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      });
      setNotification({ message: 'Deal details updated.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'crm_opportunities', id));
      setNotification({ message: 'Opportunity removed from sales desk.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Delete failed: ${err.message}`, type: 'error' });
    }
  };

  // Service Desk Tickets
  const handleCreateTicket = async (ticketData: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdDate' | 'auditHistory'>) => {
    try {
      const ticketNumber = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = new Date().toISOString();
      const audit = [{
        timestamp,
        status: 'Open' as any,
        updatedBy: profile?.fullName || 'Agent',
        remarks: 'Support ticket successfully opened inside Service Desk.'
      }];

      await addDoc(collection(db, 'support_tickets'), {
        ...ticketData,
        ticketNumber,
        auditHistory: audit,
        createdDate: timestamp.slice(0, 10),
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'System',
      });
      setNotification({ message: `Service ticket ${ticketNumber} registered successfully!`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Ticket creation failed: ${err.message}`, type: 'error' });
    }
  };

  const handleUpdateTicket = async (id: string, updatedFields: Partial<SupportTicket>) => {
    try {
      await updateDoc(doc(db, 'support_tickets', id), {
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      });
      setNotification({ message: 'Ticket status transitioned successfully.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Update failed: ${err.message}`, type: 'error' });
    }
  };

  const handleAddTicketMessage = async (msgData: Omit<TicketMessage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      await addDoc(collection(db, 'ticket_messages'), {
        ...msgData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'System',
      });
    } catch (err: any) {
      setNotification({ message: `Message dispatch failed: ${err.message}`, type: 'error' });
    }
  };

  // Customer Preferences Updates & Interactions
  const handleUpdateCustomerCrmProfile = async (customerId: string, updatedCrmFields: Partial<CRMCustomer>) => {
    try {
      // 1. Look for existing extension
      const match = crmCustomers.find(cc => cc.customerId === customerId);
      const timestamp = new Date().toISOString();

      if (match) {
        await updateDoc(doc(db, 'crm_customers', match.id), {
          ...updatedCrmFields,
          updatedAt: timestamp,
        });
      } else {
        await addDoc(collection(db, 'crm_customers'), {
          customerId,
          loyaltyPoints: 0,
          membershipLevel: 'Bronze' as MembershipLevel,
          preferredPaymentMethod: 'Cash',
          preferredProducts: [],
          internalNotes: '',
          ...updatedCrmFields,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'System',
        });
      }
      setNotification({ message: 'Customer profile synced.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Sync failed: ${err.message}`, type: 'error' });
    }
  };

  const handleAddCommunicationLog = async (logData: Omit<CommunicationLog, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      await addDoc(collection(db, 'communication_logs'), {
        ...logData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'System',
      });
      setNotification({ message: 'Interactive interaction logged in history timeline.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Log failed: ${err.message}`, type: 'error' });
    }
  };

  const handleAddFeedback = async (feedData: Omit<CustomerFeedback, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      await addDoc(collection(db, 'customer_feedback'), {
        ...feedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'System',
      });
      setNotification({ message: 'Customer rating review captured successfully.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Save failed: ${err.message}`, type: 'error' });
    }
  };

  const handleAddLoyaltyTransaction = async (transData: Omit<LoyaltyTransaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const match = crmCustomers.find(cc => cc.customerId === transData.customerId);
      const pointsDiff = transData.pointsEarned - transData.pointsRedeemed;
      const currentPoints = match?.loyaltyPoints || 0;
      const newPoints = Math.max(0, currentPoints + pointsDiff);

      // Determine Membership Level threshold
      let newLevel: MembershipLevel = 'Bronze';
      if (newPoints >= 1000) newLevel = 'Platinum';
      else if (newPoints >= 500) newLevel = 'Gold';
      else if (newPoints >= 200) newLevel = 'Silver';

      const timestamp = new Date().toISOString();

      // Create transaction
      await addDoc(collection(db, 'loyalty_transactions'), {
        ...transData,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'System',
      });

      // Update CRM Customer profile points
      if (match) {
        await updateDoc(doc(db, 'crm_customers', match.id), {
          loyaltyPoints: newPoints,
          membershipLevel: newLevel,
          updatedAt: timestamp,
        });
      } else {
        await addDoc(collection(db, 'crm_customers'), {
          customerId: transData.customerId,
          loyaltyPoints: newPoints,
          membershipLevel: newLevel,
          preferredPaymentMethod: 'Cash',
          preferredProducts: [],
          internalNotes: '',
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: user?.uid || 'System',
        });
      }

      setNotification({ message: `Loyalty balance adjusted. New balance: ${newPoints} pts (${newLevel} Tier)`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: `Loyalty transaction failed: ${err.message}`, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-10 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono">Syncing CRM Workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Nav Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-2.5 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
            { id: '360', label: 'Customer 360 Profile', icon: Users },
            { id: 'leads', label: 'Leads Pipeline', icon: Target },
            { id: 'opps', label: 'Opportunities Funnel', icon: ShieldCheck },
            { id: 'tickets', label: 'Service Ticketing Support', icon: Ticket },
            { id: 'reports', label: 'Analytics Reports', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs View Manager */}
      <div className="transition-all duration-300">
        {activeTab === 'dashboard' && (
          <CrmDashboard 
            leads={leads}
            opportunities={opportunities}
            tickets={tickets}
            feedback={feedback}
            customers={mergedCrmCustomers}
            onNavigate={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === '360' && (
          <Customer360 
            customers={mergedCrmCustomers}
            salesOrders={salesOrders}
            tickets={tickets}
            communicationLogs={communicationLogs}
            feedback={feedback}
            loyaltyTransactions={loyaltyTransactions}
            onUpdateCustomer={handleUpdateCustomerCrmProfile}
            onAddCommunicationLog={handleAddCommunicationLog}
            onAddFeedback={handleAddFeedback}
            onAddLoyaltyTransaction={handleAddLoyaltyTransaction}
          />
        )}

        {activeTab === 'leads' && (
          <LeadsManager 
            leads={leads}
            employees={employees}
            onCreateLead={handleCreateLead}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onConvertLeadToCustomer={handleConvertLeadToCustomer}
          />
        )}

        {activeTab === 'opps' && (
          <OpportunitiesManager 
            opportunities={opportunities}
            employees={employees}
            customers={mergedCrmCustomers}
            onCreateOpportunity={handleCreateOpportunity}
            onUpdateOpportunity={handleUpdateOpportunity}
            onDeleteOpportunity={handleDeleteOpportunity}
          />
        )}

        {activeTab === 'tickets' && (
          <ServiceDeskManager 
            tickets={tickets}
            employees={employees}
            customers={mergedCrmCustomers}
            onCreateTicket={handleCreateTicket}
            onUpdateTicket={handleUpdateTicket}
            onAddTicketMessage={handleAddTicketMessage}
          />
        )}

        {activeTab === 'reports' && (
          <CrmReports 
            leads={leads}
            opportunities={opportunities}
            tickets={tickets}
            feedback={feedback}
            customers={mergedCrmCustomers}
          />
        )}
      </div>
    </div>
  );
};
export default CRM;
