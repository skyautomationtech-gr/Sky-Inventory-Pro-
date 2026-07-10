import React, { useRef } from 'react';
import { 
  Download, BarChart2, PieChart as PieIcon, TrendingUp, HelpCircle, 
  Printer, ArrowDownLeft, Calendar, ShieldAlert, CheckCircle, FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { CRMLead, CRMOpportunity, SupportTicket, CustomerFeedback, CRMCustomer } from '../../types';

interface CrmReportsProps {
  leads: CRMLead[];
  opportunities: CRMOpportunity[];
  tickets: SupportTicket[];
  feedback: CustomerFeedback[];
  customers: CRMCustomer[];
}

const COLORS = ['#2563eb', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4'];

export const CrmReports: React.FC<CrmReportsProps> = ({
  leads,
  opportunities,
  tickets,
  feedback,
  customers,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Pipeline value by Stage
  const pipelineByStage = [
    { name: 'Qualification', value: opportunities.filter(o => o.pipelineStage === 'Qualification' && o.status === 'Active').reduce((acc, curr) => acc + curr.expectedRevenue, 0) },
    { name: 'Discovery', value: opportunities.filter(o => o.pipelineStage === 'Discovery' && o.status === 'Active').reduce((acc, curr) => acc + curr.expectedRevenue, 0) },
    { name: 'Proposal', value: opportunities.filter(o => o.pipelineStage === 'Proposal' && o.status === 'Active').reduce((acc, curr) => acc + curr.expectedRevenue, 0) },
    { name: 'Negotiation', value: opportunities.filter(o => o.pipelineStage === 'Negotiation' && o.status === 'Active').reduce((acc, curr) => acc + curr.expectedRevenue, 0) },
    { name: 'Won', value: opportunities.filter(o => o.pipelineStage === 'Won' && o.status === 'Active').reduce((acc, curr) => acc + curr.expectedRevenue, 0) },
  ];

  // 2. Leads by Source
  const leadSources = ['Website', 'Cold Call', 'Referral', 'Exhibition', 'Social Media', 'Partner', 'Other'];
  const leadsBySource = leadSources.map(src => ({
    name: src,
    count: leads.filter(l => l.source === src).length
  })).filter(item => item.count > 0);

  // 3. Tickets by Priority
  const ticketsByPriority = [
    { name: 'Urgent', count: tickets.filter(t => t.priority === 'Urgent').length },
    { name: 'High', count: tickets.filter(t => t.priority === 'High').length },
    { name: 'Medium', count: tickets.filter(t => t.priority === 'Medium').length },
    { name: 'Low', count: tickets.filter(t => t.priority === 'Low').length },
  ];

  // 4. Feedback rating distributions
  const ratingsCount = [1, 2, 3, 4, 5].map(stars => ({
    stars: `${stars} Stars`,
    count: feedback.filter(f => f.rating === stars).length
  }));

  // NPS Index
  const promoters = feedback.filter(f => f.satisfactionScore >= 9).length;
  const detractors = feedback.filter(f => f.satisfactionScore <= 6).length;
  const totalNpsScores = feedback.length;
  const npsIndex = totalNpsScores > 0 
    ? Math.round(((promoters - detractors) / totalNpsScores) * 100) 
    : 0;

  // CSV Exporters
  const downloadLeadsCSV = () => {
    let csv = 'Lead ID,Full Name,Company,Phone,Email,Source,Status,Expected Value,Closing Date\n';
    leads.forEach(l => {
      csv += `"${l.leadId}","${l.fullName}","${l.companyName}","${l.phone}","${l.email}","${l.source}","${l.status}",${l.expectedValue},"${l.expectedClosingDate}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CRM_Leads_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const downloadOppsCSV = () => {
    let csv = 'Opportunity ID,Title,Customer,Stage,Revenue,Probability,Closing Date,Owner\n';
    opportunities.forEach(o => {
      csv += `"${o.opportunityId}","${o.title}","${o.customerName}","${o.pipelineStage}",${o.expectedRevenue},${o.probability},"${o.expectedClosingDate}","${o.ownerName}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CRM_Opportunities_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const downloadTicketsCSV = () => {
    let csv = 'Ticket Number,Customer,Priority,Category,Department,Assigned,Status,Opened Date\n';
    tickets.forEach(t => {
      csv += `"${t.ticketNumber}","${t.customerName}","${t.priority}","${t.category}","${t.department}","${t.assignedName}","${t.status}","${t.createdDate}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ServiceDesk_Tickets_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Action Exporters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl flex-shrink-0 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Enterprise CRM Business Analytics</h2>
          <p className="text-[11px] text-zinc-500">Live dashboard analytics representing satisfaction scorecards, sales channels, and ticket trends.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={downloadLeadsCSV}
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Leads CSV
          </button>
          <button 
            onClick={downloadOppsCSV}
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-500" /> Export Deals CSV
          </button>
          <button 
            onClick={downloadTicketsCSV}
            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-rose-500" /> Export Tickets CSV
          </button>
          <button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Printer className="h-4 w-4" /> Print Sheet
          </button>
        </div>
      </div>

      {/* NPS Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">Net Promoter Score (NPS)</span>
            <div className="flex items-baseline gap-2.5 mt-2.5">
              <span className={`text-3xl font-black ${npsIndex >= 50 ? 'text-emerald-500' : npsIndex >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                {npsIndex > 0 ? `+${npsIndex}` : npsIndex}
              </span>
              <span className="text-xs text-zinc-400">Index Score</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Based on {totalNpsScores} verified customer rating reviews. Promoters (9-10 Rating): {promoters} | Detractors (0-6 Rating): {detractors}.
            </p>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-4">
            <div 
              className={`h-full rounded-full ${npsIndex >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${Math.min(100, Math.max(0, npsIndex + 50))}%` }} // scales center at 50%
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">Leads Pipeline Conversion Rate</span>
          <div className="flex items-baseline gap-2.5 mt-2.5">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Converted').length / leads.length) * 100) : 0}%
            </span>
            <span className="text-xs text-zinc-400">Overall Win Rate</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Total of {leads.filter(l => l.status === 'Converted').length} lead conversions out of {leads.length} recorded contact opportunities inside active channels.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">Ticket Resolution SLA Rating</span>
          <div className="flex items-baseline gap-2.5 mt-2.5">
            <span className="text-3xl font-black text-emerald-500">
              {tickets.length > 0 ? Math.round((tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length / tickets.length) * 100) : 0}%
            </span>
            <span className="text-xs text-zinc-400">SLA Clearance Rate</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Resolved & closed {tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length} tickets out of {tickets.length} total registered customer support tickets.
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Pipeline chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" /> Pipeline Projections by Funnel Stage ($)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="value" name="Expected Deal Value" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {pipelineByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Generation Sources pie chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1.5">
            <PieIcon className="h-4 w-4" /> Lead Acquisition Channel Distributions
          </h3>
          <div className="h-64 w-full flex flex-col md:flex-row items-center justify-between">
            <div className="h-full w-full md:w-2/3">
              {leadsBySource.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 text-xs">No active lead data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="w-full md:w-1/3 space-y-1.5 mt-4 md:mt-0">
              {leadsBySource.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-zinc-500 truncate max-w-[120px]">{entry.name}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-300 ml-auto font-mono">({entry.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support Tickets Prioritization */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" /> Helpdesk Tickets Volume by Priority Level
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketsByPriority} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis type="number" stroke="#71717a" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="count" name="Tickets Count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ratings score count chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4" /> Star Rating Satisfaction Distributions
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingsCount}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="stars" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="count" name="Reviews Count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
