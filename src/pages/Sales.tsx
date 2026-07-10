import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { SalesOrder, Customer, Warehouse, SalesReturn, SalesReturnItem, CustomerLedgerEntry, SalesHistoryEntry, InventoryRecord, Product, InventoryTransaction } from '../types';
import { generateBarcodeDataURL, generateQRDataURL } from '../utils/barcodes';
import { 
  Plus, Search, Eye, Trash2, ShieldCheck, FileDown, ArrowDownLeft, ArrowUpRight, 
  RotateCcw, Check, X, Box, Loader2, Warehouse as WarehouseIcon, AlertTriangle, 
  History, EyeOff, Calendar, Download, Printer, RefreshCw, BarChart3, TrendingUp,
  DollarSign, ShoppingBag, Layers, AlertCircle, Award, Sparkles, SlidersHorizontal, ChevronRight, FileSpreadsheet
} from 'lucide-react';

export const Sales: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  
  // Real-time collections states
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [returnsList, setReturnsList] = useState<SalesReturn[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'returns' | 'reports'>('dashboard');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');

  // Modal / Detailed states
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [barcodeQrUrls, setBarcodeQrUrls] = useState<{ barcode: string; qr: string } | null>(null);

  // Return Form State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<SalesOrder | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('Damage during delivery');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Store Credit'>('Store Credit');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Reports Generator state
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'customer' | 'profit' | 'return' | 'tax'>('daily');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Role permissions
  const isReadOnly = profile?.role === 'Staff';
  const canApprove = profile ? ['Super Admin', 'Admin', 'Manager'].includes(profile.role) : false;

  // Sync sales orders, returns, and other models
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubSales = onSnapshot(query(collection(db, 'sales_orders'), orderBy('createdAt', 'desc')), (snap) => {
      const list: SalesOrder[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SalesOrder));
      setSalesOrders(list);
    });

    const unsubReturns = onSnapshot(query(collection(db, 'sales_returns'), orderBy('createdAt', 'desc')), (snap) => {
      const list: SalesReturn[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SalesReturn));
      setReturnsList(list);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      const list: Customer[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Customer));
      setCustomers(list);
    });

    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snap) => {
      const list: Warehouse[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Warehouse));
      setWarehouses(list);
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      const list: InventoryRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as InventoryRecord));
      setInventory(list);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
      setLoading(false);
    });

    return () => {
      unsubSales();
      unsubReturns();
      unsubCustomers();
      unsubWarehouses();
      unsubInventory();
      unsubProducts();
    };
  }, [user]);

  // Handle invoice printable graphics generation
  const handleViewInvoice = async (order: SalesOrder) => {
    setSelectedOrder(order);
    try {
      const barcodeUrl = generateBarcodeDataURL(order.invoiceNumber);
      const qrUrl = await generateQRDataURL(`https://skyinventory.com/verify/invoice/${order.invoiceNumber}`);
      setBarcodeQrUrls({ barcode: barcodeUrl, qr: qrUrl });
      setInvoicePreviewOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Sales Return processor that automatically restores stocks
  const handleOpenReturnModal = (order: SalesOrder) => {
    setReturnOrder(order);
    const initialQty: Record<string, number> = {};
    order.items.forEach(item => {
      initialQty[item.productId] = 0; // default return qty is 0
    });
    setReturnQuantities(initialQty);
    setReturnReason('Goods arrived defective');
    setRefundMethod('Store Credit');
    setReturnModalOpen(true);
  };

  const handleReturnQtyChange = (productId: string, val: number, maxQty: number) => {
    const updated = { ...returnQuantities };
    updated[productId] = Math.min(maxQty, Math.max(0, val));
    setReturnQuantities(updated);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder) return;

    // Verify at least one item is being returned
    const returnItemsToProcess = Object.entries(returnQuantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([prodId, qty]) => {
        const originalItem = returnOrder.items.find(i => i.productId === prodId);
        const qVal = Number(qty);
        return {
          productId: prodId,
          productName: originalItem?.productName || '',
          sku: originalItem?.sku || '',
          returnQuantity: qVal,
          sellingPrice: originalItem?.sellingPrice || 0,
          subtotal: (originalItem?.sellingPrice || 0) * qVal
        } as SalesReturnItem;
      });

    if (returnItemsToProcess.length === 0) {
      setNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Please enter return quantities greater than 0 for at least one product.'
      });
      return;
    }

    setSubmittingReturn(true);
    try {
      const timestamp = new Date().toISOString();
      const creatorUid = user?.uid || 'unknown';
      const creatorName = profile?.fullName || 'Manager';
      
      const returnId = doc(collection(db, 'sales_returns')).id;
      const returnNumber = `SRET-${Math.floor(100000 + Math.random() * 900000)}`;

      const totalReturnQty = returnItemsToProcess.reduce((sum, item) => sum + item.returnQuantity, 0);
      const totalRefundAmount = returnItemsToProcess.reduce((sum, item) => sum + item.subtotal, 0);

      // Save Returns document
      const salesRetDoc: SalesReturn = {
        id: returnId,
        returnNumber,
        salesOrderId: returnOrder.id,
        salesNumber: returnOrder.salesNumber,
        customerId: returnOrder.customerId,
        customerName: returnOrder.customerName,
        items: returnItemsToProcess,
        returnQuantity: totalReturnQty,
        reason: returnReason,
        refundMethod,
        approvedBy: creatorUid,
        approvedByName: creatorName,
        returnDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
        status: 'Completed'
      };

      await setDoc(doc(db, 'sales_returns', returnId), salesRetDoc);

      // Automatically RESTORE stock back to inventory and products collections!
      for (const item of returnItemsToProcess) {
        // A. Update Inventory
        const invRecord = inventory.find(i => i.productId === item.productId);
        let nextStock = item.returnQuantity;
        if (invRecord) {
          nextStock = invRecord.currentStock + item.returnQuantity;
          const warehouseStocks = { ...invRecord.warehouseStock };
          // Add back to the warehouse that originally issued the sale
          const originalWhId = returnOrder.warehouseId;
          warehouseStocks[originalWhId] = (warehouseStocks[originalWhId] || 0) + item.returnQuantity;

          await updateDoc(doc(db, 'inventory', invRecord.id), {
            currentStock: nextStock,
            availableStock: nextStock,
            warehouseStock: warehouseStocks,
            stockStatus: nextStock > invRecord.minStockLevel ? 'In Stock' : 'Low Stock',
            lastStockUpdate: timestamp
          });
        }

        // B. Update Product Stock balances
        const prodMatch = products.find(p => p.id === item.productId);
        if (prodMatch) {
          await updateDoc(doc(db, 'products', prodMatch.id), {
            stockQuantity: (prodMatch.stockQuantity || 0) + item.returnQuantity,
            updatedAt: timestamp
          });
        }

        // C. Record Inventory Transaction
        const txRef = doc(collection(db, 'inventory_transactions'));
        const invTx: InventoryTransaction = {
          id: txRef.id,
          referenceNumber: returnNumber,
          transactionType: 'Stock In',
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          barcode: invRecord?.barcode || '',
          quantity: item.returnQuantity, // positive indicates addition back
          previousQuantity: invRecord?.currentStock || 0,
          newQuantity: nextStock,
          difference: item.returnQuantity,
          warehouseId: returnOrder.warehouseId,
          warehouseName: returnOrder.warehouseName,
          reason: 'Other',
          requestedBy: creatorUid,
          approvedBy: creatorUid,
          remarks: `Restored back under Return slip ${returnNumber} from Invoice ${returnOrder.invoiceNumber}`,
          user: creatorName,
          userId: creatorUid,
          role: profile?.role || 'Staff',
          date: timestamp.split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid,
          status: 'Completed'
        };
        await setDoc(txRef, invTx);
      }

      // D. Update Customer outstanding ledger balance (credit account if Store Credit or Refund)
      const matchedCustomer = customers.find(c => c.id === returnOrder.customerId);
      if (matchedCustomer) {
        const nextBalance = Math.max(0, matchedCustomer.currentBalance - totalRefundAmount);
        await updateDoc(doc(db, 'customers', matchedCustomer.id), {
          currentBalance: nextBalance,
          updatedAt: timestamp
        });

        // Write ledger entry
        const ledgerRef = doc(collection(db, 'customer_ledger'));
        const ledgerEntry: CustomerLedgerEntry = {
          id: ledgerRef.id,
          customerId: matchedCustomer.id,
          transactionType: 'Return',
          referenceId: returnId,
          referenceNumber: returnNumber,
          debit: 0,
          credit: totalRefundAmount, // credits reduce outstanding debit
          balanceAfter: nextBalance,
          description: `Credited $${totalRefundAmount.toFixed(2)} back on Return Slip ${returnNumber} for Invoice ${returnOrder.invoiceNumber}`,
          transactionDate: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid
        };
        await setDoc(ledgerRef, ledgerEntry);
      }

      // E. Update Sales Order status to Returned / Partially Returned
      const alreadyReturnedQty = returnOrder.items.reduce((sum, item) => {
        const isRet = returnItemsToProcess.find(r => r.productId === item.productId);
        return sum + (isRet ? isRet.returnQuantity : 0);
      }, 0);
      
      const totalPurchasedQty = returnOrder.items.reduce((sum, i) => sum + i.quantity, 0);
      const finalOrderStatus = alreadyReturnedQty >= totalPurchasedQty ? 'Returned' : 'Completed'; // simplified status tracker

      await updateDoc(doc(db, 'sales_orders', returnOrder.id), {
        salesStatus: finalOrderStatus,
        updatedAt: timestamp
      });

      // F. Write history audit log
      const histRef = doc(collection(db, 'sales_history'));
      await setDoc(histRef, {
        id: histRef.id,
        salesOrderId: returnOrder.id,
        salesNumber: returnOrder.salesNumber,
        action: 'Sale Returned',
        details: `Return slip ${returnNumber} processed for total $${totalRefundAmount.toFixed(2)}. Stock restored.`,
        operatorName: creatorName,
        operatorId: creatorUid,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
        status: 'Active'
      });

      setNotification({
        type: 'success',
        title: 'Return Completed',
        message: `Return slip ${returnNumber} successfully filed. Stock levels restored.`
      });

      setReturnModalOpen(false);
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', title: 'Submit Failed', message: 'Unable to process sales return.' });
    } finally {
      setSubmittingReturn(false);
    }
  };

  // --- REPORTS EXPORTS ---
  const handleExportCSV = (reportData: SalesOrder[]) => {
    if (reportData.length === 0) {
      setNotification({ type: 'error', title: 'No Data', message: 'No records match parameters to compile report.' });
      return;
    }

    const headers = ['Sales Number', 'Invoice Number', 'Customer', 'Warehouse', 'Salesperson', 'Grand Total ($)', 'Paid Amount ($)', 'Due Amount ($)', 'Net Profit ($)', 'Date'];
    const rows = reportData.map(o => [
      o.salesNumber,
      o.invoiceNumber,
      o.customerName,
      o.warehouseName,
      o.salespersonName,
      o.grandTotal.toFixed(2),
      o.paidAmount.toFixed(2),
      o.dueAmount.toFixed(2),
      o.netProfit.toFixed(2),
      new Date(o.salesDate).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SkyInventory_Sales_Report_${reportType}_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      type: 'success',
      title: 'CSV Downloaded',
      message: 'Your system sales report has been compiled and saved as CSV.'
    });
  };

  // Dashboard calculations
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const todaySales = salesOrders.filter(o => new Date(o.salesDate) >= todayStart && o.salesStatus !== 'Cancelled');
  const weeklySales = salesOrders.filter(o => new Date(o.salesDate) >= oneWeekAgo && o.salesStatus !== 'Cancelled');
  const monthSales = salesOrders.filter(o => new Date(o.salesDate) >= thisMonthStart && o.salesStatus !== 'Cancelled');
  const activeSales = salesOrders.filter(o => o.salesStatus !== 'Cancelled');

  const todayRevenue = todaySales.reduce((sum, o) => sum + o.grandTotal, 0);
  const weeklyRevenue = weeklySales.reduce((sum, o) => sum + o.grandTotal, 0);
  const monthRevenue = monthSales.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalRevenue = activeSales.reduce((sum, o) => sum + o.grandTotal, 0);
  
  const totalGrossProfit = activeSales.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
  const totalNetProfit = activeSales.reduce((sum, o) => sum + (o.netProfit || 0), 0);

  const totalSalesCount = activeSales.length;
  const pendingOrdersCount = salesOrders.filter(o => o.salesStatus === 'Pending' || o.salesStatus === 'Draft').length;
  const completedOrdersCount = salesOrders.filter(o => o.salesStatus === 'Completed').length;
  const cancelledOrdersCount = salesOrders.filter(o => o.salesStatus === 'Cancelled').length;
  const returnedOrdersCount = salesOrders.filter(o => o.salesStatus === 'Returned').length;

  // Filtered orders list
  const filteredOrders = salesOrders.filter(order => {
    const matchesSearch = order.salesNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.salespersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || order.salesStatus === statusFilter;
    const matchesPayment = paymentFilter === 'All' || order.paymentStatus === paymentFilter;
    const matchesWarehouse = warehouseFilter === 'All' || order.warehouseId === warehouseFilter;

    return matchesSearch && matchesStatus && matchesPayment && matchesWarehouse;
  });

  // Report filters compiling
  const reportsData = salesOrders.filter(order => {
    const orderDate = new Date(order.salesDate).toISOString().slice(0, 10);
    const matchesDate = orderDate >= reportStartDate && orderDate <= reportEndDate;
    if (!matchesDate) return false;

    if (reportType === 'profit') return order.salesStatus !== 'Cancelled';
    if (reportType === 'return') return order.salesStatus === 'Returned';
    if (reportType === 'tax') return order.vatAmount > 0 || order.taxAmount > 0;
    return true; // daily, monthly, customer
  });

  return (
    <div className="space-y-6">
      
      {/* TABS SELECTOR */}
      <div className="flex flex-wrap border-b border-slate-800">
        {[
          { id: 'dashboard', label: 'Sales Dashboard', icon: BarChart3 },
          { id: 'orders', label: 'Sales Orders / Invoices', icon: ShoppingBag },
          { id: 'returns', label: 'Sales Returns', icon: RotateCcw },
          { id: 'reports', label: 'Financial & Tax Reports', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4.5 w-4.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI grid stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* Today's Sales Revenue */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Today's Sales</span>
                <div className="h-7 w-7 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-white block">
                  ${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {todaySales.length} orders today
                </span>
              </div>
            </div>

            {/* Weekly Sales */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Weekly Sales</span>
                <div className="h-7 w-7 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-white block">
                  ${weeklyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {weeklySales.length} orders in 7 days
                </span>
              </div>
            </div>

            {/* Monthly Sales */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Monthly Sales</span>
                <div className="h-7 w-7 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-blue-400 block">
                  ${monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {monthSales.length} orders this month
                </span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Total Revenue</span>
                <div className="h-7 w-7 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-purple-400 block">
                  ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Gross sales revenue
                </span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Gross Profit</span>
                <div className="h-7 w-7 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-emerald-400 block">
                  ${totalGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Markup margin total
                </span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Net Profit</span>
                <div className="h-7 w-7 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-amber-400 block">
                  ${totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Adjusted net profit
                </span>
              </div>
            </div>

          </div>

          {/* Operational status details */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Sales', count: totalSalesCount, color: 'text-white bg-slate-900/60 border-slate-800' },
              { label: 'Pending Orders', count: pendingOrdersCount, color: 'text-amber-400 bg-amber-950/10 border-amber-950/30' },
              { label: 'Completed Orders', count: completedOrdersCount, color: 'text-emerald-400 bg-emerald-950/10 border-emerald-950/30' },
              { label: 'Cancelled Orders', count: cancelledOrdersCount, color: 'text-rose-400 bg-rose-950/10 border-rose-950/30' },
              { label: 'Returned Orders', count: returnedOrdersCount, color: 'text-cyan-400 bg-cyan-950/10 border-cyan-950/30' }
            ].map((stat, i) => (
              <div key={i} className={`border p-4 rounded-xl text-center ${stat.color}`}>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">{stat.label}</span>
                <span className="text-xl font-bold mt-1.5 block">{stat.count}</span>
              </div>
            ))}
          </div>

          {/* Quick Recent Activity list */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-5">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-1.5">
              <History className="h-4.5 w-4.5 text-blue-400" /> Recent Sales Activity Stream
            </h3>
            <div className="divide-y divide-slate-850">
              {salesOrders.slice(0, 5).map(o => (
                <div key={o.id} className="py-3 flex items-center justify-between text-xs text-zinc-400">
                  <div>
                    <span className="font-bold text-white block">{o.customerName}</span>
                    <span className="font-mono text-[10px] text-zinc-500 mt-0.5 block">{o.invoiceNumber} | {o.warehouseName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-blue-400 block">${o.grandTotal.toFixed(2)}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{new Date(o.salesDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SALES ORDERS / INVOICES BROWSER TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Controls Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search orders..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="bg-slate-950 border border-slate-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Order Status</option>
              <option value="Completed">Completed Only</option>
              <option value="Returned">Returned</option>
              <option value="Cancelled">Cancelled Only</option>
            </select>

            <select
              className="bg-slate-950 border border-slate-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="All">All Payments</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Payments</option>
              <option value="Unpaid">Unpaid</option>
            </select>

            <select
              className="bg-slate-950 border border-slate-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="All">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Orders Listing Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <ShoppingBag className="h-12 w-12 text-slate-800 mb-3" />
                <span className="font-bold">No sales orders registered</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="text-xs text-zinc-400 bg-slate-950 border-b border-slate-800 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Invoice details</th>
                      <th className="px-5 py-4">Client</th>
                      <th className="px-5 py-4">Warehouse</th>
                      <th className="px-5 py-4 text-right">Invoice Total</th>
                      <th className="px-5 py-4 text-right">Paid</th>
                      <th className="px-5 py-4 text-right">Due</th>
                      <th className="px-5 py-4">Order Status</th>
                      <th className="px-5 py-4">Payment</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-950/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{order.invoiceNumber}</div>
                          <span className="text-zinc-500 font-mono text-[10px] block mt-0.5">{order.salesNumber} | {new Date(order.salesDate).toLocaleDateString()}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-300">
                          {order.customerName}
                        </td>
                        <td className="px-5 py-4 text-zinc-400 text-xs">
                          {order.warehouseName}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-white font-mono">
                          ${order.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-400 font-mono">
                          ${order.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-rose-400 font-mono">
                          ${order.dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${
                            order.salesStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            order.salesStatus === 'Returned' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {order.salesStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${
                            order.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            order.paymentStatus === 'Partial' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Print Invoice / Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {order.salesStatus === 'Completed' && !isReadOnly && (
                              <button
                                onClick={() => handleOpenReturnModal(order)}
                                className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                                title="File Return"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SALES RETURNS LISTING TAB */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Sales Returns Ledger</h3>
            <span className="text-xs text-zinc-500 font-mono">Filing and inventory audit history</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {returnsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <RotateCcw className="h-12 w-12 text-slate-800 mb-3" />
                <span className="font-bold">No sales returns filed yet</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="text-xs text-zinc-400 bg-slate-950 border-b border-slate-800 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Return Number</th>
                      <th className="px-5 py-4">Original Invoice</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4">Refund Method</th>
                      <th className="px-5 py-4 text-right">Items Returned</th>
                      <th className="px-5 py-4 text-right">Date Filed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {returnsList.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-950/40 transition">
                        <td className="px-5 py-4 font-mono font-bold text-white">
                          {ret.returnNumber}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-zinc-400">
                          {ret.salesNumber}
                        </td>
                        <td className="px-5 py-4 font-bold text-zinc-300">
                          {ret.customerName}
                        </td>
                        <td className="px-5 py-4 text-zinc-400 text-xs">
                          {ret.reason}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {ret.refundMethod}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-amber-500">
                          {ret.returnQuantity} units
                        </td>
                        <td className="px-5 py-4 text-right text-zinc-500 text-xs font-mono">
                          {new Date(ret.returnDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORTS GENERATOR TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Form setup */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Report Type</label>
              <select
                className="w-full bg-slate-950 border border-slate-850 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
              >
                <option value="daily">Daily Sales report</option>
                <option value="monthly">Monthly Sales report</option>
                <option value="profit">Profitability report</option>
                <option value="return">Returns report</option>
                <option value="tax">Tax report (VAT / Tax)</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Start Date</label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-850 text-white text-sm rounded-lg px-3 py-2 focus:outline-none font-mono"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">End Date</label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-850 text-white text-sm rounded-lg px-3 py-2 focus:outline-none font-mono"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                onClick={() => handleExportCSV(reportsData)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-600/15"
              >
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Compilation preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Compiled Preview ({reportsData.length} entries matching)</h3>
              <span className="text-zinc-500 text-xs font-mono font-bold">UTC: {reportStartDate} to {reportEndDate}</span>
            </div>

            {reportsData.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <AlertCircle className="h-10 w-10 mx-auto text-slate-800 mb-2" />
                <span className="text-sm">No transaction ledger records fit designated filters</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase block">Aggregated Revenues</span>
                    <span className="text-xl font-bold text-white font-mono mt-1 block">
                      ${reportsData.reduce((sum, o) => sum + o.grandTotal, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase block">Estimated Net Profit</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                      ${reportsData.reduce((sum, o) => sum + (o.netProfit || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl text-center">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase block">VAT / Tax collected</span>
                    <span className="text-xl font-bold text-purple-400 font-mono mt-1 block">
                      ${reportsData.reduce((sum, o) => sum + (o.vatAmount || 0) + (o.taxAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-slate-950 text-zinc-400 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Invoice</th>
                        <th className="px-4 py-2.5">Client</th>
                        <th className="px-4 py-2.5 text-right">Grand Total</th>
                        <th className="px-4 py-2.5 text-right">Net Profit</th>
                        <th className="px-4 py-2.5 text-right">VAT/Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {reportsData.map(o => (
                        <tr key={o.id}>
                          <td className="px-4 py-2 font-mono">{new Date(o.salesDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2 font-mono font-bold text-white">{o.invoiceNumber}</td>
                          <td className="px-4 py-2">{o.customerName}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold">${o.grandTotal.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-400">${(o.netProfit || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono text-purple-400">${((o.vatAmount || 0) + (o.taxAmount || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SALES INVOICE THERMAL MODAL PREVIEW */}
      {invoicePreviewOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-xl w-full max-w-sm flex flex-col p-6 shadow-2xl relative">
            <button
              onClick={() => setInvoicePreviewOpen(false)}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100 transition print:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Print Header */}
            <div className="text-center pb-4 border-b border-dashed border-zinc-300">
              <h2 className="text-lg font-black tracking-tight uppercase">Sky Inventory Pro</h2>
              <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Enterprise Logistics System</p>
              <p className="text-[9px] text-zinc-400 mt-1 font-mono">123 Logistics Way, City, Earth</p>
              <p className="text-[9px] text-zinc-400 font-mono">Phone: +1 (555) SKY-PRO1</p>
            </div>

            {/* Invoice Details */}
            <div className="py-3 text-[10px] space-y-1 font-mono border-b border-dashed border-zinc-300">
              <div className="flex justify-between">
                <span>INVOICE NO:</span>
                <span className="font-bold">{selectedOrder.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(selectedOrder.salesDate).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>SALESPERSON:</span>
                <span>{selectedOrder.salespersonName}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-bold">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>WAREHOUSE:</span>
                <span>{selectedOrder.warehouseName}</span>
              </div>
            </div>

            {/* Thermal Product list table */}
            <div className="py-3 border-b border-dashed border-zinc-300 text-[10px]">
              <div className="grid grid-cols-4 font-bold border-b border-zinc-200 pb-1 mb-1 font-mono">
                <span className="col-span-2">Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
              </div>
              
              <div className="space-y-2 font-mono">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4">
                    <div className="col-span-2">
                      <span className="font-bold block">{item.productName}</span>
                      <span className="text-[8px] text-zinc-400">{item.sku}</span>
                    </div>
                    <span className="text-center font-bold">x{item.quantity}</span>
                    <span className="text-right font-bold">${(item.sellingPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-3 font-mono text-[10px] space-y-1.5 border-b border-dashed border-zinc-300">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-zinc-500 font-bold">
                  <span>DISCOUNT:</span>
                  <span>-${selectedOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT ({selectedOrder.items[0]?.vat || 5}%):</span>
                <span>+${selectedOrder.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TAX ({selectedOrder.items[0]?.tax || 2}%):</span>
                <span>+${selectedOrder.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black border-t border-zinc-200 pt-1.5">
                <span>GRAND TOTAL:</span>
                <span>${selectedOrder.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 font-bold">
                <span>PAID AMOUNT:</span>
                <span>${selectedOrder.paidAmount.toFixed(2)}</span>
              </div>
              {selectedOrder.dueAmount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>DUE BALANCE:</span>
                  <span>${selectedOrder.dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Barcode & QR Code Base64 Render */}
            {barcodeQrUrls && (
              <div className="py-4 flex flex-col items-center justify-center gap-3">
                <img 
                  src={barcodeQrUrls.barcode} 
                  alt="Barcode" 
                  className="h-10 w-44 object-contain"
                />
                <img 
                  src={barcodeQrUrls.qr} 
                  alt="QR Verification" 
                  className="h-20 w-20 object-contain border border-zinc-200 p-1"
                />
                <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-400 mt-1">
                  VERIFY INVOICE SECURELY
                </span>
              </div>
            )}

            {/* Signature Area */}
            <div className="pt-6 pb-2 grid grid-cols-2 gap-4 text-center text-[8px] font-mono text-zinc-400 border-t border-dashed border-zinc-200">
              <div>
                <div className="h-6 border-b border-zinc-300 mb-1"></div>
                <span>Customer Signature</span>
              </div>
              <div>
                <div className="h-6 border-b border-zinc-300 mb-1"></div>
                <span>Cashier Signature</span>
              </div>
            </div>

            {/* Terms and Conditions */}
            <p className="text-[7px] text-zinc-400 text-center font-mono mt-3 leading-tight">
              Thank you for shopping with Sky Inventory Pro. Registered returns are accepted within 7 days with invoice slip and original packaging.
            </p>

            {/* Print button footer for screen use */}
            <div className="mt-4 flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="h-3.5 w-3.5" /> Print Thermal Slip
              </button>
              <button
                onClick={() => setInvoicePreviewOpen(false)}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs py-2 px-3 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES RETURN PROCESSOR MODAL */}
      {returnModalOpen && returnOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <RotateCcw className="h-5 w-5 text-amber-500" />
                Process Sales Return - {returnOrder.invoiceNumber}
              </h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-zinc-500 hover:text-white p-1 hover:bg-slate-800 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 text-xs text-zinc-400">
                <span className="font-bold text-white block mb-1">Customer Info</span>
                <span>{returnOrder.customerName} | {returnOrder.warehouseName}</span>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase block">Product Quantities to Return</label>
                <div className="space-y-2 border border-slate-850 rounded-lg p-2 max-h-[220px] overflow-y-auto">
                  {returnOrder.items.map(item => (
                    <div key={item.productId} className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-white block">{item.productName}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Purchased: {item.quantity} {item.unit || 'units'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-bold">Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          className="w-16 bg-slate-950 border border-slate-800 rounded font-mono text-center text-white p-1"
                          value={returnQuantities[item.productId] || 0}
                          onChange={(e) => handleReturnQtyChange(item.productId, Number(e.target.value), item.quantity)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Reason for Return</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Damage during delivery">Defective / Damaged</option>
                    <option value="Wrong item ordered">Customer changed mind</option>
                    <option value="Wrong product delivered">Incorrect order shipment</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Refund Method</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                  >
                    <option value="Store Credit">Store Credit (Re-credit ledger)</option>
                    <option value="Cash">Cash Handout</option>
                    <option value="Card">Card Refund</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-zinc-400 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-amber-600/15"
                >
                  {submittingReturn && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  Confirm Return & Restore Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
