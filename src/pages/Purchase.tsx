import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, Plus, Search, FileText, Check, X, Printer,
  ArrowLeftRight, FileDown, Layers, Box, Loader2, DollarSign, 
  Calendar, Building, FileSpreadsheet, Eye, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, setDoc, getDocs 
} from 'firebase/firestore';
import { 
  Warehouse, InventoryRecord, Product, Supplier,
  PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchasePayment, PurchaseReturn, PurchaseHistoryEntry
} from '../types';

export const Purchase: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const isReadOnly = profile?.role === 'Staff';

  // Core collections
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [history, setHistory] = useState<PurchaseHistoryEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'receipts' | 'payments' | 'returns' | 'history' | 'suppliers' | 'reports'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedPoForInvoice, setSelectedPoForInvoice] = useState<PurchaseOrder | null>(null);
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);

  // Form states - PO
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poWarehouseId, setPoWarehouseId] = useState('');
  const [poPurchaseDate, setPoPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poRef, setPoRef] = useState('');
  const [poCurrency, setPoCurrency] = useState('USD');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; price: number; discount: number; vat: number; tax: number }[]>([]);

  // Form states - GRN (Receiving)
  const [grnPoId, setGrnPoId] = useState('');
  const [grnItems, setGrnItems] = useState<Record<string, { qtyToReceive: number; batch: string; mfgDate: string; expiryDate: string }>>({});
  const [grnRemarks, setGrnRemarks] = useState('');

  // Form states - Payment
  const [payPoId, setPayPoId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Cheque'>('Cash');
  const [payType, setPayType] = useState<'Partial' | 'Full' | 'Advance'>('Full');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Form states - Return
  const [retPoId, setRetPoId] = useState('');
  const [retItems, setRetItems] = useState<Record<string, number>>({}); // productId -> qty
  const [retReason, setRetReason] = useState('');

  // Auto-generate reference numbers
  const generateRef = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

  // Listen to Firestore real-time updates
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubPOs = onSnapshot(query(collection(db, 'purchase_orders'), orderBy('createdAt', 'desc')), (snap) => {
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      setLoading(false);
    });

    const unsubReceipts = onSnapshot(query(collection(db, 'purchase_receipts'), orderBy('createdAt', 'desc')), (snap) => {
      setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseReceipt)));
    });

    const unsubPayments = onSnapshot(query(collection(db, 'purchase_payments'), orderBy('createdAt', 'desc')), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchasePayment)));
    });

    const unsubReturns = onSnapshot(query(collection(db, 'purchase_returns'), orderBy('createdAt', 'desc')), (snap) => {
      setReturns(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseReturn)));
    });

    const unsubHistory = onSnapshot(query(collection(db, 'purchase_history'), orderBy('createdAt', 'desc')), (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseHistoryEntry)));
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name', 'asc')), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    const unsubWarehouses = onSnapshot(query(collection(db, 'warehouses'), orderBy('name', 'asc')), (snap) => {
      setWarehouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse)));
    });

    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), orderBy('companyName', 'asc')), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
    });

    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), orderBy('productName', 'asc')), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryRecord)));
    });

    return () => {
      unsubPOs();
      unsubReceipts();
      unsubPayments();
      unsubReturns();
      unsubHistory();
      unsubProducts();
      unsubWarehouses();
      unsubSuppliers();
      unsubInventory();
    };
  }, [user]);

  // Log to history
  const logPurchaseHistory = async (poId: string, poNumber: string, action: PurchaseHistoryEntry['action'], details: string) => {
    try {
      const hRef = doc(collection(db, 'purchase_history'));
      await setDoc(hRef, {
        id: hRef.id,
        purchaseOrderId: poId,
        poNumber,
        action,
        details,
        operatorName: profile?.fullName || 'Operator',
        operatorId: user?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Active'
      });
    } catch (e) {
      console.error('History log failed:', e);
    }
  };

  // Create notifications in the unified system notifications collection
  const createNotification = async (type: string, productId: string, productName: string, message: string) => {
    try {
      const notifRef = doc(collection(db, 'inventory_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        type,
        productId,
        productName,
        sku: products.find(p => p.id === productId)?.sku || '',
        message,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Active'
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Save PO Handler
  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!poSupplierId || !poWarehouseId || poItems.length === 0) {
      setNotification({ type: 'error', message: 'Supplier, Warehouse, and at least 1 item is required.' });
      return;
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === poSupplierId);
      const selectedWh = warehouses.find(w => w.id === poWarehouseId);
      const poNum = generateRef('PO');

      // Calculate totals
      let subtotal = 0;
      let discountAmount = 0;
      let taxAmount = 0;

      const items: PurchaseOrderItem[] = poItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const qty = Number(item.quantity);
        const price = Number(item.price);
        const disc = Number(item.discount);
        const vat = Number(item.vat);
        const tax = Number(item.tax);

        const lineSubtotal = qty * price;
        const lineDisc = lineSubtotal * (disc / 100);
        const lineTax = (lineSubtotal - lineDisc) * ((vat + tax) / 100);
        const lineTotal = lineSubtotal - lineDisc + lineTax;

        subtotal += lineSubtotal;
        discountAmount += lineDisc;
        taxAmount += lineTax;

        return {
          productId: item.productId,
          productName: prod?.name || 'Unknown Product',
          sku: prod?.sku || '',
          barcode: prod?.barcode || '',
          quantity: qty,
          receivedQuantity: 0,
          unit: prod?.unit || 'pcs',
          purchasePrice: price,
          discount: disc,
          vat: vat,
          tax: tax,
          subtotal: lineSubtotal,
          total: lineTotal
        };
      });

      const netAmount = subtotal - discountAmount + taxAmount;

      const poDocRef = doc(collection(db, 'purchase_orders'));
      const poData: PurchaseOrder = {
        id: poDocRef.id,
        poNumber: poNum,
        supplierId: poSupplierId,
        supplierName: selectedSupplier?.companyName || 'Unknown Supplier',
        warehouseId: poWarehouseId,
        warehouseName: selectedWh?.name || 'Unknown Warehouse',
        purchaseDate: poPurchaseDate,
        expectedDeliveryDate: poExpectedDate || poPurchaseDate,
        referenceNumber: poRef || generateRef('REF'),
        purchaseStatus: 'Pending',
        paymentStatus: 'Unpaid',
        currency: poCurrency,
        notes: poNotes,
        items,
        subtotal,
        discountAmount,
        taxAmount,
        netAmount,
        paidAmount: 0,
        dueAmount: netAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        createdByName: profile?.fullName || 'Operator',
        approvedBy: '',
        status: 'Active'
      };

      await setDoc(poDocRef, poData);
      await logPurchaseHistory(poDocRef.id, poNum, 'Purchase Created', `Created PO containing ${items.length} product lines totaling ${poCurrency} ${netAmount.toFixed(2)}.`);
      await createNotification('large_movement', '', '', `New Purchase Order ${poNum} created for ${poData.supplierName} (Pending Approval).`);

      setNotification({ type: 'success', message: `Purchase Order ${poNum} successfully registered.` });
      setIsPoModalOpen(false);
      // Reset PO state
      setPoItems([]);
      setPoNotes('');
      setPoExpectedDate('');
      setPoRef('');
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Error processing PO.' });
    }
  };

  // Change PO status (e.g., Approve / Cancel)
  const handleUpdatePOStatus = async (po: PurchaseOrder, newStatus: 'Approved' | 'Ordered' | 'Cancelled') => {
    if (isReadOnly) return;
    try {
      const poRef = doc(db, 'purchase_orders', po.id);
      const updateObj: Partial<PurchaseOrder> = {
        purchaseStatus: newStatus === 'Approved' ? 'Approved' : newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (newStatus === 'Approved') {
        updateObj.approvedBy = user?.uid || '';
        updateObj.approvedByName = profile?.fullName || 'Manager';
      }
      await updateDoc(poRef, updateObj);
      await logPurchaseHistory(po.id, po.poNumber, newStatus === 'Cancelled' ? 'Purchase Cancelled' : 'Approval Changes', `Purchase Order status transition to ${newStatus}.`);
      await createNotification('adjustment', '', '', `PO ${po.poNumber} status updated to ${newStatus}.`);
      setNotification({ type: 'success', message: `Order status set to ${newStatus}.` });
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to update order status.' });
    }
  };

  // GRN (Receiving Goods) Handler
  const handleReceiveGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const selectedPO = purchaseOrders.find(p => p.id === grnPoId);
    if (!selectedPO) return;

    try {
      const grnNum = generateRef('GRN');
      const receivedItemsList: any[] = [];
      const updatedPOItems = selectedPO.items.map(item => {
        const itemState = grnItems[item.productId];
        const receiveQty = Number(itemState?.qtyToReceive || 0);

        if (receiveQty > 0) {
          receivedItemsList.push({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantityReceivedNow: receiveQty,
            batchNumber: itemState.batch || 'N/A',
            manufacturingDate: itemState.mfgDate || '',
            expiryDate: itemState.expiryDate || ''
          });
        }

        return {
          ...item,
          receivedQuantity: item.receivedQuantity + receiveQty
        };
      });

      if (receivedItemsList.length === 0) {
        setNotification({ type: 'error', message: 'You must specify at least 1 item to receive.' });
        return;
      }

      // 1. Write the Goods Receipt doc
      const grnDocRef = doc(collection(db, 'purchase_receipts'));
      await setDoc(grnDocRef, {
        id: grnDocRef.id,
        receiptNumber: grnNum,
        purchaseOrderId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        warehouseId: selectedPO.warehouseId,
        warehouseName: selectedPO.warehouseName,
        items: receivedItemsList,
        receiverName: profile?.fullName || 'Store Manager',
        receiveDate: new Date().toISOString().split('T')[0],
        remarks: grnRemarks || 'Goods Receive Intake',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed',
        referenceNumber: selectedPO.referenceNumber
      });

      // 2. Increment Stock on Inventory and Products
      for (const rx of receivedItemsList) {
        const invRec = inventory.find(i => i.productId === rx.productId);
        const selectedProd = products.find(p => p.id === rx.productId);

        const currentQty = invRec ? invRec.currentStock : 0;
        const newQty = currentQty + rx.quantityReceivedNow;

        const updatedWarehouseStock = { ...(invRec?.warehouseStock || {}) };
        updatedWarehouseStock[selectedPO.warehouseId] = (updatedWarehouseStock[selectedPO.warehouseId] || 0) + rx.quantityReceivedNow;

        const minLvl = invRec?.minStockLevel || selectedProd?.lowStockLimit || 10;
        let newStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock' = 'In Stock';
        if (newQty <= 0) newStatus = 'Out of Stock';
        else if (newQty <= minLvl * 0.5) newStatus = 'Critical Stock';
        else if (newQty <= minLvl) newStatus = 'Low Stock';

        // Update / Set Inventory Record
        const invRef = doc(db, 'inventory', rx.productId);
        if (invRec) {
          await updateDoc(invRef, {
            currentStock: newQty,
            availableStock: newQty - (invRec.reservedStock || 0),
            warehouseStock: updatedWarehouseStock,
            lastStockUpdate: new Date().toISOString(),
            stockStatus: newStatus,
            updatedAt: new Date().toISOString()
          });
        } else {
          await setDoc(invRef, {
            id: rx.productId,
            productId: rx.productId,
            productName: rx.productName,
            sku: rx.sku,
            barcode: selectedProd?.barcode || '',
            category: selectedProd?.category || 'General',
            supplier: selectedPO.supplierName,
            currentStock: newQty,
            availableStock: newQty,
            reservedStock: 0,
            damagedStock: 0,
            returnedStock: 0,
            warehouseStock: updatedWarehouseStock,
            minStockLevel: minLvl,
            maxStockLevel: 1000,
            reorderLevel: minLvl * 1.5,
            safetyStock: minLvl * 0.5,
            lastStockUpdate: new Date().toISOString(),
            stockStatus: newStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.uid || '',
            status: 'Active'
          });
        }

        // Update Products Catalog too
        await updateDoc(doc(db, 'products', rx.productId), {
          stockQuantity: newQty,
          updatedAt: new Date().toISOString()
        });

        // Log general inventory transaction so physical audits align
        const txDocRef = doc(collection(db, 'inventory_transactions'));
        await setDoc(txDocRef, {
          id: txDocRef.id,
          referenceNumber: grnNum,
          transactionType: 'Stock In',
          productId: rx.productId,
          productName: rx.productName,
          sku: rx.sku,
          barcode: selectedProd?.barcode || '',
          quantity: rx.quantityReceivedNow,
          previousQuantity: currentQty,
          newQuantity: newQty,
          difference: rx.quantityReceivedNow,
          batchNumber: rx.batchNumber,
          manufacturingDate: rx.manufacturingDate,
          expiryDate: rx.expiryDate,
          warehouseId: selectedPO.warehouseId,
          warehouseName: selectedPO.warehouseName,
          requestedBy: profile?.fullName || 'Operator',
          approvedBy: profile?.fullName || 'Approved',
          remarks: `Received against Purchase Order ${selectedPO.poNumber}`,
          user: profile?.fullName || '',
          userId: user?.uid || '',
          role: profile?.role || '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user?.uid || '',
          status: 'Completed'
        });
      }

      // 3. Determine if PO is fully received, partially received, or remains pending
      const totalOrdered = updatedPOItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalReceived = updatedPOItems.reduce((acc, item) => acc + item.receivedQuantity, 0);
      let purchaseStatus: PurchaseOrder['purchaseStatus'] = 'Partial';
      if (totalReceived >= totalOrdered) {
        purchaseStatus = 'Received';
      }

      // 4. Update the Purchase Order document
      await updateDoc(doc(db, 'purchase_orders', selectedPO.id), {
        items: updatedPOItems,
        purchaseStatus,
        updatedAt: new Date().toISOString()
      });

      await logPurchaseHistory(selectedPO.id, selectedPO.poNumber, 'Goods Received', `Received GRN ${grnNum}. Received item quantity sum: ${totalReceived}/${totalOrdered}.`);
      await createNotification('low_stock', '', '', `Goods received under ${grnNum} for PO ${selectedPO.poNumber}. Stock levels successfully incremented.`);

      setNotification({ type: 'success', message: `Successfully registered received stock in ${selectedPO.warehouseName}` });
      setIsGrnModalOpen(false);
      setGrnItems({});
      setGrnRemarks('');
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed receiving goods.' });
    }
  };

  // Payment management Handler
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const selectedPO = purchaseOrders.find(p => p.id === payPoId);
    if (!selectedPO) return;

    try {
      const payNum = generateRef('PAY');
      const amount = Number(payAmount);

      if (amount <= 0 || amount > selectedPO.dueAmount) {
        setNotification({ type: 'error', message: `Invalid amount. Must be positive and less than or equal to due amount (${selectedPO.dueAmount.toFixed(2)}).` });
        return;
      }

      // 1. Create Purchase Payment Entry
      const payDocRef = doc(collection(db, 'purchase_payments'));
      await setDoc(payDocRef, {
        id: payDocRef.id,
        paymentNumber: payNum,
        purchaseOrderId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        paymentMethod: payMethod,
        paymentType: payType,
        amount,
        transactionReference: payRef || generateRef('TX'),
        paymentDate: new Date().toISOString().split('T')[0],
        notes: payNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed',
        referenceNumber: selectedPO.referenceNumber
      });

      // 2. Adjust Purchase Order payment financials
      const newPaid = selectedPO.paidAmount + amount;
      const newDue = selectedPO.dueAmount - amount;
      const newPayStatus: PurchaseOrder['paymentStatus'] = newDue <= 0.01 ? 'Paid' : 'Partial';

      await updateDoc(doc(db, 'purchase_orders', selectedPO.id), {
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentStatus: newPayStatus,
        updatedAt: new Date().toISOString()
      });

      await logPurchaseHistory(selectedPO.id, selectedPO.poNumber, 'Payment Added', `Registered payment ${payNum} of ${selectedPO.currency} ${amount.toFixed(2)} via ${payMethod}.`);
      setNotification({ type: 'success', message: `Registered payment of ${amount.toFixed(2)}` });
      setIsPaymentModalOpen(false);
      setPayAmount(0);
      setPayRef('');
      setPayNotes('');
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: 'Error processing transaction.' });
    }
  };

  // Purchase Return Handler
  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const selectedPO = purchaseOrders.find(p => p.id === retPoId);
    if (!selectedPO) return;

    try {
      const retNum = generateRef('RET');
      const returnedItemsList: any[] = [];

      for (const itemId in retItems) {
        const qty = Number(retItems[itemId]);
        if (qty > 0) {
          const poItem = selectedPO.items.find(item => item.productId === itemId);
          returnedItemsList.push({
            productId: itemId,
            productName: poItem?.productName || 'Product',
            sku: poItem?.sku || '',
            quantityReturned: qty,
            purchasePrice: poItem?.purchasePrice || 0
          });
        }
      }

      if (returnedItemsList.length === 0) {
        setNotification({ type: 'error', message: 'Must select at least 1 item with return quantity.' });
        return;
      }

      // 1. Create return document
      const retDocRef = doc(collection(db, 'purchase_returns'));
      await setDoc(retDocRef, {
        id: retDocRef.id,
        returnNumber: retNum,
        purchaseOrderId: selectedPO.id,
        poNumber: selectedPO.poNumber,
        referenceNumber: selectedPO.referenceNumber,
        items: returnedItemsList,
        reason: retReason,
        refundStatus: 'Pending',
        approvedBy: user?.uid || '',
        approvedByName: profile?.fullName || 'Manager',
        returnDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Completed'
      });

      // 2. Reduce stock on Inventory and Products
      for (const item of returnedItemsList) {
        const invRec = inventory.find(i => i.productId === item.productId);
        if (invRec) {
          const currentQty = invRec.currentStock;
          const newQty = Math.max(0, currentQty - item.quantityReturned);
          const updatedWarehouseStock = { ...(invRec.warehouseStock || {}) };
          updatedWarehouseStock[selectedPO.warehouseId] = Math.max(0, (updatedWarehouseStock[selectedPO.warehouseId] || 0) - item.quantityReturned);

          const minLvl = invRec.minStockLevel;
          let newStatus: 'In Stock' | 'Low Stock' | 'Critical Stock' | 'Out of Stock' = 'In Stock';
          if (newQty <= 0) newStatus = 'Out of Stock';
          else if (newQty <= minLvl * 0.5) newStatus = 'Critical Stock';
          else if (newQty <= minLvl) newStatus = 'Low Stock';

          await updateDoc(doc(db, 'inventory', item.productId), {
            currentStock: newQty,
            availableStock: newQty - (invRec.reservedStock || 0),
            warehouseStock: updatedWarehouseStock,
            lastStockUpdate: new Date().toISOString(),
            stockStatus: newStatus,
            updatedAt: new Date().toISOString()
          });

          await updateDoc(doc(db, 'products', item.productId), {
            stockQuantity: newQty,
            updatedAt: new Date().toISOString()
          });

          // Log transaction
          const txDocRef = doc(collection(db, 'inventory_transactions'));
          await setDoc(txDocRef, {
            id: txDocRef.id,
            referenceNumber: retNum,
            transactionType: 'Stock Out',
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            barcode: invRec.barcode || '',
            quantity: item.quantityReturned,
            previousQuantity: currentQty,
            newQuantity: newQty,
            difference: -item.quantityReturned,
            warehouseId: selectedPO.warehouseId,
            warehouseName: selectedPO.warehouseName,
            requestedBy: profile?.fullName || 'Operator',
            approvedBy: profile?.fullName || 'Approved',
            remarks: `Purchase Return debit for PO ${selectedPO.poNumber}`,
            user: profile?.fullName || '',
            userId: user?.uid || '',
            role: profile?.role || '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.uid || '',
            status: 'Completed'
          });
        }
      }

      await logPurchaseHistory(selectedPO.id, selectedPO.poNumber, 'Purchase Returned', `Purchase Return ${retNum} initiated. Reason: ${retReason}.`);
      await createNotification('out_of_stock', '', '', `Purchase Return ${retNum} successfully completed. Inventory decremented.`);

      setNotification({ type: 'success', message: `Purchase Return ${retNum} successfully registered.` });
      setIsReturnModalOpen(false);
      setRetItems({});
      setRetReason('');
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Error processing return.' });
    }
  };

  // Aggregated stats calculation for Dashboard
  const totalPurchaseCount = purchaseOrders.length;
  const totalPurchaseValue = purchaseOrders.reduce((sum, item) => sum + (item.purchaseStatus !== 'Cancelled' ? item.netAmount : 0), 0);
  const pendingPurchaseCount = purchaseOrders.filter(p => p.purchaseStatus === 'Pending').length;
  const receivedPurchaseCount = purchaseOrders.filter(p => p.purchaseStatus === 'Received').length;
  const cancelledPurchaseCount = purchaseOrders.filter(p => p.purchaseStatus === 'Cancelled').length;
  const totalDueAmount = purchaseOrders.reduce((sum, item) => sum + (item.purchaseStatus !== 'Cancelled' ? item.dueAmount : 0), 0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPurchases = purchaseOrders.reduce((sum, item) => {
    return sum + (item.purchaseStatus !== 'Cancelled' && item.purchaseDate === todayStr ? item.netAmount : 0);
  }, 0);

  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const monthlyPurchases = purchaseOrders.reduce((sum, item) => {
    return sum + (item.purchaseStatus !== 'Cancelled' && item.purchaseDate.startsWith(thisMonthStr) ? item.netAmount : 0);
  }, 0);

  // Search filter
  const filteredPO = purchaseOrders.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.poNumber.toLowerCase().includes(q) || 
           p.supplierName.toLowerCase().includes(q) || 
           p.referenceNumber.toLowerCase().includes(q);
  });

  // Export functions
  const handleExportCSV = (dataList: any[], filename: string) => {
    if (dataList.length === 0) return;
    const headers = Object.keys(dataList[0]).join(',');
    const rows = dataList.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ type: 'success', message: `${filename} successfully exported as CSV.` });
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selector */}
      <div className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800 gap-2">
        {(['dashboard', 'orders', 'receipts', 'payments', 'returns', 'history', 'suppliers', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg capitalize transition-all border-b-2 cursor-pointer ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600 bg-blue-50/20 dark:bg-blue-500/5' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Synchronizing Real-Time Ledger...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: 'Total POs', value: totalPurchaseCount, icon: ShoppingCart, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
                  { title: 'Total Value', value: `$${totalPurchaseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
                  { title: 'Pending Approval', value: pendingPurchaseCount, icon: AlertCircle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
                  { title: 'Goods Received', value: receivedPurchaseCount, icon: Check, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
                  { title: 'Cancelled Orders', value: cancelledPurchaseCount, icon: X, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
                  { title: 'Outstanding Due', value: `$${totalDueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: ArrowLeftRight, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40' },
                  { title: 'Today\'s Purchases', value: `$${todayPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Calendar, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
                  { title: 'Monthly Purchases', value: `$${monthlyPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: FileSpreadsheet, color: 'text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{stat.title}</p>
                      <p className="text-sm sm:text-base font-black text-zinc-800 dark:text-zinc-100">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions & Recent updates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 lg:col-span-1">
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Purchase Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => { setIsPoModalOpen(true); }}
                      disabled={isReadOnly}
                      className="w-full flex items-center justify-between px-4 py-3 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-blue-500" /> Create Purchase Order</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded uppercase font-mono">PO</span>
                    </button>
                    <button
                      onClick={() => { setIsGrnModalOpen(true); }}
                      disabled={isReadOnly}
                      className="w-full flex items-center justify-between px-4 py-3 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Receive Stocks (GRN)</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-mono">GRN</span>
                    </button>
                    <button
                      onClick={() => { setIsPaymentModalOpen(true); }}
                      disabled={isReadOnly}
                      className="w-full flex items-center justify-between px-4 py-3 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-violet-500" /> Process Bill Payment</span>
                      <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded uppercase font-mono">PAY</span>
                    </button>
                    <button
                      onClick={() => { setIsReturnModalOpen(true); }}
                      disabled={isReadOnly}
                      className="w-full flex items-center justify-between px-4 py-3 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-rose-500" /> Process Stock Return</span>
                      <span className="text-[10px] bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded uppercase font-mono">RET</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 lg:col-span-2">
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Recent Actions History Log</h3>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-4 text-center">No audit trail logs recorded yet.</p>
                    ) : (
                      history.slice(0, 10).map((hist) => (
                        <div key={hist.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                          <div className="space-y-0.5">
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              {hist.action}
                            </span>
                            <p className="text-zinc-700 dark:text-zinc-300 font-medium">{hist.details}</p>
                          </div>
                          <div className="text-right whitespace-nowrap text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                            {new Date(hist.createdAt).toLocaleDateString()} {new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASE ORDERS TABLE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search POs, suppliers..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleExportCSV(purchaseOrders, 'PurchaseOrders_Report')}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300"
                  >
                    <FileDown className="h-4 w-4" /> Export CSV
                  </button>
                  <button
                    onClick={() => { setIsPoModalOpen(true); }}
                    disabled={isReadOnly}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Create PO
                  </button>
                </div>
              </div>

              {/* Table list */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Warehouse</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Total Value</th>
                      <th className="p-3">Outstanding</th>
                      <th className="p-3">PO Status</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredPO.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-500">No Purchase Orders found.</td>
                      </tr>
                    ) : (
                      filteredPO.map((po) => (
                        <tr key={po.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-bold font-mono text-zinc-800 dark:text-zinc-100">{po.poNumber}</td>
                          <td className="p-3 font-semibold text-zinc-700 dark:text-zinc-300">{po.supplierName}</td>
                          <td className="p-3 text-zinc-500 dark:text-zinc-400">{po.warehouseName}</td>
                          <td className="p-3 text-zinc-500 dark:text-zinc-400">{po.purchaseDate}</td>
                          <td className="p-3 font-bold text-zinc-800 dark:text-zinc-200">{po.currency} {po.netAmount.toFixed(2)}</td>
                          <td className="p-3 font-medium text-rose-500 font-mono">{po.currency} {po.dueAmount.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              po.purchaseStatus === 'Received' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              po.purchaseStatus === 'Partial' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                              po.purchaseStatus === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              po.purchaseStatus === 'Cancelled' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              'bg-zinc-500/10 text-zinc-500'
                            }`}>
                              {po.purchaseStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              po.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                              po.paymentStatus === 'Partial' ? 'bg-violet-500/10 text-violet-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {po.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPoForInvoice(po)}
                              title="Invoice View"
                              className="p-1 text-zinc-500 hover:text-blue-600 rounded cursor-pointer"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {po.purchaseStatus === 'Pending' && !isReadOnly && (
                              <>
                                <button
                                  onClick={() => handleUpdatePOStatus(po, 'Approved')}
                                  className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer text-[10px] font-bold border border-emerald-500/20"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdatePOStatus(po, 'Cancelled')}
                                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer text-[10px] font-bold border border-rose-500/20"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GOODS RECEIPTS (GRN) */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Goods Receive Notes (GRN) History</h3>
                <button
                  onClick={() => setIsGrnModalOpen(true)}
                  disabled={isReadOnly}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Receive Goods
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold">
                      <th className="p-3">GRN Number</th>
                      <th className="p-3">PO Reference</th>
                      <th className="p-3">Target Warehouse</th>
                      <th className="p-3">Receiver Name</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Items Count</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {receipts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">No Goods Receive Notes compiled yet.</td>
                      </tr>
                    ) : (
                      receipts.map((grn) => (
                        <tr key={grn.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-bold font-mono text-zinc-800 dark:text-zinc-100">{grn.receiptNumber}</td>
                          <td className="p-3 text-zinc-500 font-mono">{grn.poNumber}</td>
                          <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">{grn.warehouseName}</td>
                          <td className="p-3 text-zinc-500">{grn.receiverName}</td>
                          <td className="p-3 text-zinc-500">{grn.receiveDate}</td>
                          <td className="p-3 text-zinc-500 font-bold">{grn.items.reduce((s, i) => s + i.quantityReceivedNow, 0)} items</td>
                          <td className="p-3 text-zinc-400 truncate max-w-xs">{grn.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS LEDGER */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Purchase Bill Payments Ledger</h3>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={isReadOnly}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add Payment
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold">
                      <th className="p-3">Payment Number</th>
                      <th className="p-3">PO Reference</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Tx Reference</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">No payment records logged.</td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-bold font-mono text-zinc-800 dark:text-zinc-100">{p.paymentNumber}</td>
                          <td className="p-3 text-zinc-500 font-mono">{p.poNumber}</td>
                          <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium">{p.paymentMethod}</td>
                          <td className="p-3 text-zinc-500">{p.paymentType}</td>
                          <td className="p-3 text-zinc-400 font-mono">{p.transactionReference}</td>
                          <td className="p-3 text-zinc-500">{p.paymentDate}</td>
                          <td className="p-3 font-black text-emerald-600">${p.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RETURNS */}
          {activeTab === 'returns' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Purchase Return Register</h3>
                <button
                  onClick={() => setIsReturnModalOpen(true)}
                  disabled={isReadOnly}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> New Return
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold">
                      <th className="p-3">Return Number</th>
                      <th className="p-3">PO Reference</th>
                      <th className="p-3">Return Date</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Refund Status</th>
                      <th className="p-3 font-bold text-right">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {returns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">No return logs compiled yet.</td>
                      </tr>
                    ) : (
                      returns.map((r) => (
                        <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-bold font-mono text-zinc-800 dark:text-zinc-100">{r.returnNumber}</td>
                          <td className="p-3 text-zinc-500 font-mono">{r.poNumber}</td>
                          <td className="p-3 text-zinc-500">{r.returnDate}</td>
                          <td className="p-3 text-zinc-700 dark:text-zinc-300">{r.reason}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold rounded">
                              {r.refundStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                            {r.items.length} product lines
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Permanent Audit Trail Ledger</h3>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-150 dark:divide-zinc-850 p-4 space-y-3">
                {history.map((hist) => (
                  <div key={hist.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">{hist.poNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-zinc-800 text-zinc-600">
                          {hist.action}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{hist.details}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-zinc-500 dark:text-zinc-400 text-[10px]">By {hist.operatorName}</p>
                      <p className="text-[10px] font-mono text-zinc-400">{new Date(hist.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SUPPLIER INTEGRATION */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Suppliers Analytics Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map(sup => {
                  const supPOs = purchaseOrders.filter(p => p.supplierId === sup.id && p.purchaseStatus !== 'Cancelled');
                  const outstandingDue = supPOs.reduce((s, o) => s + o.dueAmount, 0);
                  const paidAmount = supPOs.reduce((s, o) => s + o.paidAmount, 0);
                  const activeCount = supPOs.filter(p => p.purchaseStatus !== 'Received' && p.purchaseStatus !== 'Cancelled').length;
                  const avgPurchaseValue = supPOs.length > 0 ? supPOs.reduce((s, o) => s + o.netAmount, 0) / supPOs.length : 0;
                  const lastPO = supPOs[0]?.purchaseDate || 'N/A';

                  return (
                    <div 
                      key={sup.id} 
                      onClick={() => setSelectedSupplierForDetail(sup)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                          {sup.companyName.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{sup.companyName}</h4>
                          <p className="text-[10px] text-zinc-400">{sup.supplierName} • {sup.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Orders</p>
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">{activeCount} Orders</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Avg PO Value</p>
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">${avgPurchaseValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Paid Amount</p>
                          <p className="font-bold text-emerald-600">${paidAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Outstanding Due</p>
                          <p className="font-bold text-rose-600 font-mono">${outstandingDue.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 flex justify-between">
                        <span>Last PO: {lastPO}</span>
                        <span className="text-amber-500 font-bold">Rating: ⭐⭐⭐⭐⭐</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: EXPORT REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Procurement & Financial Reports Generator</h3>
              <p className="text-xs text-zinc-500">Download system data in high-quality CSV spreadsheet format to feed external analytic pipelines.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Purchase Orders', desc: 'Summary of all purchase order values, suppliers, and fulfillment stats.', list: purchaseOrders, file: 'Purchase_Orders_Fulfillment_Report' },
                  { name: 'Goods Receipts (GRN)', desc: 'Audits of received shipments, manufacturing/expiration lots, and locations.', list: receipts, file: 'Goods_Receive_Note_Audits' },
                  { name: 'Supplier Accounts Payable', desc: 'Calculates paid vs. outstanding ledger values for each registered partner.', list: suppliers.map(s => {
                    const supPOs = purchaseOrders.filter(p => p.supplierId === s.id && p.purchaseStatus !== 'Cancelled');
                    return {
                      Supplier: s.companyName,
                      Email: s.email,
                      Active_Orders: supPOs.filter(p => p.purchaseStatus !== 'Received').length,
                      Paid_Value: supPOs.reduce((v, o) => v + o.paidAmount, 0),
                      Outstanding_Due: supPOs.reduce((v, o) => v + o.dueAmount, 0),
                      Avg_Purchase_Price: supPOs.length > 0 ? (supPOs.reduce((v, o) => v + o.netAmount, 0) / supPOs.length).toFixed(2) : 0
                    };
                  }), file: 'Suppliers_Payable_Statements' },
                  { name: 'Purchase Returns Logs', desc: 'Discrepancy logs showing quantities returned, reasons, and return dates.', list: returns, file: 'Purchase_Returns_Fulfillment_Log' },
                  { name: 'Payments Ledger', desc: 'Itemized transaction dates, payment types (cheque/cash/etc), and amounts.', list: payments, file: 'Payments_Intake_Audit' },
                ].map((rep, idx) => (
                  <div key={idx} className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{rep.name}</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{rep.desc}</p>
                    </div>
                    <button
                      onClick={() => handleExportCSV(rep.list, rep.file)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                    >
                      <FileDown className="h-4 w-4 text-blue-500" /> Export CSV Spreadsheet
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: CREATE PURCHASE ORDER */}
      <AnimatePresence>
        {isPoModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">New Purchase Order Form</h3>
                <button onClick={() => setIsPoModalOpen(false)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <X className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSavePO} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 font-bold">Supplier Partner</label>
                    <select
                      value={poSupplierId}
                      onChange={(e) => setPoSupplierId(e.target.value)}
                      required
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1 font-bold">Target Warehouse</label>
                    <select
                      value={poWarehouseId}
                      onChange={(e) => setPoWarehouseId(e.target.value)}
                      required
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                    >
                      <option value="">Select Location</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1 font-bold">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={poExpectedDate}
                      onChange={(e) => setPoExpectedDate(e.target.value)}
                      required
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1 font-bold">Supplier Reference Number</label>
                    <input
                      type="text"
                      value={poRef}
                      onChange={(e) => setPoRef(e.target.value)}
                      placeholder="e.g. INVOICE-4952"
                      className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                {/* Items Management */}
                <div className="space-y-2 border-t border-zinc-150 dark:border-zinc-800 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider">Purchase Items Table</h4>
                    <button
                      type="button"
                      onClick={() => setPoItems([...poItems, { productId: '', quantity: 1, price: 0, discount: 0, vat: 5, tax: 0 }])}
                      className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-[11px] font-bold rounded cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Product Line
                    </button>
                  </div>

                  {poItems.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-800 rounded-lg">No product items added to PO yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {poItems.map((item, index) => {
                        const selectedProd = products.find(p => p.id === item.productId);
                        return (
                          <div key={index} className="flex flex-col sm:flex-row items-center gap-2 bg-zinc-50/50 dark:bg-zinc-950/20 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                            <div className="w-full sm:flex-1">
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Product</label>
                              <select
                                value={item.productId}
                                onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[index].productId = e.target.value;
                                  // Auto populate purchase price from product catalog
                                  const pr = products.find(p => p.id === e.target.value);
                                  if (pr) {
                                    updated[index].price = pr.purchasePrice;
                                  }
                                  setPoItems(updated);
                                }}
                                required
                                className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded"
                              >
                                <option value="">Select Catalog Item</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                              </select>
                            </div>

                            <div className="w-20">
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Qty</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[index].quantity = Number(e.target.value);
                                  setPoItems(updated);
                                }}
                                required
                                className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-bold"
                              />
                            </div>

                            <div className="w-24">
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Price ({poCurrency})</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[index].price = Number(e.target.value);
                                  setPoItems(updated);
                                }}
                                required
                                className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-mono font-bold"
                              />
                            </div>

                            <div className="w-16">
                              <label className="block text-[10px] text-zinc-400 mb-0.5">Disc %</label>
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[index].discount = Number(e.target.value);
                                  setPoItems(updated);
                                }}
                                className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded"
                              />
                            </div>

                            <div className="w-16">
                              <label className="block text-[10px] text-zinc-400 mb-0.5">VAT %</label>
                              <input
                                type="number"
                                value={item.vat}
                                onChange={(e) => {
                                  const updated = [...poItems];
                                  updated[index].vat = Number(e.target.value);
                                  setPoItems(updated);
                                }}
                                className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => setPoItems(poItems.filter((_, i) => i !== index))}
                              className="self-end p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer sm:mb-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Order Notes</label>
                  <textarea
                    rows={2}
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    placeholder="Provide specific notes or special dispatch remarks..."
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPoModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                  >
                    Register PO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECEIVE GOODS GRN */}
      <AnimatePresence>
        {isGrnModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Goods Receive Note (GRN) Register</h3>
                <button onClick={() => setIsGrnModalOpen(false)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <X className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleReceiveGRN} className="flex-1 overflow-y-auto py-4 space-y-4">
                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Select Active Approved Purchase Order</label>
                  <select
                    value={grnPoId}
                    onChange={(e) => {
                      setGrnPoId(e.target.value);
                      const selected = purchaseOrders.find(p => p.id === e.target.value);
                      if (selected) {
                        const itemsState: Record<string, any> = {};
                        selected.items.forEach(it => {
                          itemsState[it.productId] = {
                            qtyToReceive: Math.max(0, it.quantity - it.receivedQuantity),
                            batch: `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
                            mfgDate: '',
                            expiryDate: ''
                          };
                        });
                        setGrnItems(itemsState);
                      }
                    }}
                    required
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  >
                    <option value="">Select PO Reference</option>
                    {purchaseOrders
                      .filter(p => p.purchaseStatus !== 'Received' && p.purchaseStatus !== 'Cancelled' && p.approvedBy)
                      .map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplierName} ({p.purchaseStatus})</option>)}
                  </select>
                </div>

                {grnPoId && (
                  <div className="space-y-4 border-t border-zinc-150 dark:border-zinc-800 pt-4">
                    <h4 className="text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider">Specify Incoming Lots & Received Quantities</h4>
                    
                    <div className="space-y-3">
                      {purchaseOrders.find(p => p.id === grnPoId)?.items.map(item => {
                        const remQty = item.quantity - item.receivedQuantity;
                        const state = grnItems[item.productId] || {};
                        return (
                          <div key={item.productId} className="bg-zinc-50 dark:bg-zinc-950/20 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                            <div className="flex justify-between items-center font-bold text-zinc-700 dark:text-zinc-300">
                              <span>{item.productName} ({item.sku})</span>
                              <span className="text-[10px] text-zinc-500">Ordered: {item.quantity} | Prev Received: {item.receivedQuantity} | Remaining: {remQty}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] text-zinc-400">Receive Quantity</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={remQty}
                                  value={state.qtyToReceive || 0}
                                  onChange={(e) => {
                                    setGrnItems({
                                      ...grnItems,
                                      [item.productId]: { ...state, qtyToReceive: Number(e.target.value) }
                                    });
                                  }}
                                  className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-zinc-400">Batch Number</label>
                                <input
                                  type="text"
                                  value={state.batch || ''}
                                  onChange={(e) => {
                                    setGrnItems({
                                      ...grnItems,
                                      [item.productId]: { ...state, batch: e.target.value }
                                    });
                                  }}
                                  className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-zinc-400">Mfg Date</label>
                                <input
                                  type="date"
                                  value={state.mfgDate || ''}
                                  onChange={(e) => {
                                    setGrnItems({
                                      ...grnItems,
                                      [item.productId]: { ...state, mfgDate: e.target.value }
                                    });
                                  }}
                                  className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-zinc-400">Expiry Date</label>
                                <input
                                  type="date"
                                  value={state.expiryDate || ''}
                                  onChange={(e) => {
                                    setGrnItems({
                                      ...grnItems,
                                      [item.productId]: { ...state, expiryDate: e.target.value }
                                    });
                                  }}
                                  className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">GRN Remarks</label>
                  <textarea
                    rows={2}
                    value={grnRemarks}
                    onChange={(e) => setGrnRemarks(e.target.value)}
                    placeholder="Log comments, damages found on receipt, lot discrepancies..."
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsGrnModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                  >
                    Post Stock Intake
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD PAYMENT */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Log Purchase Order Payment</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <X className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleAddPayment} className="py-4 space-y-4">
                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Purchase Order</label>
                  <select
                    value={payPoId}
                    onChange={(e) => {
                      setPayPoId(e.target.value);
                      const selected = purchaseOrders.find(p => p.id === e.target.value);
                      if (selected) {
                        setPayAmount(selected.dueAmount);
                      }
                    }}
                    required
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  >
                    <option value="">Select PO Reference</option>
                    {purchaseOrders
                      .filter(p => p.dueAmount > 0.01 && p.purchaseStatus !== 'Cancelled')
                      .map(p => <option key={p.id} value={p.id}>{p.poNumber} — Due: {p.currency} {p.dueAmount.toFixed(2)}</option>)}
                  </select>
                </div>

                {payPoId && (
                  <>
                    <div>
                      <label className="block text-zinc-500 mb-1 font-bold">Payment Method</label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        required
                        className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-500 mb-1 font-bold">Payment Type</label>
                        <select
                          value={payType}
                          onChange={(e) => setPayType(e.target.value as any)}
                          required
                          className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                        >
                          <option value="Full">Full Payment</option>
                          <option value="Partial">Partial Payment</option>
                          <option value="Advance">Advance Payment</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-500 mb-1 font-bold">Amount to Pay ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          max={purchaseOrders.find(p => p.id === payPoId)?.dueAmount || 0}
                          value={payAmount}
                          onChange={(e) => setPayAmount(Number(e.target.value))}
                          required
                          className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg font-black font-mono text-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-500 mb-1 font-bold">Transaction Reference / Cheque No</label>
                      <input
                        type="text"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. TXN-948293849"
                        className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-500 mb-1 font-bold">Internal Payment Notes</label>
                      <textarea
                        rows={2}
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="Log reference info, bank ledger metadata..."
                        className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                  >
                    Post Payment Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: PURCHASE RETURN */}
      <AnimatePresence>
        {isReturnModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Purchase Return Intake Form</h3>
                <button onClick={() => setIsReturnModalOpen(false)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <X className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSaveReturn} className="flex-1 overflow-y-auto py-4 space-y-4">
                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Select Received Purchase Order</label>
                  <select
                    value={retPoId}
                    onChange={(e) => {
                      setRetPoId(e.target.value);
                      const selected = purchaseOrders.find(p => p.id === e.target.value);
                      if (selected) {
                        const initRetState: Record<string, number> = {};
                        selected.items.forEach(it => {
                          initRetState[it.productId] = 0;
                        });
                        setRetItems(initRetState);
                      }
                    }}
                    required
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  >
                    <option value="">Select PO Reference</option>
                    {purchaseOrders
                      .filter(p => p.purchaseStatus === 'Received' || p.purchaseStatus === 'Partial')
                      .map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.supplierName}</option>)}
                  </select>
                </div>

                {retPoId && (
                  <div className="space-y-3 border-t border-zinc-150 dark:border-zinc-800 pt-4">
                    <h4 className="text-zinc-800 dark:text-zinc-200 font-bold uppercase tracking-wider">Quantities to Return to Supplier</h4>
                    {purchaseOrders.find(p => p.id === retPoId)?.items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-950/20 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <div className="flex-1">
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">{item.productName}</p>
                          <p className="text-[10px] text-zinc-400">Successfully Received: {item.receivedQuantity}</p>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min={0}
                            max={item.receivedQuantity}
                            value={retItems[item.productId] || 0}
                            onChange={(e) => setRetItems({ ...retItems, [item.productId]: Number(e.target.value) })}
                            className="w-full p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-black font-mono text-rose-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-zinc-500 mb-1 font-bold">Reason for Return</label>
                  <textarea
                    rows={2}
                    value={retReason}
                    onChange={(e) => setRetReason(e.target.value)}
                    required
                    placeholder="Log manufacturing defects, batch damage, shipping issues..."
                    className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-white rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-md cursor-pointer"
                  >
                    Post Return Discrepancy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: INVOICE PRINT AND VIEW */}
      <AnimatePresence>
        {selectedPoForInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">Document Viewer</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3 py-1.5 rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Print Invoice
                  </button>
                  <button onClick={() => setSelectedPoForInvoice(null)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                    <X className="h-4.5 w-4.5 text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div id="printable-invoice" className="flex-1 overflow-y-auto py-6 space-y-6 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-100 dark:border-zinc-900">
                
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 bg-blue-600 flex items-center justify-center text-white font-black rounded text-xl shadow-md">S</div>
                      <span className="text-base font-black tracking-tight">Sky Inventory Pro</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                      Enterprise Warehousing & supply line automation Inc.<br />
                      Level 36, Sky Tower Commercial Hub<br />
                      Dubai, United Arab Emirates<br />
                      Tel: +971 4 000 0000 | Email: accounts@skyinv.pro
                    </p>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <h2 className="text-lg font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Purchase Invoice</h2>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">Invoice Ref: INV-{selectedPoForInvoice.poNumber.split('-')[1]}</p>
                    <p className="text-[10px] text-zinc-500">PO Number: {selectedPoForInvoice.poNumber}</p>
                    <p className="text-[10px] text-zinc-500">Date Issued: {selectedPoForInvoice.purchaseDate}</p>
                  </div>
                </div>

                <hr className="border-zinc-150 dark:border-zinc-900" />

                {/* Partner Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Supplier Vendor</h4>
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{selectedPoForInvoice.supplierName}</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Assigned accounts partner portal<br />
                      Tax Identification: TXN-3849502-AED<br />
                      Verified B2B distribution channel partner
                    </p>
                  </div>

                  <div className="space-y-1 text-left sm:text-right">
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-medium">Deliver To location</h4>
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{selectedPoForInvoice.warehouseName}</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Fulfillment hub cross-docking center<br />
                      Frictionless logistics entry point
                    </p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500">
                        <th className="p-2.5">Catalog Product</th>
                        <th className="p-2.5">SKU Code</th>
                        <th className="p-2.5">Order Qty</th>
                        <th className="p-2.5">Price</th>
                        <th className="p-2.5">Discount %</th>
                        <th className="p-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                      {selectedPoForInvoice.items.map((it, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold text-zinc-800 dark:text-zinc-200">{it.productName}</td>
                          <td className="p-2.5 font-mono text-zinc-500">{it.sku}</td>
                          <td className="p-2.5 text-zinc-700 dark:text-zinc-300 font-bold">{it.quantity} {it.unit}</td>
                          <td className="p-2.5 font-mono text-zinc-600 dark:text-zinc-400">${it.purchasePrice.toFixed(2)}</td>
                          <td className="p-2.5 font-mono text-zinc-500">{it.discount}%</td>
                          <td className="p-2.5 text-right font-bold text-zinc-800 dark:text-zinc-100 font-mono">${it.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tax summary / totals */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                  <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
                    <div className="h-14 w-14 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center rounded">
                      <span className="text-[6px] font-bold text-zinc-400 tracking-wider">QR AUDIT</span>
                      <ShoppingCart className="h-6 w-6 text-blue-600" />
                      <span className="text-[6px] font-mono text-zinc-400 mt-1">{selectedPoForInvoice.poNumber}</span>
                    </div>
                    <div className="space-y-0.5 text-[10px] text-zinc-500 font-medium">
                      <p>Fulfillment: {selectedPoForInvoice.purchaseStatus}</p>
                      <p>Finances: {selectedPoForInvoice.paymentStatus}</p>
                      <p>Secure Ledger Stamp: SHA256-V2</p>
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-1.5 text-right text-xs">
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Subtotal Value:</span>
                      <span className="font-mono">${selectedPoForInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Vendor Discount:</span>
                      <span className="font-mono text-emerald-600">-${selectedPoForInvoice.discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Tax / VAT (5%):</span>
                      <span className="font-mono">${selectedPoForInvoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2 font-black text-sm text-zinc-800 dark:text-zinc-100">
                      <span>Grand Total:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">${selectedPoForInvoice.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-bold">
                      <span>Total Paid:</span>
                      <span className="font-mono text-emerald-600">${selectedPoForInvoice.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-bold">
                      <span>Amount Due:</span>
                      <span className="font-mono text-rose-500">${selectedPoForInvoice.dueAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Signature and footer Area */}
                <div className="pt-8 grid grid-cols-2 gap-4 text-center text-[10px] text-zinc-500">
                  <div className="space-y-8">
                    <div className="border-b border-zinc-300 dark:border-zinc-800 h-8 max-w-[150px] mx-auto"></div>
                    <p className="font-bold uppercase tracking-wider">Authorized Buyer Stamp</p>
                  </div>
                  <div className="space-y-8">
                    <div className="border-b border-zinc-300 dark:border-zinc-800 h-8 max-w-[150px] mx-auto"></div>
                    <p className="font-bold uppercase tracking-wider">Receiving Manager Signature</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: SUPPLIER DETAIL POPUP */}
      <AnimatePresence>
        {selectedSupplierForDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col text-xs"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Supplier Account Statement</h3>
                <button onClick={() => setSelectedSupplierForDetail(null)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                  <X className="h-4.5 w-4.5 text-zinc-500" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/20 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div className="h-12 w-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold uppercase">
                    {selectedSupplierForDetail.companyName.substring(0,2)}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-zinc-800 dark:text-zinc-100">{selectedSupplierForDetail.companyName}</h4>
                    <p className="text-zinc-500">Contact Person: {selectedSupplierForDetail.supplierName}</p>
                    <p className="text-zinc-400">Tax Registration Number: {selectedSupplierForDetail.taxNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Supply Line Transaction History</h5>
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                    {purchaseOrders.filter(p => p.supplierId === selectedSupplierForDetail.id).length === 0 ? (
                      <p className="p-4 text-center text-zinc-500">No purchase history logged for this vendor.</p>
                    ) : (
                      purchaseOrders
                        .filter(p => p.supplierId === selectedSupplierForDetail.id)
                        .slice(0, 5)
                        .map(po => (
                          <div key={po.id} className="p-3 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-zinc-700 dark:text-zinc-300 font-mono">{po.poNumber}</p>
                              <p className="text-[10px] text-zinc-400">Fulfillment: {po.purchaseStatus}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">${po.netAmount.toFixed(2)}</p>
                              <p className="text-[10px] text-rose-500 font-mono">Due: ${po.dueAmount.toFixed(2)}</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedSupplierForDetail(null)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Dismiss Statement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
