import React from 'react';
import { openFeedbackForm } from '../utils/feedback';
import { motion } from 'motion/react';
import { 
  Boxes, LayoutGrid, Tag, Truck, Users, ShoppingCart, 
  TrendingUp, Calculator, Warehouse, BarChart2, UserCog, 
  QrCode, Scan, Settings, ArrowRight, Sparkles 
} from 'lucide-react';

interface ComingSoonProps {
  moduleName: string;
}

const moduleDetails: Record<string, { desc: string; features: string[]; icon: any }> = {
  Products: {
    desc: 'Centralized product catalog with variants, pricing matrices, and inventory tracking.',
    features: ['Multi-currency support', 'Bulk CSV upload/export', 'Variant & SKU generator', 'E-commerce sync ready'],
    icon: Boxes
  },
  Inventory: {
    desc: 'Real-time stock adjustment, transfer logs, low-stock alerts, and batch management.',
    features: ['Automatic safety stock alarms', 'Inter-warehouse stock transfer tracking', 'Damaged goods write-off forms', 'Physical audit sheet printing'],
    icon: LayoutGrid
  },
  Categories: {
    desc: 'Structured category tree with customized attributes and taxonomy tags.',
    features: ['Unlimited nesting levels', 'Custom metadata attributes', 'Category-level tax configuration', 'SEO slug management'],
    icon: Tag
  },
  Brands: {
    desc: 'Manage and coordinate brand profiles, manufacturer warranties, and brand-specific stats.',
    features: ['Manufacturer registry', 'Warranty terms templates', 'Brand Performance dashboard', 'Vendor association'],
    icon: Sparkles
  },
  Suppliers: {
    desc: 'Comprehensive vendor registry, past purchase orders, payment terms, and performance ratings.',
    features: ['Automated RFQ generator', 'Lead-time tracking', 'Outstanding balance ledger', 'Supplier contact database'],
    icon: Truck
  },
  Customers: {
    desc: 'Customer Relationship Management (CRM) ledger, purchase history, and loyalty tier points.',
    features: ['Credit limit enforcement', 'Dynamic loyalty tier system', 'Invoice history and email logs', 'Customer statements'],
    icon: Users
  },
  Sales: {
    desc: 'Generate commercial invoices, sales quotations, tax receipts, and track dispatch status.',
    features: ['Quotation-to-Invoice conversion', 'Automated tax calculations', 'Logistics & delivery tracking', 'Return & credit notes'],
    icon: ShoppingCart
  },
  Purchase: {
    desc: 'Create purchase requisitions, approve purchase orders, track incoming shipments, and record supplier bills.',
    features: ['Tiered approval workflows', 'Bill of Lading tracking', 'Landed cost calculations', 'Unreceived goods reminders'],
    icon: ArrowRight
  },
  POS: {
    desc: 'High-speed, offline-capable Point of Sale cashier register designed for tablets and desktops.',
    features: ['Multi-payment option support', 'Offline receipt synchronization', 'Cash drawer opening logs', 'Barcode quick scan mode'],
    icon: Scan
  },
  Warehouse: {
    desc: 'Manage multiple physical locations, zones, rack coordinates, and smart bin locations.',
    features: ['Smart picking wave planning', 'Bin/Rack mapping layout', 'Location capacity utilization stats', 'Transfer routing optimization'],
    icon: Warehouse
  },
  Reports: {
    desc: 'Advanced business intelligence engine offering deep insights, custom filters, and automatic report scheduling.',
    features: ['Custom report builder', 'PDF/Excel automated scheduler', 'Sales velocity heatmaps', 'Product profitability charts'],
    icon: BarChart2
  },
  Accounting: {
    desc: 'Double-entry bookkeeping journal, chart of accounts, tax preparation reports, and cash flow forecasting.',
    features: ['General Ledger (GL) reports', 'Profit & Loss (P&L) statements', 'Automated VAT/GST reporting', 'Bank feed synchronization'],
    icon: Calculator
  },
  Employees: {
    desc: 'Manage staff timesheets, department-level permission overrides, and hourly shift logging.',
    features: ['Shift scheduling planner', 'Performance analytics dashboard', 'Access key management', 'Hourly wage ledgers'],
    icon: UserCog
  },
  Barcode: {
    desc: 'Enterprise bulk barcode generator supporting multiple formats (Code 128, EAN-13, UPC).',
    features: ['Print label templates generator', 'Custom SKU barcode mapper', 'Bulk PDF sheet download', 'Compatible with Zebra printers'],
    icon: QrCode
  },
  'QR Scanner': {
    desc: 'High-speed QR scanner for instant stock adjustment, checkout processing, and bin lookup.',
    features: ['Live camera canvas feed', 'Mobile/Tablet browser optimized', 'Instant scan audio feedback', 'Batch scanning pipeline'],
    icon: Scan
  },
  Settings: {
    desc: 'Configure business identity parameters, tax defaults, notification thresholds, and security parameters.',
    features: ['Company profile & branding', 'Default tax & currency settings', 'Email notification thresholds', 'Firestore backup triggers'],
    icon: Settings
  }
};

export const ComingSoon: React.FC<ComingSoonProps> = ({ moduleName }) => {
  const info = moduleDetails[moduleName] || {
    desc: 'This module is scheduled to be designed and fully integrated during Phase 2.',
    features: ['Custom fields & forms', 'Durable cloud-sync database pipelines', 'Unified search filters', 'Interactive layout controls'],
    icon: Sparkles
  };

  const IconComponent = info.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-sm relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/5 dark:bg-blue-400/5 blur-3xl rounded-full" />

        {/* Module Icon Container */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/30 text-slate-700 dark:text-slate-300 mb-6 shadow-sm">
          <IconComponent className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 mb-4 tracking-wide uppercase font-mono">
          Phase 2 Blueprint
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
          {moduleName} Module
        </h2>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {info.desc}
        </p>

        {/* Dynamic feature list preview */}
        <div className="mt-8 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
          <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 font-mono">
            Key Features In Development
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {info.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            This module has its schema, paths, and permissions ready in the foundation layer.
          </p>
          <div className="mt-3">
            <button
              onClick={openFeedbackForm}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Have ideas for this module? Share your feedback
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
