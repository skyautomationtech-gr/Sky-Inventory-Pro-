import React from 'react';
import { 
  Users, UserCheck, Award, Ticket, CheckCircle2, AlertCircle, 
  TrendingUp, DollarSign, ArrowUpRight, Target, Clock
} from 'lucide-react';
import { CRMCustomer, CRMLead, CRMOpportunity, SupportTicket, CRMFollowup, CustomerFeedback, SalesOrder } from '../../types';

interface CrmDashboardProps {
  customers: CRMCustomer[];
  leads: CRMLead[];
  opportunities: CRMOpportunity[];
  tickets: SupportTicket[];
  followups: CRMFollowup[];
  feedback: CustomerFeedback[];
  salesOrders: SalesOrder[];
  onNavigate: (tab: string) => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({
  customers,
  leads,
  opportunities,
  tickets,
  followups,
  feedback,
  salesOrders,
  onNavigate,
}) => {
  // Compute Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'Active').length;
  const vipCustomers = customers.filter(c => c.customerType === 'VIP' || c.membershipLevel === 'Platinum' || c.membershipLevel === 'Gold').length;
  
  // New customers this month (July 2026 as per user current context)
  const newCustomersThisMonth = customers.filter(c => {
    if (!c.createdAt) return false;
    const date = new Date(c.createdAt);
    return date.getFullYear() === 2026 && date.getMonth() === 6; // Month 6 is July
  }).length;

  const openTickets = tickets.filter(t => ['Open', 'Assigned', 'In Progress', 'Reopened'].includes(t.status)).length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const pendingFollowups = followups.filter(f => f.completionStatus === 'Pending').length;

  // Average CSAT (Customer Satisfaction Score 1 to 10 mapped to percentage)
  const avgSatisfaction = feedback.length > 0
    ? (feedback.reduce((acc, curr) => acc + curr.satisfactionScore, 0) / feedback.length) * 10
    : 85; // Default 85% if no reviews

  const activeOpportunities = opportunities.filter(o => o.status === 'Active');
  const expectedOppRevenue = activeOpportunities.reduce((acc, curr) => acc + (curr.expectedRevenue * (curr.probability / 100)), 0);

  // Customer Lifetime Value (CLV): Total of completed sales orders
  const totalCLV = salesOrders
    .filter(so => so.salesStatus === 'Completed')
    .reduce((acc, curr) => acc + curr.grandTotal, 0);

  const stats = [
    {
      title: 'Total Customers',
      value: totalCustomers,
      change: `+${newCustomersThisMonth} this month`,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10',
      actionTab: 'customers360'
    },
    {
      title: 'Active Customers',
      value: activeCustomers,
      change: `${Math.round((activeCustomers / (totalCustomers || 1)) * 100)}% active rate`,
      icon: UserCheck,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
      actionTab: 'customers360'
    },
    {
      title: 'VIP & Platinum',
      value: vipCustomers,
      change: 'Loyalty Tier Members',
      icon: Award,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10',
      actionTab: 'loyalty'
    },
    {
      title: 'Open Support Tickets',
      value: openTickets,
      change: `${resolvedTickets} resolved total`,
      icon: Ticket,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10',
      actionTab: 'tickets'
    },
    {
      title: 'Pending Follow-ups',
      value: pendingFollowups,
      change: 'Due interactions',
      icon: Clock,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10',
      actionTab: 'followups'
    },
    {
      title: 'Customer Satisfaction',
      value: `${avgSatisfaction.toFixed(1)}%`,
      change: `Based on ${feedback.length} feedbacks`,
      icon: CheckCircle2,
      color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/10',
      actionTab: 'feedback'
    },
    {
      title: 'Sales Pipeline (Weighted)',
      value: `$${expectedOppRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `${activeOpportunities.length} opportunities active`,
      icon: TrendingUp,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10',
      actionTab: 'opportunities'
    },
    {
      title: 'Customer Lifetime Value',
      value: `$${totalCLV.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Cumulative CRM sales',
      icon: DollarSign,
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/10',
      actionTab: 'reports'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Enterprise CRM Executive Dashboard</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Real-time indicators across client pipelines, service desk activities, and membership tiers.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              onClick={() => onNavigate(stat.actionTab)}
              className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:shadow-md hover:border-blue-500/30 dark:hover:border-blue-500/20 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              id={`stat-card-${i}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase font-mono">{stat.title}</span>
                  <p className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg border ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{stat.change}</span>
                <span className="text-[10px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5">
                  View <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Quick Actions / Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Urgent Tickets */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-amber-500" /> Urgent Support Tickets
            </h3>
            <button onClick={() => onNavigate('tickets')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              All Tickets
            </button>
          </div>
          <div className="space-y-2.5">
            {tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').slice(0, 4).length === 0 ? (
              <div className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                No urgent tickets requiring attention.
              </div>
            ) : (
              tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').slice(0, 4).map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => onNavigate('tickets')}
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-100 dark:border-zinc-900 cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">{ticket.ticketNumber}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        ticket.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mt-1">{ticket.customerName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{ticket.description}</p>
                  </div>
                  <ChevronArrowRight />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Due Follow-ups */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-rose-500" /> Critical Follow-ups Due
            </h3>
            <button onClick={() => onNavigate('followups')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Scheduler
            </button>
          </div>
          <div className="space-y-2.5">
            {followups.filter(f => f.completionStatus === 'Pending').slice(0, 4).length === 0 ? (
              <div className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                No pending follow-ups registered.
              </div>
            ) : (
              followups.filter(f => f.completionStatus === 'Pending').slice(0, 4).map(followup => (
                <div 
                  key={followup.id} 
                  onClick={() => onNavigate('followups')}
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-100 dark:border-zinc-900 cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{followup.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">Reference: {followup.targetName}</p>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                      <span>Date: {followup.followupDate}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        followup.priority === 'High' ? 'bg-rose-500' : 'bg-zinc-400'
                      }`} />
                    </p>
                  </div>
                  <ChevronArrowRight />
                </div>
              ))
            )}
          </div>
        </div>

        {/* High-Value Pipelines */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" /> Active High Value Pipelines
            </h3>
            <button onClick={() => onNavigate('opportunities')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              All Pipelines
            </button>
          </div>
          <div className="space-y-2.5">
            {opportunities.filter(o => o.status === 'Active').sort((a,b) => b.expectedRevenue - a.expectedRevenue).slice(0, 4).length === 0 ? (
              <div className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                No active opportunities in pipeline.
              </div>
            ) : (
              opportunities.filter(o => o.status === 'Active').sort((a,b) => b.expectedRevenue - a.expectedRevenue).slice(0, 4).map(opp => (
                <div 
                  key={opp.id} 
                  onClick={() => onNavigate('opportunities')}
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors border border-zinc-100 dark:border-zinc-900 cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{opp.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">${opp.expectedRevenue.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-400">({opp.probability}% probability)</span>
                    </div>
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded mt-1 bg-blue-500/10 text-blue-500 inline-block">
                      {opp.pipelineStage}
                    </span>
                  </div>
                  <ChevronArrowRight />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronArrowRight = () => (
  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);
