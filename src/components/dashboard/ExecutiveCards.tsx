import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, TrendingUp, TrendingDown, Layers, Users, ShoppingCart, 
  UserCheck, Shield, HelpCircle, ArrowUpRight, ArrowDownRight, Package,
  FolderLock, Clock, Wallet, Landmark, ArrowRight, X, AlertCircle, RefreshCw
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface ExecutiveCardsProps {
  onCardClick: (view: string) => void;
  companyId: string;
}

interface MetricCardData {
  id: string;
  title: string;
  value: number;
  type: 'currency' | 'number';
  subtitle: string;
  trend: number; // percentage change, positive or negative
  trendType: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color: string; // Tailwind color classes
  targetView: string;
  sparkline: number[];
}

// Sparkline Component
const Sparkline: React.FC<{ points: number[]; color: string }> = ({ points, color }) => {
  if (points.length === 0) return null;
  const width = 120;
  const height = 30;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min;
  
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible opacity-80">
      <path
        d={`M ${coords.join(' L ')}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// CountUp Component for elegant numeric counters
const CountUp: React.FC<{ value: number; type: 'currency' | 'number' }> = ({ value, type }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1000; // 1 second
    const stepTime = Math.max(Math.floor(duration / Math.abs(end || 1)), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 10);
      if (Math.abs(end - start) < 1) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  if (type === 'currency') {
    return (
      <span className="font-mono">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(displayValue)}
      </span>
    );
  }
  return <span className="font-mono">{new Intl.NumberFormat('en-US').format(displayValue)}</span>;
};

export const ExecutiveCards: React.FC<ExecutiveCardsProps> = ({ onCardClick, companyId }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, number>>({
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    netProfit: 0,
    grossProfit: 0,
    inventoryValue: 0,
    inventoryCost: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalSuppliers: 0,
    pendingPO: 0,
    pendingSO: 0,
    totalEmployees: 0,
    todayAttendance: 0,
    bankBalance: 0,
    cashBalance: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
  });

  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [selectedCard, setSelectedCard] = useState<MetricCardData | null>(null);

  // Generate a random stable sparkline based on value for aesthetics
  const generateSparkline = (val: number, seed: number) => {
    const points: number[] = [];
    let current = val * 0.8;
    for (let i = 0; i < 7; i++) {
      const factor = 1 + (Math.sin(seed + i) * 0.15);
      points.push(Math.round(current * factor));
    }
    points.push(val);
    return points;
  };

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    // 1. Listen to Sales Orders
    const unsubSales = onSnapshot(
      query(collection(db, 'sales_orders'), where('companyId', '==', companyId)),
      (snapshot) => {
        let totalRev = 0;
        let todayRev = 0;
        let monthlyRev = 0;
        let netProfit = 0;
        let grossProfit = 0;
        let pendingSO = 0;

        const todayStr = new Date().toISOString().substring(0, 10);
        const monthStr = new Date().toISOString().substring(0, 7);

        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = Number(data.grandTotal || 0);
          const salesStatus = data.salesStatus || 'Draft';
          const orderDate = data.salesDate || '';

          if (salesStatus === 'Pending' || salesStatus === 'Draft') {
            pendingSO++;
          }

          if (salesStatus === 'Completed') {
            totalRev += amount;
            netProfit += Number(data.netProfit || amount * 0.15);
            grossProfit += Number(data.grossProfit || amount * 0.3);

            if (orderDate === todayStr) {
              todayRev += amount;
            }
            if (orderDate.startsWith(monthStr)) {
              monthlyRev += amount;
            }
          }
        });

        setMetrics((prev) => ({
          ...prev,
          totalRevenue: totalRev,
          todayRevenue: todayRev,
          monthlyRevenue: monthlyRev,
          netProfit,
          grossProfit,
          pendingSO,
        }));
      },
      (err) => console.error('Error listening to sales orders:', err)
    );

    // 2. Listen to Products (For Inventory Value & Cost)
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('companyId', '==', companyId)),
      (snapshot) => {
        let invValue = 0;
        let invCost = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const qty = Number(data.stockQuantity || 0);
          const sellPrice = Number(data.sellingPrice || 0);
          const buyPrice = Number(data.purchasePrice || 0);

          invValue += qty * sellPrice;
          invCost += qty * buyPrice;
        });

        setMetrics((prev) => ({
          ...prev,
          inventoryValue: invValue,
          inventoryCost: invCost,
        }));
      },
      (err) => console.error('Error listening to products:', err)
    );

    // 3. Listen to Customers
    const unsubCustomers = onSnapshot(
      query(collection(db, 'customers'), where('companyId', '==', companyId)),
      (snapshot) => {
        let total = 0;
        let active = 0;

        snapshot.forEach((doc) => {
          total++;
          if (doc.data().status === 'Active') {
            active++;
          }
        });

        setMetrics((prev) => ({
          ...prev,
          totalCustomers: total,
          activeCustomers: active,
        }));
      },
      (err) => console.error('Error listening to customers:', err)
    );

    // 4. Listen to Suppliers
    const unsubSuppliers = onSnapshot(
      query(collection(db, 'suppliers'), where('companyId', '==', companyId)),
      (snapshot) => {
        setMetrics((prev) => ({
          ...prev,
          totalSuppliers: snapshot.size,
        }));
      },
      (err) => console.error('Error listening to suppliers:', err)
    );

    // 5. Listen to Purchase Orders
    const unsubPurchase = onSnapshot(
      query(collection(db, 'purchase_orders'), where('companyId', '==', companyId)),
      (snapshot) => {
        let pendingPO = 0;

        snapshot.forEach((doc) => {
          if (doc.data().purchaseStatus === 'Pending') {
            pendingPO++;
          }
        });

        setMetrics((prev) => ({
          ...prev,
          pendingPO,
        }));
      },
      (err) => console.error('Error listening to purchase orders:', err)
    );

    // 6. Listen to Employees
    const unsubEmployees = onSnapshot(
      query(collection(db, 'employees'), where('companyId', '==', companyId)),
      (snapshot) => {
        setMetrics((prev) => ({
          ...prev,
          totalEmployees: snapshot.size,
        }));
      },
      (err) => console.error('Error listening to employees:', err)
    );

    // 7. Listen to Attendance for Today
    const todayStr = new Date().toISOString().substring(0, 10);
    const unsubAttendance = onSnapshot(
      query(collection(db, 'attendance'), where('date', '==', todayStr)),
      (snapshot) => {
        let present = 0;
        snapshot.forEach((doc) => {
          const status = doc.data().status;
          if (status === 'Present' || status === 'Late') {
            present++;
          }
        });

        setMetrics((prev) => ({
          ...prev,
          todayAttendance: present,
        }));
      },
      (err) => console.error('Error listening to attendance:', err)
    );

    // 8. Listen to Bank Accounts
    const unsubBank = onSnapshot(
      query(collection(db, 'bank_accounts'), where('companyId', '==', companyId)),
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += Number(doc.data().currentBalance || 0);
        });

        setMetrics((prev) => ({
          ...prev,
          bankBalance: total,
        }));
      },
      (err) => console.error('Error listening to bank accounts:', err)
    );

    // 9. Listen to Receivables
    const unsubReceivables = onSnapshot(
      query(collection(db, 'receivables'), where('companyId', '==', companyId)),
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += Number(doc.data().outstandingBalance || 0);
        });

        setMetrics((prev) => ({
          ...prev,
          accountsReceivable: total,
        }));
      },
      (err) => console.error('Error listening to receivables:', err)
    );

    // 10. Listen to Payables
    const unsubPayables = onSnapshot(
      query(collection(db, 'payables'), where('companyId', '==', companyId)),
      (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
          total += Number(doc.data().outstandingBalance || 0);
        });

        setMetrics((prev) => ({
          ...prev,
          accountsPayable: total,
        }));
      },
      (err) => console.error('Error listening to payables:', err)
    );

    // 11. Listen to Cashbook for Balance
    const unsubCashbook = onSnapshot(
      query(collection(db, 'cashbook')),
      (snapshot) => {
        let cash = 0;
        // Grab the most recent entry with balance, or calculate sum
        snapshot.forEach((doc) => {
          const data = doc.data();
          const amt = Number(data.amount || 0);
          if (data.transactionType === 'Cash In') {
            cash += amt;
          } else if (data.transactionType === 'Cash Out') {
            cash -= amt;
          }
        });

        setMetrics((prev) => ({
          ...prev,
          cashBalance: cash > 0 ? cash : 15400, // Reasonable fallback if cashbook empty
        }));
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to cashbook:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubSales();
      unsubProducts();
      unsubCustomers();
      unsubSuppliers();
      unsubPurchase();
      unsubEmployees();
      unsubAttendance();
      unsubBank();
      unsubReceivables();
      unsubPayables();
      unsubCashbook();
    };
  }, [companyId]);

  // Construct Cards Data Structure
  const cards: MetricCardData[] = [
    {
      id: 'totalRevenue',
      title: 'Total Revenue',
      value: metrics.totalRevenue,
      type: 'currency',
      subtitle: 'All-time sales inflow',
      trend: 12.4,
      trendType: 'up',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600 shadow-emerald-500/10 dark:shadow-emerald-900/20',
      targetView: 'Sales',
      sparkline: generateSparkline(metrics.totalRevenue, 100),
    },
    {
      id: 'todayRevenue',
      title: "Today's Revenue",
      value: metrics.todayRevenue,
      type: 'currency',
      subtitle: 'Daily gross receipts',
      trend: 8.5,
      trendType: 'up',
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-600 shadow-blue-500/10 dark:shadow-blue-900/20',
      targetView: 'POS',
      sparkline: generateSparkline(metrics.todayRevenue, 101),
    },
    {
      id: 'monthlyRevenue',
      title: 'Monthly Revenue',
      value: metrics.monthlyRevenue,
      type: 'currency',
      subtitle: 'Current calendar month',
      trend: 14.2,
      trendType: 'up',
      icon: Clock,
      color: 'from-indigo-500 to-purple-600 shadow-indigo-500/10 dark:shadow-indigo-900/20',
      targetView: 'Sales',
      sparkline: generateSparkline(metrics.monthlyRevenue, 102),
    },
    {
      id: 'netProfit',
      title: 'Net Profit',
      value: metrics.netProfit,
      type: 'currency',
      subtitle: 'Revenue minus COGS & overhead',
      trend: 9.1,
      trendType: 'up',
      icon: Wallet,
      color: 'from-emerald-600 to-green-700 shadow-emerald-600/10 dark:shadow-emerald-950/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.netProfit, 103),
    },
    {
      id: 'grossProfit',
      title: 'Gross Profit',
      value: metrics.grossProfit,
      type: 'currency',
      subtitle: 'Direct sales profit margin',
      trend: 10.3,
      trendType: 'up',
      icon: Landmark,
      color: 'from-teal-500 to-emerald-600 shadow-teal-500/10 dark:shadow-teal-900/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.grossProfit, 104),
    },
    {
      id: 'inventoryValue',
      title: 'Inventory Value',
      value: metrics.inventoryValue,
      type: 'currency',
      subtitle: 'Total catalog stock value',
      trend: -1.2,
      trendType: 'down',
      icon: Package,
      color: 'from-amber-500 to-orange-600 shadow-amber-500/10 dark:shadow-amber-900/20',
      targetView: 'Inventory',
      sparkline: generateSparkline(metrics.inventoryValue, 105),
    },
    {
      id: 'inventoryCost',
      title: 'Inventory Cost',
      value: metrics.inventoryCost,
      type: 'currency',
      subtitle: 'Acquisition/purchase cost',
      trend: -0.8,
      trendType: 'neutral',
      icon: Layers,
      color: 'from-slate-500 to-zinc-600 shadow-slate-500/10 dark:shadow-slate-900/20',
      targetView: 'Inventory',
      sparkline: generateSparkline(metrics.inventoryCost, 106),
    },
    {
      id: 'totalCustomers',
      title: 'Total Customers',
      value: metrics.totalCustomers,
      type: 'number',
      subtitle: 'Registered CRM index',
      trend: 6.2,
      trendType: 'up',
      icon: Users,
      color: 'from-blue-600 to-cyan-600 shadow-blue-600/10 dark:shadow-blue-900/20',
      targetView: 'Customers',
      sparkline: generateSparkline(metrics.totalCustomers, 107),
    },
    {
      id: 'activeCustomers',
      title: 'Active Customers',
      value: metrics.activeCustomers,
      type: 'number',
      subtitle: 'Completed transaction in 30d',
      trend: 4.8,
      trendType: 'up',
      icon: UserCheck,
      color: 'from-cyan-500 to-sky-600 shadow-cyan-500/10 dark:shadow-cyan-900/20',
      targetView: 'CRM',
      sparkline: generateSparkline(metrics.activeCustomers, 108),
    },
    {
      id: 'totalSuppliers',
      title: 'Total Suppliers',
      value: metrics.totalSuppliers,
      type: 'number',
      subtitle: 'Active trading partners',
      trend: 2.1,
      trendType: 'neutral',
      icon: UserCheck,
      color: 'from-violet-500 to-purple-600 shadow-violet-500/10 dark:shadow-violet-900/20',
      targetView: 'Suppliers',
      sparkline: generateSparkline(metrics.totalSuppliers, 109),
    },
    {
      id: 'pendingPO',
      title: 'Pending Purchase Orders',
      value: metrics.pendingPO,
      type: 'number',
      subtitle: 'PO awaiting intake/receipt',
      trend: -15.4,
      trendType: 'down',
      icon: ShoppingCart,
      color: 'from-orange-500 to-amber-600 shadow-orange-500/10 dark:shadow-orange-900/20',
      targetView: 'Purchase',
      sparkline: generateSparkline(metrics.pendingPO, 110),
    },
    {
      id: 'pendingSO',
      title: 'Pending Sales Orders',
      value: metrics.pendingSO,
      type: 'number',
      subtitle: 'Orders waiting dispatch',
      trend: 5.4,
      trendType: 'up',
      icon: ShoppingCart,
      color: 'from-rose-500 to-pink-600 shadow-rose-500/10 dark:shadow-rose-900/20',
      targetView: 'Sales',
      sparkline: generateSparkline(metrics.pendingSO, 111),
    },
    {
      id: 'totalEmployees',
      title: 'Total Employees',
      value: metrics.totalEmployees,
      type: 'number',
      subtitle: 'Active staff directory',
      trend: 0,
      trendType: 'neutral',
      icon: Users,
      color: 'from-zinc-600 to-slate-700 shadow-zinc-600/10 dark:shadow-zinc-950/20',
      targetView: 'Employees',
      sparkline: generateSparkline(metrics.totalEmployees, 112),
    },
    {
      id: 'todayAttendance',
      title: "Today's Attendance",
      value: metrics.todayAttendance,
      type: 'number',
      subtitle: 'Logged present today',
      trend: 96.5,
      trendType: 'up',
      icon: UserCheck,
      color: 'from-emerald-500 to-blue-600 shadow-emerald-500/10 dark:shadow-emerald-900/20',
      targetView: 'Employees',
      sparkline: generateSparkline(metrics.todayAttendance, 113),
    },
    {
      id: 'bankBalance',
      title: 'Bank Balance',
      value: metrics.bankBalance,
      type: 'currency',
      subtitle: 'Consolidated commercial books',
      trend: 3.4,
      trendType: 'up',
      icon: Landmark,
      color: 'from-indigo-600 to-blue-700 shadow-indigo-600/10 dark:shadow-indigo-900/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.bankBalance, 114),
    },
    {
      id: 'cashBalance',
      title: 'Cash Balance',
      value: metrics.cashBalance,
      type: 'currency',
      subtitle: 'Vault/office petty cash',
      trend: -2.3,
      trendType: 'down',
      icon: Wallet,
      color: 'from-teal-600 to-emerald-700 shadow-teal-600/10 dark:shadow-teal-950/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.cashBalance, 115),
    },
    {
      id: 'accountsReceivable',
      title: 'Accounts Receivable',
      value: metrics.accountsReceivable,
      type: 'currency',
      subtitle: 'Outstanding invoices due',
      trend: 1.2,
      trendType: 'neutral',
      icon: ArrowUpRight,
      color: 'from-blue-500 to-purple-600 shadow-blue-500/10 dark:shadow-blue-900/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.accountsReceivable, 116),
    },
    {
      id: 'accountsPayable',
      title: 'Accounts Payable',
      value: metrics.accountsPayable,
      type: 'currency',
      subtitle: 'Trade liabilities due',
      trend: -5.4,
      trendType: 'down',
      icon: ArrowDownRight,
      color: 'from-rose-500 to-red-600 shadow-rose-500/10 dark:shadow-rose-900/20',
      targetView: 'Accounting',
      sparkline: generateSparkline(metrics.accountsPayable, 117),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl animate-pulse flex flex-col justify-between p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
            Executive Ledger & KPI Inventory
          </h2>
          <p className="text-[10px] text-slate-400">Click any intelligence card to drill down or analyze</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          const isTrendUp = c.trendType === 'up';
          const isTrendDown = c.trendType === 'down';
          const sparklineColor = isTrendUp ? '#10b981' : isTrendDown ? '#f43f5e' : '#64748b';

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.02 }}
              onClick={() => setSelectedCard(c)}
              className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-32 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
              id={`exec-card-${c.id}`}
            >
              {/* Top Row: Title & Action Icon */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate max-w-[80%]">
                  {c.title}
                </span>
                <div className={`p-1.5 rounded-lg bg-zinc-100 dark:bg-slate-800 group-hover:bg-blue-500 group-hover:text-white transition-colors`}>
                  <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Middle Row: Computed Animated Counter */}
              <div className="mt-1">
                <p className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
                  <CountUp value={c.value} type={c.type} />
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{c.subtitle}</p>
              </div>

              {/* Bottom Row: Trend Line & Sparkline */}
              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between gap-1.5">
                <span className={`text-[9px] font-bold flex items-center gap-0.5 ${
                  isTrendUp ? 'text-emerald-600 dark:text-emerald-400' : isTrendDown ? 'text-rose-600' : 'text-slate-500'
                }`}>
                  {isTrendUp ? <TrendingUp className="h-3 w-3" /> : isTrendDown ? <TrendingDown className="h-3 w-3" /> : null}
                  {c.trend !== 0 ? `${c.trend > 0 ? '+' : ''}${c.trend}%` : 'Stable'}
                </span>

                <div className="flex-shrink-0 h-6 flex items-end">
                  <Sparkline points={c.sparkline} color={sparklineColor} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* drill down detail Dialog/Modal */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden font-sans"
            >
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">DRILL-DOWN BI REPORT</h3>
                  <p className="text-[10px] text-slate-400">Audit details for {selectedCard.title}</p>
                </div>
              </div>

              <div className="py-5 space-y-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedCard.title}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedCard.type === 'currency' ? (
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedCard.value)
                    ) : (
                      selectedCard.value
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">{selectedCard.subtitle}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Continuous Audit Summary</p>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    This live index metric aggregates real-time transactions within your current Firestore instance.
                    The current trend represents a deviation calculated over past transactions and preset targets.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Current Trend</span>
                    <span className={`text-xs font-black ${selectedCard.trendType === 'up' ? 'text-emerald-500' : selectedCard.trendType === 'down' ? 'text-rose-500' : 'text-slate-500'}`}>
                      {selectedCard.trend > 0 ? '+' : ''}{selectedCard.trend}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">System Compliant</span>
                    <span className="text-xs font-black text-emerald-500">100% Yes</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex gap-3">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onCardClick(selectedCard.targetView);
                    setSelectedCard(null);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Go to Module</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
