import React, { useState } from 'react';
import { 
  Plus, Edit2, Check, X, Calendar, DollarSign, Target, ClipboardList,
  AlertCircle, ArrowRight, User, PlusCircle, Trash2, Paperclip
} from 'lucide-react';
import { CRMOpportunity, PipelineStage, Employee, CRMCustomer } from '../../types';

interface OpportunitiesManagerProps {
  opportunities: CRMOpportunity[];
  employees: Employee[];
  customers: CRMCustomer[];
  onCreateOpportunity: (opp: Omit<CRMOpportunity, 'id' | 'opportunityId' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onUpdateOpportunity: (id: string, updated: Partial<CRMOpportunity>) => Promise<void>;
  onDeleteOpportunity: (id: string) => Promise<void>;
}

const STAGES: PipelineStage[] = ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export const OpportunitiesManager: React.FC<OpportunitiesManagerProps> = ({
  opportunities,
  employees,
  customers,
  onCreateOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpp, setDetailOpp] = useState<CRMOpportunity | null>(null);
  const [editingOpp, setEditingOpp] = useState<CRMOpportunity | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('Qualification');
  const [expectedRevenue, setExpectedRevenue] = useState(10000);
  const [probability, setProbability] = useState(50);
  const [expectedClosingDate, setExpectedClosingDate] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [notes, setNotes] = useState('');

  // Add reminder / activity fields in detail view
  const [newReminder, setNewReminder] = useState('');
  const [newActivityType, setNewActivityType] = useState('Call');
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingOpp(null);
    setTitle('');
    setCustomerId(customers[0]?.id || '');
    setPipelineStage('Qualification');
    setExpectedRevenue(10000);
    setProbability(50);
    setExpectedClosingDate(new Date(Date.now() + 45*24*60*60*1000).toISOString().slice(0,10));
    setOwnerId(employees[0]?.id || '');
    setNotes('');
    setFormOpen(true);
  };

  const openEditModal = (opp: CRMOpportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOpp(opp);
    setTitle(opp.title);
    setCustomerId(opp.customerId || '');
    setPipelineStage(opp.pipelineStage);
    setExpectedRevenue(opp.expectedRevenue);
    setProbability(opp.probability);
    setExpectedClosingDate(opp.expectedClosingDate);
    setOwnerId(opp.ownerId);
    setNotes(opp.notes);
    setFormOpen(true);
  };

  const handleSaveOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const selectedCust = customers.find(c => c.id === customerId);
      const customerName = selectedCust ? selectedCust.fullName : 'Retail Customer';

      const selectedEmp = employees.find(emp => emp.id === ownerId);
      const ownerName = selectedEmp ? selectedEmp.fullName : 'Unassigned';

      const data = {
        title,
        customerId,
        customerName,
        pipelineStage,
        expectedRevenue: Number(expectedRevenue),
        probability: Number(probability),
        expectedClosingDate,
        ownerId,
        ownerName,
        notes,
        reminders: editingOpp ? editingOpp.reminders : [],
        activities: editingOpp ? editingOpp.activities : [],
        files: editingOpp ? editingOpp.files : [],
        status: 'Active' as any,
      };

      if (editingOpp) {
        await onUpdateOpportunity(editingOpp.id, data);
      } else {
        await onCreateOpportunity(data);
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Reminder checklist toggles
  const handleToggleReminder = async (opp: CRMOpportunity, index: number) => {
    const updatedReminders = [...opp.reminders];
    updatedReminders[index].done = !updatedReminders[index].done;
    await onUpdateOpportunity(opp.id, { reminders: updatedReminders });
    if (detailOpp?.id === opp.id) {
      setDetailOpp({ ...detailOpp, reminders: updatedReminders });
    }
  };

  // Add items inside details
  const handleAddReminder = async () => {
    if (!detailOpp || !newReminder.trim()) return;
    const updatedReminders = [...detailOpp.reminders, { date: new Date().toISOString().slice(0, 10), note: newReminder, done: false }];
    await onUpdateOpportunity(detailOpp.id, { reminders: updatedReminders });
    setDetailOpp({ ...detailOpp, reminders: updatedReminders });
    setNewReminder('');
  };

  const handleAddActivity = async () => {
    if (!detailOpp || !newActivityNotes.trim()) return;
    const updatedActivities = [...detailOpp.activities, { date: new Date().toISOString().slice(0, 10), type: newActivityType, notes: newActivityNotes }];
    await onUpdateOpportunity(detailOpp.id, { activities: updatedActivities });
    setDetailOpp({ ...detailOpp, activities: updatedActivities });
    setNewActivityNotes('');
  };

  const handleAttachFile = async () => {
    if (!detailOpp || !newFileUrl.trim() || !newFileName.trim()) return;
    const updatedFiles = [...detailOpp.files, { name: newFileName, url: newFileUrl }];
    await onUpdateOpportunity(detailOpp.id, { files: updatedFiles });
    setDetailOpp({ ...detailOpp, files: updatedFiles });
    setNewFileName('');
    setNewFileUrl('');
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case 'Qualification': return 'border-t-blue-500';
      case 'Discovery': return 'border-t-purple-500';
      case 'Proposal': return 'border-t-indigo-500';
      case 'Negotiation': return 'border-t-amber-500';
      case 'Won': return 'border-t-emerald-500';
      default: return 'border-t-rose-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Active Opportunity Funnel Pipelines</h2>
          <p className="text-[11px] text-zinc-500">Bento grid visualizer representing value projections by sales pipeline stages.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-4 py-2 text-xs flex items-center gap-1.5 transition"
        >
          <Plus className="h-4 w-4" /> Add Opportunity
        </button>
      </div>

      {/* Kanban Stages Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageOpps = opportunities.filter(o => o.pipelineStage === stage && o.status === 'Active');
          const stageSum = stageOpps.reduce((acc, curr) => acc + curr.expectedRevenue, 0);

          return (
            <div key={stage} className={`bg-zinc-100/55 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-900/60 space-y-3 min-h-[350px] border-t-3 ${getStageColor(stage)} flex flex-col`}>
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-900 pb-2 flex-shrink-0">
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate pr-1" title={stage}>{stage}</span>
                <span className="text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-850 px-1.5 py-0.2 rounded text-zinc-500 shrink-0">
                  {stageOpps.length}
                </span>
              </div>

              <div className="text-[10px] text-zinc-400 font-bold font-mono tracking-wide">
                SUM: ${stageSum.toLocaleString()}
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {stageOpps.map(opp => (
                  <div 
                    key={opp.id}
                    onClick={() => setDetailOpp(opp)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group space-y-2 relative"
                  >
                    <p className="font-bold text-xs text-zinc-900 dark:text-white leading-tight group-hover:text-blue-500 transition-colors">
                      {opp.title}
                    </p>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-blue-600 dark:text-blue-400">${opp.expectedRevenue.toLocaleString()}</span>
                      <span className="text-zinc-400 font-mono">prob: {opp.probability}%</span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-[9px] text-zinc-400">
                      <span className="truncate pr-1">{opp.customerName}</span>
                      <button 
                        onClick={(e) => openEditModal(opp, e)}
                        className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 transition shrink-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {stageOpps.length === 0 && (
                  <div className="text-center py-10 text-zinc-400 text-[10px]">No opportunities here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Slide-out / Modal */}
      {detailOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Target className="h-4.5 w-4.5 text-blue-500" /> {detailOpp.title}
                </h3>
                <span className="text-[10px] text-zinc-400 mt-1 block">Opp ID: {detailOpp.opportunityId} | Customer: {detailOpp.customerName}</span>
              </div>
              <button onClick={() => setDetailOpp(null)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Quick Details */}
              <div className="md:col-span-1 space-y-4">
                <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Overview</h4>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl space-y-3">
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">Expected Revenue</span>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">${detailOpp.expectedRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">Probability</span>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{detailOpp.probability}%</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">Pipeline Stage</span>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{detailOpp.pipelineStage}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">Estimated Close Date</span>
                    <p className="font-bold text-sm text-zinc-850 dark:text-zinc-250 font-mono">{detailOpp.expectedClosingDate}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase font-mono">Owner / Manager</span>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{detailOpp.ownerName}</p>
                  </div>
                </div>
              </div>

              {/* Task Reminders checklist & Activity logs */}
              <div className="md:col-span-2 space-y-6">
                {/* Reminders checklist */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono flex items-center justify-between">
                    <span>Task Reminders Checklist</span>
                    <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.2 rounded font-mono font-bold">
                      {detailOpp.reminders?.filter(r => r.done).length || 0}/{detailOpp.reminders?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {detailOpp.reminders?.map((reminder, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                        <button 
                          onClick={() => handleToggleReminder(detailOpp, idx)}
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            reminder.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300'
                          }`}
                        >
                          {reminder.done && <Check className="h-3 w-3" />}
                        </button>
                        <span className={`text-xs ${reminder.done ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                          {reminder.note}
                        </span>
                      </div>
                    ))}
                    {!detailOpp.reminders?.length && <div className="text-zinc-400 italic text-center py-2 text-[11px]">No task reminders assigned.</div>}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="Add custom action checklist item..."
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-white"
                      value={newReminder}
                      onChange={e => setNewReminder(e.target.value)}
                    />
                    <button onClick={handleAddReminder} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">
                      Add
                    </button>
                  </div>
                </div>

                {/* Activities log */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Interaction Activities Logs</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {detailOpp.activities?.map((act, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">{act.type}</span>
                          <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-1">{act.notes}</p>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-400 shrink-0">{act.date}</span>
                      </div>
                    ))}
                    {!detailOpp.activities?.length && <div className="text-zinc-400 italic text-center py-2 text-[11px]">No log entries.</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <select 
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-800 dark:text-white"
                      value={newActivityType}
                      onChange={e => setNewActivityType(e.target.value)}
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Proposal">Proposal Sent</option>
                    </select>
                    <input 
                      type="text" placeholder="Add activity summary details..."
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-800 dark:text-white"
                      value={newActivityNotes}
                      onChange={e => setNewActivityNotes(e.target.value)}
                    />
                    <button onClick={handleAddActivity} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700">
                      Log
                    </button>
                  </div>
                </div>

                {/* File Attachment Upload */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">Deal Attachments</h4>
                  <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto">
                    {detailOpp.files?.map((file, idx) => (
                      <a 
                        key={idx} href={file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-1 rounded-lg text-[10px]"
                      >
                        <Paperclip className="h-3 w-3" /> {file.name}
                      </a>
                    ))}
                    {!detailOpp.files?.length && <div className="text-zinc-400 italic text-[11px] w-full text-center py-1">No files uploaded.</div>}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" placeholder="File Name"
                      className="w-1/3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-white"
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                    />
                    <input 
                      type="text" placeholder="Paste File URL (Firebase Storage placeholder)..."
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-white font-mono"
                      value={newFileUrl}
                      onChange={e => setNewFileUrl(e.target.value)}
                    />
                    <button onClick={handleAttachFile} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingOpp ? 'Edit Opportunity Record' : 'Launch New CRM Sales Pipeline Opportunity'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpp} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Opportunity Deal Title</label>
                <input 
                  type="text" required
                  placeholder="e.g. Enterprise CRM Cloud Licensing Proposal"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Customer Profile Link</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.fullName} ({c.companyName || 'Individual'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Owner / Account Executive</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={ownerId}
                    onChange={e => setOwnerId(e.target.value)}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Pipeline Stage</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={pipelineStage}
                    onChange={e => setPipelineStage(e.target.value as PipelineStage)}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Revenue Value ($)</label>
                  <input 
                    type="number" required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={expectedRevenue}
                    onChange={e => setExpectedRevenue(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Probability (%)</label>
                  <input 
                    type="number" min={0} max={100} required
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white"
                    value={probability}
                    onChange={e => setProbability(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Context notes</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-zinc-800 dark:text-white h-16"
                  placeholder="Record summary deal details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center"
              >
                {submitting ? 'Saving Opportunity...' : editingOpp ? 'Update Deal' : 'Launch New CRM Opportunity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
