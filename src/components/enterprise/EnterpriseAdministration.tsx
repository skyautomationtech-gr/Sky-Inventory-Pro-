import React, { useState } from 'react';
import { 
  Building2, GitBranch, ShieldCheck, ArrowRightLeft, 
  Activity, Database, FileBarChart, Settings, Cpu, BadgeCheck
} from 'lucide-react';
import { CompanyManager } from './CompanyManager';
import { BranchManager } from './BranchManager';
import { ApprovalWorkflows } from './ApprovalWorkflows';
import { InventoryTransfers } from './InventoryTransfers';
import { EnterpriseAudit } from './EnterpriseAudit';
import { BackupRecovery } from './BackupRecovery';
import { ConsolidatedReports } from './ConsolidatedReports';
import { IntegrationHub } from './IntegrationHub';
import { ReleaseCenter } from './ReleaseCenter';

type AdminTab = 'companies' | 'branches' | 'workflows' | 'transfers' | 'audit' | 'backup' | 'reports' | 'integration' | 'release';

export const EnterpriseAdministration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('companies');

  const tabs = [
    { id: 'companies', name: 'Holding Companies', icon: Building2 },
    { id: 'branches', name: 'Branch Network', icon: GitBranch },
    { id: 'workflows', name: 'Approval Workflows', icon: ShieldCheck },
    { id: 'transfers', name: 'Stock Transfers', icon: ArrowRightLeft },
    { id: 'integration', name: 'Integration Hub', icon: Cpu },
    { id: 'audit', name: 'Security Audit', icon: Activity },
    { id: 'backup', name: 'Backup & Disaster', icon: Database },
    { id: 'reports', name: 'Consolidated Reports', icon: FileBarChart },
    { id: 'release', name: 'v1.0.0 Release Center', icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Settings className="h-5 w-5 text-blue-600 animate-spin" />
            <span>Enterprise Administration Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-entity corporate scaling suite. Overwrite global thresholds, trace state mutations, and synchronize branch inventory operations.</p>
        </div>
      </div>

      {/* Tabs Navigation Rail */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-850 pb-px text-xs font-medium">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-semibold cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View Frame */}
      <div className="pt-2">
        {activeTab === 'companies' && <CompanyManager />}
        {activeTab === 'branches' && <BranchManager />}
        {activeTab === 'workflows' && <ApprovalWorkflows />}
        {activeTab === 'transfers' && <InventoryTransfers />}
        {activeTab === 'integration' && <IntegrationHub />}
        {activeTab === 'audit' && <EnterpriseAudit />}
        {activeTab === 'backup' && <BackupRecovery />}
        {activeTab === 'reports' && <ConsolidatedReports />}
        {activeTab === 'release' && <ReleaseCenter />}
      </div>

    </div>
  );
};
