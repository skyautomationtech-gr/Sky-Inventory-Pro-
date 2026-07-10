import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, Plus, Minus, Settings, Search, FileDown, ArrowDownLeft, ArrowUpRight, 
  RefreshCw, Check, X, Box, Loader2, Warehouse as WarehouseIcon, AlertTriangle, 
  History, SlidersHorizontal, Eye, ShieldAlert, Barcode, Calendar, Download, Printer 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, setDoc, getDocs, getDoc 
} from 'firebase/firestore';
import { 
  InventoryRecord, Product, Warehouse, InventoryTransaction, StockAdjustment, InventoryNotification 
} from '../types';
import { recalculateAndSyncStats } from '../utils/stats';

export const InventoryPage: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  
  // Collections states
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stocks' | 'transactions' | 'adjustments'>('stocks');
  
  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [txTypeFilter, setTxTypeFilter] = useState('All');

  // Modals States
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryRecord | null>(null);

  // Stock In Form Fields
  const [inProduct, setInProduct] = useState('');
  const [inSupplier, setInSupplier] = useState('');
  const [inQty, setInQty] = useState('');
  const [inCost, setInCost] = useState('');
  const [inBatch, setInBatch] = useState('');
  const [inMfgDate, setInMfgDate] = useState('');
  const [inExpiryDate, setInExpiryDate] = useState('');
  const [inWarehouse, setInWarehouse] = useState('');
  const [inReceivedBy, setInReceivedBy] = useState('');
  const [inRemarks, setInRemarks] = useState('');
  const [inRef, setInRef] = useState('');

  // Stock Out Form Fields
  const [outProduct, setOutProduct] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outWarehouse, setOutWarehouse] = useState('');
  const [outReason, setOutReason] = useState<'Sales' | 'Sample' | 'Damage' | 'Adjustment' | 'Transfer' | 'Other'>('Sales');
  const [outRequestedBy, setOutRequestedBy] = useState('');
  const [outApprovedBy, setOutApprovedBy] = useState('');
  const [outRemarks, setOutRemarks] = useState('');
  const [outRef, setOutRef] = useState('');

  // Stock Adjustment Form Fields
  const [adjProduct, setAdjProduct] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjApproval, setAdjApproval] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjRef, setAdjRef] = useState('');

  const isReadOnly = profile?.role === 'Staff';

  // Load Real-time Data
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), orderBy('productName', 'asc')), (snap) => {
      const list: InventoryRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as InventoryRecord);
      });
      setInventory(list);
    }, (err) => {
      console.error(err);
      try { handleFirestoreError(err, OperationType.LIST, 'inventory'); } catch (e) {}
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name', 'asc')), (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(list);
    }, (err) => {
      console.error(err);
    });

    const unsubWarehouses = onSnapshot(query(collection(db, 'warehouses'), orderBy('name', 'asc')), (snap) => {
      const list: Warehouse[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Warehouse);
      });
      setWarehouses(list);
    }, (err) => {
      console.error(err);
    });

    const unsubTransactions = onSnapshot(query(collection(db, 'inventory_transactions'), orderBy('createdAt', 'desc')), (snap) => {
      const list: InventoryTransaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as InventoryTransaction);
      });
      setTransactions(list);
    }, (err) => {
      console.error(err);
    });

    const unsubAdjustments = onSnapshot(query(collection(db, 'stock_adjustments'), orderBy('createdAt', 'desc')), (snap) => {
      const list: StockAdjustment[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as StockAdjustment);
      });
      setAdjustments(list);
    }, (err) => {
      console.error(err);
    });

    setLoading(false);

    return () => {
      unsubInventory();
      unsubProducts();
      unsubWarehouses();
      unsubTransactions();
      unsubAdjustments();
    };
  }, [user]);

  // Seed on-demand Inventory Records for products that don't have one
  useEffect(() => {
    if (products.length > 0 && warehouses.length > 0 && !loading) {
      const missingProducts = products.filter(p => !inventory.some(i => i.id === p.id));
      if (missingProducts.length > 0) {
        const defaultWarehouse = warehouses[0].id;
        missingProducts.forEach(async (p) => {
          try {
            const inventoryDocRef = doc(db, 'inventory', p.id);
            const initialRec: InventoryRecord = {
              id: p.id,
              productId: p.id,
              productName: p.name,
              sku: p.sku,
              barcode: p.barcode,
              category: p.category || 'General',
              supplier: p.supplier || 'N/A',
              currentStock: p.stockQuantity || 0,
              availableStock: p.stockQuantity || 0,
              reservedStock: 0,
              damagedStock: 0,
              returnedStock: 0,
              warehouseStock: { [defaultWarehouse]: p.stockQuantity || 0 },
              minStockLevel: p.lowStockLimit || 10,
              maxStockLevel: (p.lowStockLimit || 10) * 10,
              reorderLevel: (p.lowStockLimit || 10) * 1.5,
              safetyStock: Math.ceil((p.lowStockLimit || 10) * 0.3),
              lastStockUpdate: new Date().toISOString(),
              stockStatus: (p.stockQuantity || 0) <= 0 
                ? 'Out of Stock' 
                : (p.stockQuantity || 0) <= (p.lowStockLimit || 10) 
                  ? 'Low Stock' 
                  : 'In Stock',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: user?.uid || '',
              status: 'Active'
            };
            await setDoc(inventoryDocRef, initialRec);
          } catch (e) {
            console.error('Failed to auto-seed InventoryRecord for product:', p.name, e);
          }
        });
      }
    }
  }, [products, warehouses, inventory, loading]);

  // Form helper generators
  const generateRef = (prefix: string) => {
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setNotification({ type: 'error', message: 'Staff users have read-only access.' });
      return;
    }

    if (!inProduct || !inQty || !inWarehouse) {
      setNotification({ type: 'error', message: 'Product, Warehouse, and Quantity are required.' });
      return;
    }

    const qtyVal = Number(inQty);
    const costVal = Number(inCost) || 0;
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setNotification({ type: 'error', message: 'Quantity must be a positive number.' });
      return;
    }

    try {
      const selectedProductDoc = products.find(p => p.id === inProduct);
      const targetWhName = warehouses.find(w => w.id === inWarehouse)?.name || 'Default Warehouse';
      const referenceNo = inRef || generateRef('STK-IN');

      const invRecord = inventory.find(i => i.id === inProduct);
      
      const prevQty = invRecord ? invRecord.currentStock : 0;
      const newQty = prevQty + qtyVal;

      const updatedWarehouseStock = { ...(invRecord?.warehouseStock || {}) };
      updatedWarehouseStock[inWarehouse] = (updatedWarehouseStock[inWarehouse] || 0) + qtyVal;

      const minLvl = invRecord?.minStockLevel || selectedProductDoc?.lowStockLimit || 10;
      let newStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock' = 'In Stock';
      if (newQty <= 0) newStatus = 'Out of Stock';
      else if (newQty <= minLvl * 0.5) newStatus = 'Critical Stock';
      else if (newQty <= minLvl) newStatus = 'Low Stock';

      // Update Inventory Record
      const invRef = doc(db, 'inventory', inProduct);
      await updateDoc(invRef, {
        currentStock: newQty,
        availableStock: newQty - (invRecord?.reservedStock || 0),
        warehouseStock: updatedWarehouseStock,
        lastStockUpdate: new Date().toISOString(),
        stockStatus: newStatus,
        referenceNumber: referenceNo,
        updatedAt: new Date().toISOString()
      });

      // Update Catalog Product Total Quantity to stay in perfect sync
      const prodRef = doc(db, 'products', inProduct);
      await updateDoc(prodRef, {
        stockQuantity: newQty,
        updatedAt: new Date().toISOString()
      });

      // Insert Transaction Document
      const txDocRef = doc(collection(db, 'inventory_transactions'));
      await setDoc(txDocRef, {
        id: txDocRef.id,
        referenceNumber: referenceNo,
        transactionType: 'Stock In',
        productId: inProduct,
        productName: selectedProductDoc?.name || invRecord?.productName || 'Unknown Product',
        sku: selectedProductDoc?.sku || invRecord?.sku || '',
        barcode: selectedProductDoc?.barcode || invRecord?.barcode || '',
        quantity: qtyVal,
        previousQuantity: prevQty,
        newQuantity: newQty,
        difference: qtyVal,
        purchaseCost: costVal,
        batchNumber: inBatch || 'N/A',
        manufacturingDate: inMfgDate || '',
        expiryDate: inExpiryDate || '',
        warehouseId: inWarehouse,
        warehouseName: targetWhName,
        requestedBy: profile?.fullName || 'Operator',
        approvedBy: profile?.fullName || 'Operator',
        receivedBy: inReceivedBy || profile?.fullName || 'Operator',
        remarks: inRemarks || 'Standard warehouse stock in intake',
        user: profile?.fullName || '',
        userId: user?.uid || '',
        role: profile?.role || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed'
      });

      // Log to General Activity logs
      await addDoc(collection(db, 'activity_logs'), {
        id: doc(collection(db, 'activity_logs')).id,
        uid: user?.uid || '',
        userName: profile?.fullName || '',
        userRole: profile?.role || '',
        action: 'Stock In Recorded',
        details: `Inbounded ${qtyVal} units of "${selectedProductDoc?.name}" into ${targetWhName}`,
        timestamp: new Date().toISOString()
      });

      // Notifications trigger if large movement
      if (qtyVal >= 100) {
        const notifDocRef = doc(collection(db, 'inventory_notifications'));
        await setDoc(notifDocRef, {
          id: notifDocRef.id,
          type: 'large_movement',
          productId: inProduct,
          productName: selectedProductDoc?.name || '',
          sku: selectedProductDoc?.sku || '',
          message: `Large inbound detected: +${qtyVal} units of "${selectedProductDoc?.name}" received.`,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          status: 'Active'
        });
      }

      setNotification({ type: 'success', message: `Stock In verified successfully. Reference: ${referenceNo}` });
      setIsStockInOpen(false);
      resetStockInForm();
      recalculateAndSyncStats();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Unable to log stock in transaction.' });
    }
  };

  const resetStockInForm = () => {
    setInProduct('');
    setInSupplier('');
    setInQty('');
    setInCost('');
    setInBatch('');
    setInMfgDate('');
    setInExpiryDate('');
    setInWarehouse('');
    setInReceivedBy('');
    setInRemarks('');
    setInRef('');
  };

  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setNotification({ type: 'error', message: 'Staff users have read-only access.' });
      return;
    }

    if (!outProduct || !outQty || !outWarehouse) {
      setNotification({ type: 'error', message: 'Product, Warehouse, and Quantity are required.' });
      return;
    }

    const qtyVal = Number(outQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setNotification({ type: 'error', message: 'Quantity must be a positive number.' });
      return;
    }

    const invRecord = inventory.find(i => i.id === outProduct);
    const warehouseStockQty = invRecord?.warehouseStock?.[outWarehouse] || 0;

    if (warehouseStockQty < qtyVal) {
      setNotification({ 
        type: 'error', 
        message: `Insufficient stock in selected warehouse. Available: ${warehouseStockQty} units.` 
      });
      return;
    }

    try {
      const selectedProductDoc = products.find(p => p.id === outProduct);
      const srcWhName = warehouses.find(w => w.id === outWarehouse)?.name || 'Default Warehouse';
      const referenceNo = outRef || generateRef('STK-OUT');

      const prevQty = invRecord ? invRecord.currentStock : 0;
      const newQty = prevQty - qtyVal;

      const updatedWarehouseStock = { ...(invRecord?.warehouseStock || {}) };
      updatedWarehouseStock[outWarehouse] = warehouseStockQty - qtyVal;

      const minLvl = invRecord?.minStockLevel || selectedProductDoc?.lowStockLimit || 10;
      let newStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock' = 'In Stock';
      if (newQty <= 0) newStatus = 'Out of Stock';
      else if (newQty <= minLvl * 0.5) newStatus = 'Critical Stock';
      else if (newQty <= minLvl) newStatus = 'Low Stock';

      // Update Inventory Record
      const invRef = doc(db, 'inventory', outProduct);
      await updateDoc(invRef, {
        currentStock: newQty,
        availableStock: newQty - (invRecord?.reservedStock || 0),
        warehouseStock: updatedWarehouseStock,
        lastStockUpdate: new Date().toISOString(),
        stockStatus: newStatus,
        referenceNumber: referenceNo,
        updatedAt: new Date().toISOString()
      });

      // Update Catalog Product Total Quantity
      const prodRef = doc(db, 'products', outProduct);
      await updateDoc(prodRef, {
        stockQuantity: newQty,
        updatedAt: new Date().toISOString()
      });

      // Insert Transaction Document
      const txDocRef = doc(collection(db, 'inventory_transactions'));
      await setDoc(txDocRef, {
        id: txDocRef.id,
        referenceNumber: referenceNo,
        transactionType: 'Stock Out',
        productId: outProduct,
        productName: selectedProductDoc?.name || invRecord?.productName || 'Unknown Product',
        sku: selectedProductDoc?.sku || invRecord?.sku || '',
        barcode: selectedProductDoc?.barcode || invRecord?.barcode || '',
        quantity: qtyVal,
        previousQuantity: prevQty,
        newQuantity: newQty,
        difference: -qtyVal,
        warehouseId: outWarehouse,
        warehouseName: srcWhName,
        reason: outReason,
        requestedBy: outRequestedBy || profile?.fullName || 'Operator',
        approvedBy: outApprovedBy || profile?.fullName || 'Manager',
        remarks: outRemarks || 'Standard dispatch outbound stock',
        user: profile?.fullName || '',
        userId: user?.uid || '',
        role: profile?.role || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed'
      });

      // Log to General Activity logs
      await addDoc(collection(db, 'activity_logs'), {
        id: doc(collection(db, 'activity_logs')).id,
        uid: user?.uid || '',
        userName: profile?.fullName || '',
        userRole: profile?.role || '',
        action: 'Stock Out Recorded',
        details: `Dispatched ${qtyVal} units of "${selectedProductDoc?.name}" from ${srcWhName}`,
        timestamp: new Date().toISOString()
      });

      // Verify Alerts and Stock Thresholds
      if (newQty <= 0) {
        const notifDocRef = doc(collection(db, 'inventory_notifications'));
        await setDoc(notifDocRef, {
          id: notifDocRef.id,
          type: 'out_of_stock',
          productId: outProduct,
          productName: selectedProductDoc?.name || '',
          sku: selectedProductDoc?.sku || '',
          message: `Alert: "${selectedProductDoc?.name}" is completely out of stock!`,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          status: 'Active'
        });
      } else if (newQty <= minLvl) {
        const notifDocRef = doc(collection(db, 'inventory_notifications'));
        await setDoc(notifDocRef, {
          id: notifDocRef.id,
          type: 'low_stock',
          productId: outProduct,
          productName: selectedProductDoc?.name || '',
          sku: selectedProductDoc?.sku || '',
          message: `Warning: "${selectedProductDoc?.name}" has fallen into low stock thresholds (${newQty} units).`,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          status: 'Active'
        });
      }

      setNotification({ type: 'success', message: `Stock Out verified successfully. Reference: ${referenceNo}` });
      setIsStockOutOpen(false);
      resetStockOutForm();
      recalculateAndSyncStats();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Unable to register outbound stock.' });
    }
  };

  const resetStockOutForm = () => {
    setOutProduct('');
    setOutQty('');
    setOutWarehouse('');
    setOutReason('Sales');
    setOutRequestedBy('');
    setOutApprovedBy('');
    setOutRemarks('');
    setOutRef('');
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setNotification({ type: 'error', message: 'Staff users have read-only access.' });
      return;
    }

    if (!adjProduct || !adjWarehouse || !adjQty) {
      setNotification({ type: 'error', message: 'Product, Warehouse, and Adjustment Target Quantity are required.' });
      return;
    }

    const targetQtyVal = Number(adjQty);
    if (isNaN(targetQtyVal) || targetQtyVal < 0) {
      setNotification({ type: 'error', message: 'Adjusted Quantity must be a valid non-negative integer.' });
      return;
    }

    try {
      const selectedProductDoc = products.find(p => p.id === adjProduct);
      const srcWhName = warehouses.find(w => w.id === adjWarehouse)?.name || 'Default Warehouse';
      const referenceNo = adjRef || generateRef('ADJ');

      const invRecord = inventory.find(i => i.id === adjProduct);
      const previousWhQty = invRecord?.warehouseStock?.[adjWarehouse] || 0;
      const difference = targetQtyVal - previousWhQty;

      const prevQty = invRecord ? invRecord.currentStock : 0;
      const newQty = prevQty + difference;

      const updatedWarehouseStock = { ...(invRecord?.warehouseStock || {}) };
      updatedWarehouseStock[adjWarehouse] = targetQtyVal;

      const minLvl = invRecord?.minStockLevel || selectedProductDoc?.lowStockLimit || 10;
      let newStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock' = 'In Stock';
      if (newQty <= 0) newStatus = 'Out of Stock';
      else if (newQty <= minLvl * 0.5) newStatus = 'Critical Stock';
      else if (newQty <= minLvl) newStatus = 'Low Stock';

      // Update Inventory Record
      const invRef = doc(db, 'inventory', adjProduct);
      await updateDoc(invRef, {
        currentStock: newQty,
        availableStock: newQty - (invRecord?.reservedStock || 0),
        warehouseStock: updatedWarehouseStock,
        lastStockUpdate: new Date().toISOString(),
        stockStatus: newStatus,
        referenceNumber: referenceNo,
        updatedAt: new Date().toISOString()
      });

      // Update Catalog Product Total Quantity
      const prodRef = doc(db, 'products', adjProduct);
      await updateDoc(prodRef, {
        stockQuantity: newQty,
        updatedAt: new Date().toISOString()
      });

      // Insert Adjustment Record
      const adjDocRef = doc(collection(db, 'stock_adjustments'));
      await setDoc(adjDocRef, {
        id: adjDocRef.id,
        referenceNumber: referenceNo,
        productId: adjProduct,
        productName: selectedProductDoc?.name || invRecord?.productName || 'Unknown Product',
        sku: selectedProductDoc?.sku || invRecord?.sku || '',
        reason: adjReason || 'Cycle Count discrepancy resolution',
        approval: adjApproval || profile?.fullName || 'Manager',
        notes: adjNotes || 'Standard adjustment transaction',
        beforeQuantity: previousWhQty,
        afterQuantity: targetQtyVal,
        difference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Approved'
      });

      // Log Transaction for general history logs
      const txDocRef = doc(collection(db, 'inventory_transactions'));
      await setDoc(txDocRef, {
        id: txDocRef.id,
        referenceNumber: referenceNo,
        transactionType: 'Adjustment',
        productId: adjProduct,
        productName: selectedProductDoc?.name || invRecord?.productName || 'Unknown Product',
        sku: selectedProductDoc?.sku || invRecord?.sku || '',
        barcode: selectedProductDoc?.barcode || invRecord?.barcode || '',
        quantity: Math.abs(difference),
        previousQuantity: prevQty,
        newQuantity: newQty,
        difference,
        warehouseId: adjWarehouse,
        warehouseName: srcWhName,
        reason: 'Adjustment',
        requestedBy: profile?.fullName || 'Operator',
        approvedBy: adjApproval || profile?.fullName || 'Manager',
        remarks: `Manual Stock override in ${srcWhName}. Reason: ${adjReason}`,
        user: profile?.fullName || '',
        userId: user?.uid || '',
        role: profile?.role || '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed'
      });

      // Add to general activity logs
      await addDoc(collection(db, 'activity_logs'), {
        id: doc(collection(db, 'activity_logs')).id,
        uid: user?.uid || '',
        userName: profile?.fullName || '',
        userRole: profile?.role || '',
        action: 'Inventory Adjustment Logged',
        details: `Adjusted "${selectedProductDoc?.name}" inside ${srcWhName} from ${previousWhQty} to ${targetQtyVal} units.`,
        timestamp: new Date().toISOString()
      });

      setNotification({ type: 'success', message: `Stock adjusted successfully. Reference: ${referenceNo}` });
      setIsAdjustmentOpen(false);
      resetAdjustmentForm();
      recalculateAndSyncStats();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to record stock adjustment override.' });
    }
  };

  const resetAdjustmentForm = () => {
    setAdjProduct('');
    setAdjWarehouse('');
    setAdjQty('');
    setAdjReason('');
    setAdjApproval('');
    setAdjNotes('');
    setAdjRef('');
  };

  // Export functions (CSV format)
  const handleExportCSV = () => {
    try {
      let headers = '';
      let rows = '';

      if (activeTab === 'stocks') {
        headers = 'Product Name,SKU,Barcode,Category,Overall Stock,Available Stock,Reserved,Damaged,Status,Last Updated\n';
        filteredInventory.forEach(item => {
          rows += `"${item.productName}","${item.sku}","${item.barcode}","${item.category}",${item.currentStock},${item.availableStock},${item.reservedStock},${item.damagedStock},"${item.stockStatus}","${item.lastStockUpdate}"\n`;
        });
      } else if (activeTab === 'transactions') {
        headers = 'Reference Number,Type,Product Name,SKU,Quantity Change,Warehouse,Requested By,Approved By,Date/Time\n';
        filteredTransactions.forEach(tx => {
          rows += `"${tx.referenceNumber}","${tx.transactionType}","${tx.productName}","${tx.sku}",${tx.difference},"${tx.warehouseName}","${tx.requestedBy}","${tx.approvedBy}","${tx.date} ${tx.time}"\n`;
        });
      } else {
        headers = 'Reference Number,Product Name,SKU,Warehouse Source,Before Qty,After Qty,Difference,Reason,Approved By,Date\n';
        filteredAdjustments.forEach(adj => {
          rows += `"${adj.referenceNumber}","${adj.productName}","${adj.sku}","N/A",${adj.beforeQuantity},${adj.afterQuantity},${adj.difference},"${adj.reason}","${adj.approval}","${adj.createdAt}"\n`;
        });
      }

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `SkyInventory_${activeTab}_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotification({ type: 'success', message: 'Stock report exported to CSV file successfully.' });
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Failed to compile report file.' });
    }
  };

  // Printing view helper
  const handlePrint = () => {
    window.print();
  };

  // Computed metrics
  const totalStockUnits = inventory.reduce((sum, item) => sum + (item.currentStock || 0), 0);
  const totalAvailableUnits = inventory.reduce((sum, item) => sum + (item.availableStock || 0), 0);
  const totalReservedUnits = inventory.reduce((sum, item) => sum + (item.reservedStock || 0), 0);
  const totalDamagedUnits = inventory.reduce((sum, item) => sum + (item.damagedStock || 0), 0);
  const lowStockItems = inventory.filter(item => item.stockStatus === 'Low Stock' || item.stockStatus === 'Critical Stock').length;
  const outOfStockItems = inventory.filter(item => item.stockStatus === 'Out of Stock').length;

  // Filter Inventory Stocks
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWarehouse = warehouseFilter === 'All' 
      ? true 
      : (item.warehouseStock?.[warehouseFilter] || 0) > 0;
      
    const matchesStatus = statusFilter === 'All'
      ? true
      : item.stockStatus === statusFilter;

    return matchesSearch && matchesWarehouse && matchesStatus;
  });

  // Filter Transactions logs
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = txTypeFilter === 'All'
      ? true
      : tx.transactionType === txTypeFilter;

    const matchesWarehouse = warehouseFilter === 'All'
      ? true
      : tx.warehouseId === warehouseFilter;

    return matchesSearch && matchesType && matchesWarehouse;
  });

  // Filter Manual Adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesSearch = 
      adj.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            Enterprise Stock Ledger
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time localized inventory, audit transaction histories, and advanced multi-warehouse thresholds control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
          
          {!isReadOnly && (
            <>
              <button
                onClick={() => setIsStockInOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10 transition-all cursor-pointer min-h-[44px]"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Inbound (Stock In)
              </button>
              <button
                onClick={() => setIsStockOutOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/10 transition-all cursor-pointer min-h-[44px]"
              >
                <ArrowUpRight className="h-4 w-4" />
                Outbound (Stock Out)
              </button>
              <button
                onClick={() => setIsAdjustmentOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer min-h-[44px]"
              >
                <Settings className="h-4 w-4" />
                Adjustment Override
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Status Metric Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Total Stock Units</span>
          <div className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{totalStockUnits}</div>
          <span className="text-[9px] text-zinc-400">Total counted quantities</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Available Stock</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-500">{totalAvailableUnits}</div>
          <span className="text-[9px] text-zinc-400">Ready for order fulfillment</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Reserved Stock</span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-500">{totalReservedUnits}</div>
          <span className="text-[9px] text-zinc-400">Locked in processing shipments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Damaged/Returned</span>
          <div className="text-xl font-bold text-red-600 dark:text-red-500">{totalDamagedUnits}</div>
          <span className="text-[9px] text-zinc-400">Excluded from active catalogs</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Low Stock SKU</span>
          <div className="text-xl font-bold text-amber-500">{lowStockItems}</div>
          <span className="text-[9px] text-zinc-400">Below defined safety stock</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">Out of Stock</span>
          <div className="text-xl font-bold text-red-500">{outOfStockItems}</div>
          <span className="text-[9px] text-zinc-400">Immediate reorder recommended</span>
        </div>

      </div>

      {/* Navigation tabs & search row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-t-xl border-b-2 cursor-pointer min-h-[44px] ${
              activeTab === 'stocks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Live Inventory Stock ({filteredInventory.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-t-xl border-b-2 cursor-pointer min-h-[44px] ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Audit Logs / Transactions ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`px-4 py-2 text-xs font-bold transition-all rounded-t-xl border-b-2 cursor-pointer min-h-[44px] ${
              activeTab === 'adjustments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Stock Adjustments ({filteredAdjustments.length})
          </button>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter current view..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100 w-52 sm:w-64"
            />
          </div>

          {activeTab === 'stocks' && (
            <>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
              >
                <option value="All">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
              >
                <option value="All">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Critical Stock">Critical Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </>
          )}

          {activeTab === 'transactions' && (
            <>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
              >
                <option value="All">All Movements</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Transfer">Transfer</option>
              </select>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
              >
                <option value="All">All Facilities</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </>
          )}

        </div>
      </div>

      {/* Main View Area Table */}
      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          
          {/* TAB 1: Live Stocks list */}
          {activeTab === 'stocks' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-900/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Product Info</th>
                    <th className="px-5 py-3">SKU / Barcode</th>
                    <th className="px-5 py-3">Total Qty</th>
                    <th className="px-5 py-3 text-center">Breakdowns</th>
                    <th className="px-5 py-3">Location Maps</th>
                    <th className="px-5 py-3">Stock Status</th>
                    <th className="px-5 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-zinc-400 font-medium">
                        <Box className="h-10 w-10 mx-auto text-zinc-300 mb-2.5 animate-pulse" />
                        No stocks match criteria. Add items to catalog products.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const minVal = item.minStockLevel || 10;
                      
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/40 dark:hover:bg-slate-900/30 transition-colors">
                          
                          <td className="px-5 py-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-900 dark:text-white block">{item.productName}</span>
                              <span className="text-[10px] text-zinc-400">{item.category}</span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <span className="block text-zinc-600 dark:text-zinc-400">SKU: {item.sku}</span>
                              <span className="text-[10px] text-zinc-400">BC: {item.barcode}</span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white">
                            {item.currentStock}
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-center">
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded" title="Available">
                                Av: {item.availableStock}
                              </span>
                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded" title="Reserved">
                                Re: {item.reservedStock}
                              </span>
                              <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 rounded" title="Damaged">
                                Dm: {item.damagedStock}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="space-y-1 max-w-[200px]">
                              {warehouses.map((wh) => {
                                const stockInWh = item.warehouseStock?.[wh.id] || 0;
                                if (stockInWh <= 0) return null;
                                return (
                                  <div key={wh.id} className="flex items-center justify-between text-[10px] font-mono border-b border-zinc-100 dark:border-zinc-800 pb-0.5 last:border-0">
                                    <span className="text-zinc-400 truncate pr-2">{wh.name}</span>
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{stockInWh}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.stockStatus === 'In Stock'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : item.stockStatus === 'Low Stock'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : item.stockStatus === 'Critical Stock'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                            }`}>
                              {item.stockStatus}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedInventory(item)}
                              className="p-1 text-zinc-400 hover:text-blue-600 rounded transition-colors"
                              title="Full audit trace"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Audit Logs / Transaction list */}
          {activeTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-900/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Reference No</th>
                    <th className="px-5 py-3">Log Type</th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">Warehouse Location</th>
                    <th className="px-5 py-3">Qty Change</th>
                    <th className="px-5 py-3">Remarks / Reason</th>
                    <th className="px-5 py-3">Audit Operative</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-zinc-400 font-medium">
                        <History className="h-10 w-10 mx-auto text-zinc-300 mb-2.5 animate-pulse" />
                        No inbound or outbound movements found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-50/40 dark:hover:bg-slate-900/30 transition-colors">
                        
                        <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white">
                          {tx.referenceNumber}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.transactionType === 'Stock In'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : tx.transactionType === 'Stock Out'
                                ? 'bg-rose-500/10 text-rose-600'
                                : tx.transactionType === 'Adjustment'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-zinc-500/10 text-zinc-600'
                          }`}>
                            {tx.transactionType}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                          {tx.productName}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                          {tx.warehouseName}
                        </td>

                        <td className={`px-5 py-3.5 font-bold ${tx.difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.difference > 0 ? `+${tx.difference}` : tx.difference}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                          {tx.remarks}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300 truncate">
                          {tx.requestedBy}
                        </td>

                        <td className="px-5 py-3.5 text-right text-zinc-400 text-[11px]">
                          {tx.date} | {tx.time}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Stock Adjustments override history list */}
          {activeTab === 'adjustments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-900/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Ref No</th>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Before Qty</th>
                    <th className="px-5 py-3">After Qty</th>
                    <th className="px-5 py-3">Adjustment Difference</th>
                    <th className="px-5 py-3">Reasoning</th>
                    <th className="px-5 py-3">Approved By</th>
                    <th className="px-5 py-3 text-right">Audit Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-zinc-400 font-medium">
                        <SlidersHorizontal className="h-10 w-10 mx-auto text-zinc-300 mb-2.5 animate-pulse" />
                        No manual overrides logged in system history.
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-zinc-50/40 dark:hover:bg-slate-900/30 transition-colors">
                        
                        <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white">
                          {adj.referenceNumber}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-800 dark:text-zinc-200">
                          {adj.productName}
                        </td>

                        <td className="px-5 py-3.5">
                          {adj.sku}
                        </td>

                        <td className="px-5 py-3.5">
                          {adj.beforeQuantity}
                        </td>

                        <td className="px-5 py-3.5">
                          {adj.afterQuantity}
                        </td>

                        <td className={`px-5 py-3.5 font-bold ${adj.difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                          {adj.reason}
                        </td>

                        <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">
                          {adj.approval}
                        </td>

                        <td className="px-5 py-3.5 text-right text-zinc-400 text-[11px]">
                          {adj.createdAt ? adj.createdAt.split('T')[0] : 'N/A'}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* 1. STOCK IN OVERLAY */}
      <AnimatePresence>
        {isStockInOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStockInOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-zinc-800 dark:text-zinc-100"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                Intake Log: Stock Inbound Entry
              </h2>

              <form onSubmit={handleStockInSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Reference Number (Auto-gen if empty)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={inRef}
                        onChange={(e) => setInRef(e.target.value)}
                        placeholder="e.g. STK-IN-98201"
                        className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setInRef(generateRef('STK-IN'))}
                        className="px-2.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 hover:bg-zinc-200 rounded-lg"
                      >
                        Gen
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Supplier / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={inSupplier}
                      onChange={(e) => setInSupplier(e.target.value)}
                      placeholder="e.g. Global Supplies Corp"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Choose Catalog Product *
                  </label>
                  <select
                    required
                    value={inProduct}
                    onChange={(e) => setInProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Intake Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      value={inQty}
                      onChange={(e) => setInQty(e.target.value)}
                      placeholder="Quantity amount..."
                      min="1"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Purchase Cost (per unit)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inCost}
                      onChange={(e) => setInCost(e.target.value)}
                      placeholder="Unit purchasing price..."
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Destination Warehouse *
                    </label>
                    <select
                      required
                      value={inWarehouse}
                      onChange={(e) => setInWarehouse(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">-- Choose Warehouse --</option>
                      {warehouses.filter(w => w.status === 'Active').map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Batch / Lot Number
                    </label>
                    <input
                      type="text"
                      value={inBatch}
                      onChange={(e) => setInBatch(e.target.value)}
                      placeholder="e.g. B-FE2026"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Manufacturing Date
                    </label>
                    <input
                      type="date"
                      value={inMfgDate}
                      onChange={(e) => setInMfgDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={inExpiryDate}
                      onChange={(e) => setInExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Received & Inspected By
                    </label>
                    <input
                      type="text"
                      value={inReceivedBy}
                      onChange={(e) => setInReceivedBy(e.target.value)}
                      placeholder="Name of receiving officer..."
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Audit Remarks / Notes
                  </label>
                  <textarea
                    value={inRemarks}
                    onChange={(e) => setInRemarks(e.target.value)}
                    placeholder="Enter additional inspection details or delivery comments..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setIsStockInOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    Post Stock Inbound
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. STOCK OUT OVERLAY */}
      <AnimatePresence>
        {isStockOutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStockOutOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-zinc-800 dark:text-zinc-100"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-rose-600" />
                Dispatch Log: Outbound Release
              </h2>

              <form onSubmit={handleStockOutSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Reference Number (Auto-gen if empty)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={outRef}
                        onChange={(e) => setOutRef(e.target.value)}
                        placeholder="e.g. STK-OUT-44122"
                        className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => setOutRef(generateRef('STK-OUT'))}
                        className="px-2.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 hover:bg-zinc-200 rounded-lg"
                      >
                        Gen
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Release Catalog Product *
                  </label>
                  <select
                    required
                    value={outProduct}
                    onChange={(e) => setOutProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Source Warehouse *
                    </label>
                    <select
                      required
                      value={outWarehouse}
                      onChange={(e) => setOutWarehouse(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">-- Select Source --</option>
                      {warehouses.filter(w => w.status === 'Active').map(w => {
                        const rec = inventory.find(i => i.id === outProduct);
                        const stockAmt = rec?.warehouseStock?.[w.id] || 0;
                        return (
                          <option key={w.id} value={w.id}>{w.name} ({stockAmt} units)</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Outbound Qty *
                    </label>
                    <input
                      type="number"
                      required
                      value={outQty}
                      onChange={(e) => setOutQty(e.target.value)}
                      placeholder="Amt..."
                      min="1"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Release Purpose / Reason
                    </label>
                    <select
                      value={outReason}
                      onChange={(e) => setOutReason(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="Sales">Sales Order Fulfilment</option>
                      <option value="Sample">Product Sample Release</option>
                      <option value="Damage">Scrap / Damaged Stock removal</option>
                      <option value="Adjustment">Discrepancy write-off</option>
                      <option value="Transfer">Inter-facility Transfer</option>
                      <option value="Other">Other release</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Requested By
                    </label>
                    <input
                      type="text"
                      value={outRequestedBy}
                      onChange={(e) => setOutRequestedBy(e.target.value)}
                      placeholder="e.g. Sales Department"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Approval Authority Manager
                  </label>
                  <input
                    type="text"
                    value={outApprovedBy}
                    onChange={(e) => setOutApprovedBy(e.target.value)}
                    placeholder="Approver's name..."
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Outbound Remarks
                  </label>
                  <textarea
                    value={outRemarks}
                    onChange={(e) => setOutRemarks(e.target.value)}
                    placeholder="Enter dispatch particulars, carrier, customer order numbers..."
                    rows={2.5}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setIsStockOutOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    Post Stock Outbound
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. STOCK ADJUSTMENT OVERWRITE OVERLAY */}
      <AnimatePresence>
        {isAdjustmentOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdjustmentOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-zinc-800 dark:text-zinc-100"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Physical Count Stock Adjustment
              </h2>

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Select Target Product *
                  </label>
                  <select
                    required
                    value={adjProduct}
                    onChange={(e) => setAdjProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Target Warehouse *
                    </label>
                    <select
                      required
                      value={adjWarehouse}
                      onChange={(e) => setAdjWarehouse(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">-- Choose --</option>
                      {warehouses.filter(w => w.status === 'Active').map(w => {
                        const rec = inventory.find(i => i.id === adjProduct);
                        const currentVal = rec?.warehouseStock?.[w.id] || 0;
                        return (
                          <option key={w.id} value={w.id}>{w.name} (Current: {currentVal} qty)</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Correct Physical Count *
                    </label>
                    <input
                      type="number"
                      required
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      placeholder="Actual shelf count..."
                      min="0"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Auditor / Authorized Approver
                  </label>
                  <input
                    type="text"
                    value={adjApproval}
                    onChange={(e) => setAdjApproval(e.target.value)}
                    placeholder="Approver's name..."
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Reason for Adjustment
                  </label>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Cycle count mismatch, theft, water damage..."
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Internal Investigation Notes
                  </label>
                  <textarea
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="Enter thorough tracking comments or notes..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    Commit Count Correction
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. PRODUCT DETAIL / AUDIT TRACE VIEW */}
      <AnimatePresence>
        {selectedInventory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInventory(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[95vh] text-zinc-800 dark:text-zinc-100"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">
                    Audit Profile
                  </span>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white mt-1">
                    {selectedInventory.productName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedInventory(null)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Grid content */}
              <div className="space-y-6">
                
                {/* Specs row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl font-mono text-[11px]">
                  <div>
                    <span className="text-zinc-400 block">Catalog SKU:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedInventory.sku}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Barcode ID:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedInventory.barcode}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Min Stock Threshold:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedInventory.minStockLevel || 10}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Last Verification:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                      {selectedInventory.lastStockUpdate ? selectedInventory.lastStockUpdate.split('T')[0] : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Warehouse quantities breakdown list */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                    Localized Inventory Allocations
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {warehouses.map((wh) => {
                      const qty = selectedInventory.warehouseStock?.[wh.id] || 0;
                      return (
                        <div key={wh.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">{wh.name}</span>
                            <span className="text-[10px] text-zinc-400">{wh.address || 'Address not registered'}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-sm font-black text-zinc-900 dark:text-white block">{qty}</span>
                            <span className="text-[9px] text-zinc-400 font-mono">units</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Local transactions logs for this specific SKU */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                    Direct Stock Release & Receipt Logs (Trace)
                  </h3>
                  
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-[11px] max-h-[180px] overflow-y-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-950 sticky top-0 text-[9px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Ref No</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Wh</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {transactions.filter(t => t.productId === selectedInventory.productId).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                              No stock movements registered for this SKU.
                            </td>
                          </tr>
                        ) : (
                          transactions.filter(t => t.productId === selectedInventory.productId).map(t => (
                            <tr key={t.id} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-2">{t.date}</td>
                              <td className="px-4 py-2 font-bold">{t.referenceNumber}</td>
                              <td className="px-4 py-2">
                                <span className={`px-1 py-0.25 rounded text-[9px] font-bold ${
                                  t.transactionType === 'Stock In' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                }`}>
                                  {t.transactionType}
                                </span>
                              </td>
                              <td className="px-4 py-2 truncate max-w-[100px]">{t.warehouseName}</td>
                              <td className={`px-4 py-2 text-right font-bold ${t.difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.difference > 0 ? `+${t.difference}` : t.difference}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedInventory(null)}
                    className="px-4 py-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default InventoryPage;
