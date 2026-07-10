import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Product, Customer, Warehouse, SalesOrder, SalesOrderItem, SalesPayment, CustomerLedgerEntry, SalesHistoryEntry, InventoryRecord, InventoryTransaction } from '../types';
import { generateBarcodeDataURL, generateQRDataURL } from '../utils/barcodes';
import { 
  Search, Barcode, ShieldAlert, ShoppingCart, User, Building, Landmark,
  X, Check, Plus, Minus, Settings, Trash2, Folder, Award, ArrowRight,
  Printer, Printer as PrintIcon, Calculator, Clipboard, CreditCard, DollarSign, Smartphone,
  RotateCcw, Sparkles, RefreshCw, Layers, ShieldCheck, Mail, Phone, MapPin
} from 'lucide-react';

export const POS: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);

  // Cart & Sales states
  const [cart, setCart] = useState<{ product: Product; quantity: number; customPrice?: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  
  // Search & Filter
  const [searchProduct, setSearchProduct] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  // Pricing & Finance overrides
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [vatPercent, setVatPercent] = useState<number>(5); // default 5%
  const [taxPercent, setTaxPercent] = useState<number>(2); // default 2% other tax
  const [couponCode, setCouponCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Banking' | 'Cheque' | 'Split'>('Cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [cashSplit, setCashSplit] = useState<number>(0);
  const [cardSplit, setCardSplit] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState<string>('');
  
  // UI Panels / Modals
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [invoicePreview, setInvoicePreview] = useState<SalesOrder | null>(null);
  const [barcodeQrUrls, setBarcodeQrUrls] = useState<{ barcode: string; qr: string } | null>(null);
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [holdOrders, setHoldOrders] = useState<{ id: string; name: string; cart: typeof cart; customerId?: string; warehouseId?: string; notes: string; date: string }[]>([]);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdName, setHoldName] = useState('');

  // Quick Customer Add Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustType, setNewCustType] = useState<'Retail' | 'Wholesale' | 'VIP' | 'Corporate'>('Retail');

  // Input ref for quick barcode scanner focus
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  // RBAC Roles
  const isStaff = profile?.role === 'Staff';
  const canOverridePrice = !isStaff; // Managers and Admins can override prices

  // Load Real-time Data
  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name', 'asc')), (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('fullName', 'asc')), (snap) => {
      const list: Customer[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Customer));
      setCustomers(list);
    });

    const unsubWarehouses = onSnapshot(query(collection(db, 'warehouses'), orderBy('name', 'asc')), (snap) => {
      const list: Warehouse[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Warehouse));
      setWarehouses(list);
      if (list.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(list[0]); // default to first warehouse
      }
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      const list: InventoryRecord[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as InventoryRecord));
      setInventory(list);
    });

    // Load hold orders from local storage
    const savedHolds = localStorage.getItem('pos_hold_sales');
    if (savedHolds) {
      setHoldOrders(JSON.parse(savedHolds));
    }

    return () => {
      unsubProducts();
      unsubCustomers();
      unsubWarehouses();
      unsubInventory();
    };
  }, [user]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        barcodeScanInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) handleHoldSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) handleCheckoutSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, selectedWarehouse, amountPaid, paymentMethod]);

  // Handle barcode/QR simulation
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedProduct = products.find(p => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim());
    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
      setNotification({
        type: 'success',
        title: 'Barcode Scanned',
        message: `${matchedProduct.name} added to cart.`
      });
    } else {
      setNotification({
        type: 'error',
        title: 'Barcode Not Found',
        message: `No product registered with Barcode/SKU: "${barcodeInput}"`
      });
    }
  };

  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as typeof cart;
    setCart(updated);
  };

  const updatePrice = (productId: string, price: number) => {
    if (!canOverridePrice) {
      setNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'Only Admin and Managers are authorized to override selling prices.'
      });
      return;
    }
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, customPrice: price };
      }
      return item;
    });
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setCouponCode('');
    setNotes('');
    setAmountPaid('');
  };

  // Coupon application logic
  const handleApplyCoupon = () => {
    const uppercaseCode = couponCode.trim().toUpperCase();
    if (uppercaseCode === 'VIP20') {
      setDiscountPercent(20);
      setNotification({ type: 'success', title: 'Coupon Applied', message: 'VIP 20% discount successfully activated!' });
    } else if (uppercaseCode === 'SALE10') {
      setDiscountPercent(10);
      setNotification({ type: 'success', title: 'Coupon Applied', message: 'SALE 10% discount successfully activated!' });
    } else if (uppercaseCode === 'LOYAL5') {
      setDiscountPercent(5);
      setNotification({ type: 'success', title: 'Coupon Applied', message: 'Loyalty 5% discount successfully activated!' });
    } else {
      setNotification({ type: 'error', title: 'Invalid Coupon', message: 'Provided promo code is expired or invalid.' });
    }
  };

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.product.sellingPrice;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getDiscountAmount = () => {
    return (getSubtotal() * discountPercent) / 100;
  };

  const getVatAmount = () => {
    return ((getSubtotal() - getDiscountAmount()) * vatPercent) / 100;
  };

  const getTaxAmount = () => {
    return ((getSubtotal() - getDiscountAmount()) * taxPercent) / 100;
  };

  const getGrandTotal = () => {
    return getSubtotal() - getDiscountAmount() + getVatAmount() + getTaxAmount();
  };

  const getProfitAmount = () => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.product.sellingPrice;
      const profitPerUnit = price - (item.product.purchasePrice || 0);
      return sum + (profitPerUnit * item.quantity);
    }, 0);
  };

  // Hold / Resume Sales
  const handleHoldSale = () => {
    if (cart.length === 0) return;
    if (!holdName.trim()) {
      setShowHoldModal(true);
      return;
    }

    const newHold = {
      id: `HOLD-${Date.now()}`,
      name: holdName,
      cart: [...cart],
      customerId: selectedCustomer?.id,
      warehouseId: selectedWarehouse?.id,
      notes,
      date: new Date().toISOString()
    };

    const updated = [newHold, ...holdOrders];
    setHoldOrders(updated);
    localStorage.setItem('pos_hold_sales', JSON.stringify(updated));
    setHoldName('');
    setShowHoldModal(false);
    handleClearCart();
    setNotification({
      type: 'success',
      title: 'Sale Put on Hold',
      message: `Transaction saved as "${newHold.name}" successfully.`
    });
  };

  const resumeHoldSale = (holdId: string) => {
    const found = holdOrders.find(h => h.id === holdId);
    if (!found) return;

    setCart(found.cart);
    if (found.customerId) {
      const cust = customers.find(c => c.id === found.customerId);
      if (cust) setSelectedCustomer(cust);
    }
    if (found.warehouseId) {
      const wh = warehouses.find(w => w.id === found.warehouseId);
      if (wh) setSelectedWarehouse(wh);
    }
    setNotes(found.notes);

    // Remove from holds
    const updated = holdOrders.filter(h => h.id !== holdId);
    setHoldOrders(updated);
    localStorage.setItem('pos_hold_sales', JSON.stringify(updated));

    setNotification({
      type: 'success',
      title: 'Sale Resumed',
      message: `Transaction restored to active POS cart.`
    });
  };

  // Quick Calculator logic
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
    } else if (val === '=') {
      try {
        // Safe evaluation without eval
        const res = Function(`"use strict"; return (${calcInput})`)();
        setCalcInput(String(res));
        setAmountPaid(String(res)); // apply directly to amount paid if applicable
      } catch {
        setCalcInput('Error');
      }
    } else {
      setCalcInput(prev => prev + val);
    }
  };

  // Quick Customer Creation
  const handleQuickAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const customId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
      const newRef = doc(collection(db, 'customers'));
      const timestamp = new Date().toISOString();
      const newCust: Customer = {
        id: newRef.id,
        customerId: customId,
        fullName: newCustName,
        companyName: newCustCompany,
        phone: newCustPhone,
        email: newCustEmail,
        address: '',
        city: '',
        country: '',
        customerType: newCustType,
        creditLimit: 2000,
        openingBalance: 0,
        currentBalance: 0,
        loyaltyPoints: 0,
        notes: 'Created via Retail POS checkout quick interface.',
        status: 'Active',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user?.uid || 'pos'
      };

      await setDoc(newRef, newCust);
      setSelectedCustomer(newCust);
      setQuickAddCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustCompany('');

      setNotification({
        type: 'success',
        title: 'Customer Added',
        message: `${newCustName} was registered and auto-selected.`
      });
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', title: 'Quick Add Failed', message: 'Unable to register guest customer.' });
    }
  };

  // POS Checkout process with strict Inventory updates!
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', title: 'POS Empty', message: 'Your shopping cart is currently empty.' });
      return;
    }
    if (!selectedWarehouse) {
      setNotification({ type: 'error', title: 'Warehouse Required', message: 'Please select a warehouse to issue stock.' });
      return;
    }
    if (!selectedCustomer) {
      setNotification({ type: 'error', title: 'Customer Required', message: 'Please select or add a customer to finalize sale.' });
      return;
    }

    const totalToPay = getGrandTotal();
    const parsedPaid = Number(amountPaid || totalToPay);
    
    // Check credit limits if customer is paying less than total
    const balanceIncrease = totalToPay - parsedPaid;
    if (balanceIncrease > 0) {
      const projectedBalance = selectedCustomer.currentBalance + balanceIncrease;
      if (projectedBalance > selectedCustomer.creditLimit) {
        setNotification({
          type: 'error',
          title: 'Credit Limit Exceeded',
          message: `This customer's outstanding debt ($${projectedBalance.toFixed(2)}) will exceed their credit limit ($${selectedCustomer.creditLimit.toFixed(2)}).`
        });
        return;
      }
    }

    // 1. VALIDATION OF AVAILABLE STOCK IN SELECTED WAREHOUSE
    const stockVerificationErrors: string[] = [];
    const stockUpdatesToCommit: { inventoryDocId: string; newStock: number; newWarehouseStock: Record<string, number>; currentRec: InventoryRecord; qtyDeducted: number }[] = [];
    const productUpdatesToCommit: { productDocId: string; newQty: number }[] = [];

    for (const cartItem of cart) {
      const prod = cartItem.product;
      const neededQty = cartItem.quantity;

      // Find matched InventoryRecord
      const invRecord = inventory.find(i => i.productId === prod.id);
      if (!invRecord) {
        stockVerificationErrors.push(`Inventory Record not found for: ${prod.name}`);
        continue;
      }

      // Check warehouse stock
      const whStock = invRecord.warehouseStock?.[selectedWarehouse.id] || 0;
      if (whStock < neededQty) {
        stockVerificationErrors.push(`Insufficient stock for "${prod.name}" in ${selectedWarehouse.name}. Available: ${whStock} ${prod.unit || 'units'}, Requested: ${neededQty}.`);
      } else {
        // Prep updates
        const updatedWarehouseStock = { ...invRecord.warehouseStock };
        updatedWarehouseStock[selectedWarehouse.id] = whStock - neededQty;

        const newTotalStock = invRecord.currentStock - neededQty;

        stockUpdatesToCommit.push({
          inventoryDocId: invRecord.id,
          newStock: newTotalStock,
          newWarehouseStock: updatedWarehouseStock,
          currentRec: invRecord,
          qtyDeducted: neededQty
        });

        productUpdatesToCommit.push({
          productDocId: prod.id,
          newQty: (prod.stockQuantity || 0) - neededQty
        });
      }
    }

    if (stockVerificationErrors.length > 0) {
      setNotification({
        type: 'error',
        title: 'Stock Validation Failed',
        message: stockVerificationErrors.join(' | ')
      });
      return;
    }

    // 2. COMMIT DATABASE OPERATIONS
    try {
      const timestamp = new Date().toISOString();
      const creatorUid = user?.uid || 'unknown';
      const creatorName = profile?.fullName || 'Salesperson';
      const referenceNum = transactionRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = doc(collection(db, 'sales_orders')).id;

      const salesNum = `SO-${Math.floor(100000 + Math.random() * 900000)}`;
      const invoiceNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

      // Calculate gross profit and net profit
      const grossProfit = getProfitAmount();
      const netProfit = grossProfit - getDiscountAmount(); // subtract direct discount

      // Build items array
      const itemsMapped: SalesOrderItem[] = cart.map(item => {
        const sprice = item.customPrice !== undefined ? item.customPrice : item.product.sellingPrice;
        return {
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          quantity: item.quantity,
          unit: item.product.unit || 'pcs',
          sellingPrice: sprice,
          discount: discountPercent,
          vat: vatPercent,
          tax: taxPercent,
          subtotal: sprice * item.quantity
        };
      });

      // Assemble final Sales Order Document
      const finalSalesOrder: SalesOrder = {
        id: orderId,
        salesNumber: salesNum,
        invoiceNumber: invoiceNum,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        warehouseId: selectedWarehouse.id,
        warehouseName: selectedWarehouse.name,
        salesDate: timestamp,
        salesStatus: 'Completed',
        paymentStatus: parsedPaid >= totalToPay ? 'Paid' : parsedPaid > 0 ? 'Partial' : 'Unpaid',
        salesperson: creatorUid,
        salespersonName: creatorName,
        referenceNumber: referenceNum,
        notes,
        items: itemsMapped,
        subtotal: getSubtotal(),
        discountAmount: getDiscountAmount(),
        vatAmount: getVatAmount(),
        taxAmount: getTaxAmount(),
        grandTotal: totalToPay,
        paidAmount: parsedPaid,
        dueAmount: Math.max(0, totalToPay - parsedPaid),
        grossProfit,
        netProfit,
        couponCode: couponCode || undefined,
        paymentMethod,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
        createdByName: creatorName,
        status: 'Active'
      };

      // Create Sales Order
      await setDoc(doc(db, 'sales_orders', orderId), finalSalesOrder);

      // Create Individual Sales Items
      for (const item of itemsMapped) {
        const itemId = doc(collection(db, 'sales_items')).id;
        await setDoc(doc(db, 'sales_items', itemId), {
          id: itemId,
          salesOrderId: orderId,
          salesNumber: salesNum,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          barcode: item.barcode || '',
          quantity: item.quantity,
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          discount: item.discount,
          vat: item.vat,
          tax: item.tax,
          subtotal: item.subtotal,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid,
          status: 'Active'
        });
      }

      // Create Payment Document (if cash/payment registered)
      if (parsedPaid > 0) {
        const paymentId = doc(collection(db, 'sales_payments')).id;
        const salesPay: SalesPayment = {
          id: paymentId,
          paymentNumber: `SPAY-${Math.floor(100000 + Math.random() * 900000)}`,
          salesOrderId: orderId,
          salesNumber: salesNum,
          paymentMethod,
          splitDetails: paymentMethod === 'Split' ? [
            { method: 'Cash', amount: cashSplit },
            { method: 'Card', amount: cardSplit }
          ] : undefined,
          paymentType: parsedPaid >= totalToPay ? 'Full' : 'Partial',
          amount: parsedPaid,
          transactionReference: referenceNum,
          paymentDate: timestamp,
          notes: 'POS Instant Check-out checkout.',
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid,
          status: 'Completed'
        };
        await setDoc(doc(db, 'sales_payments', paymentId), salesPay);
      }

      // Update Stock (Decrement inventory and product balances!)
      for (const updateObj of stockUpdatesToCommit) {
        // A. Inventory Record
        const invRef = doc(db, 'inventory', updateObj.inventoryDocId);
        const nextStatus = updateObj.newStock <= 0 
          ? 'Out of Stock' 
          : updateObj.newStock <= updateObj.currentRec.minStockLevel 
            ? 'Low Stock' 
            : 'In Stock';

        await updateDoc(invRef, {
          currentStock: updateObj.newStock,
          availableStock: updateObj.newStock,
          warehouseStock: updateObj.newWarehouseStock,
          stockStatus: nextStatus,
          lastStockUpdate: timestamp,
          updatedAt: timestamp
        });

        // B. Product Record
        const prodRef = doc(db, 'products', updateObj.currentRec.productId);
        await updateDoc(prodRef, {
          stockQuantity: updateObj.newStock,
          updatedAt: timestamp
        });

        // C. Record Inventory Transaction entry
        const txRef = doc(collection(db, 'inventory_transactions'));
        const invTx: InventoryTransaction = {
          id: txRef.id,
          referenceNumber: invoiceNum,
          transactionType: 'Stock Out',
          productId: updateObj.currentRec.productId,
          productName: updateObj.currentRec.productName,
          sku: updateObj.currentRec.sku,
          barcode: updateObj.currentRec.barcode || '',
          quantity: -updateObj.qtyDeducted, // negative represents sales out
          previousQuantity: updateObj.currentRec.currentStock,
          newQuantity: updateObj.newStock,
          difference: -updateObj.qtyDeducted,
          warehouseId: selectedWarehouse.id,
          warehouseName: selectedWarehouse.name,
          reason: 'Sales',
          requestedBy: creatorUid,
          approvedBy: creatorUid,
          remarks: `Sold via Invoice ${invoiceNum} under sales order ${salesNum}`,
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

        // D. Trigger alert notifications if stock hits low limit after sale
        if (updateObj.newStock <= updateObj.currentRec.minStockLevel) {
          const notifRef = doc(collection(db, 'inventory_notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            type: 'Low Stock',
            productId: updateObj.currentRec.productId,
            sku: updateObj.currentRec.sku,
            message: `⚠️ Alert: Stock for "${updateObj.currentRec.productName}" is running low after POS Sale! Current balance: ${updateObj.newStock} units.`,
            read: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: 'system',
            status: 'Active'
          });
        }
      }

      // Update Customer Ledger outstanding balances & Award Loyalty points!
      // Formula: 1 loyalty point awarded for every $10 spent on sales totals
      const loyaltyEarned = Math.floor(totalToPay / 10);
      const custRef = doc(db, 'customers', selectedCustomer.id);
      const newBalance = selectedCustomer.currentBalance + (totalToPay - parsedPaid);
      const newLoyalty = (selectedCustomer.loyaltyPoints || 0) + loyaltyEarned;

      await updateDoc(custRef, {
        currentBalance: newBalance,
        loyaltyPoints: newLoyalty,
        lastPurchaseDate: timestamp,
        lastPurchaseAmount: totalToPay,
        updatedAt: timestamp
      });

      // Write sale into customer ledger
      const ledgerSalesRef = doc(collection(db, 'customer_ledger'));
      const ledgerSales: CustomerLedgerEntry = {
        id: ledgerSalesRef.id,
        customerId: selectedCustomer.id,
        transactionType: 'Sale',
        referenceId: orderId,
        referenceNumber: invoiceNum,
        debit: totalToPay,
        credit: 0,
        balanceAfter: newBalance,
        description: `Purchased goods via POS checkout on Invoice ${invoiceNum}. Earned +${loyaltyEarned} loyalty points.`,
        transactionDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid
      };
      await setDoc(ledgerSalesRef, ledgerSales);

      // Write payment into customer ledger if paid
      if (parsedPaid > 0) {
        const ledgerPayRef = doc(collection(db, 'customer_ledger'));
        const ledgerPay: CustomerLedgerEntry = {
          id: ledgerPayRef.id,
          customerId: selectedCustomer.id,
          transactionType: 'Payment',
          referenceId: orderId,
          referenceNumber: invoiceNum,
          debit: 0,
          credit: parsedPaid,
          balanceAfter: newBalance, // simple sync
          description: `Paid $${parsedPaid.toFixed(2)} cash/card payment via POS.`,
          transactionDate: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: creatorUid
        };
        await setDoc(ledgerPayRef, ledgerPay);
      }

      // Register Sales Audit history entry
      const histRef = doc(collection(db, 'sales_history'));
      const salesHist: SalesHistoryEntry = {
        id: histRef.id,
        salesOrderId: orderId,
        salesNumber: salesNum,
        action: 'Sale Completed',
        details: `POS invoice ${invoiceNum} of $${totalToPay.toFixed(2)} finalized and stock reduced.`,
        operatorName: creatorName,
        operatorId: creatorUid,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: creatorUid,
        status: 'Active'
      };
      await setDoc(histRef, salesHist);

      // Trigger large sale alert if grand total > $5000
      if (totalToPay > 5000) {
        const notifRef = doc(collection(db, 'inventory_notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          type: 'Large Sale',
          productId: 'general',
          sku: 'POS',
          message: `📢 Notification: High-value POS Sale completed by ${creatorName}! Total value: $${totalToPay.toFixed(2)} for ${selectedCustomer.fullName}.`,
          read: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: 'system',
          status: 'Active'
        });
      }

      // Generate Barcode / QR base64 URLs for invoice printing
      const barcodeUrl = generateBarcodeDataURL(invoiceNum);
      const qrUrl = await generateQRDataURL(`https://skyinventory.com/verify/invoice/${invoiceNum}`);
      setBarcodeQrUrls({ barcode: barcodeUrl, qr: qrUrl });

      setNotification({
        type: 'success',
        title: 'Checkout Completed',
        message: `Invoice ${invoiceNum} generated. Total: $${totalToPay.toFixed(2)}`
      });

      setInvoicePreview(finalSalesOrder);
      handleClearCart();

    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Transaction Error',
        message: 'A database write conflict occurred. Please verify connectivity.'
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchProduct.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchProduct.toLowerCase()) ||
                          p.barcode.includes(searchProduct);
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    return matchesSearch && matchesCat && matchesBrand;
  });

  // Extract unique categories and brands for filtering UI
  const categoriesList = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const brandsList = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  const changeDue = Math.max(0, Number(amountPaid || 0) - getGrandTotal());

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col xl:flex-row gap-4 overflow-hidden relative">
      
      {/* LEFT COLUMN: Product Catalog & Touch selectors (2/3 width) */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-full">
        
        {/* Search, filters & barcode scanning */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-800 space-y-3 flex-shrink-0">
          <div className="flex flex-col md:flex-row gap-3">
            
            {/* Standard Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search catalog by name, code or SKU..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
              />
            </div>

            {/* simulated scan */}
            <form onSubmit={handleBarcodeSubmit} className="relative w-full md:w-80 flex">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  ref={barcodeScanInputRef}
                  type="text"
                  placeholder="Barcode Scanner [Press F4]..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-l-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 rounded-r-lg border-y border-r border-blue-600 transition"
              >
                Scan
              </button>
            </form>

            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-zinc-300 transition flex items-center justify-center"
              title="Toggle Calculator"
            >
              <Calculator className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 select-none scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition whitespace-nowrap ${
                selectedCategory === 'All' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-950 border-slate-800 text-zinc-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-bold rounded-full border transition whitespace-nowrap ${
                  selectedCategory === cat ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-950 border-slate-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/5">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <Folder className="h-12 w-12 text-slate-800 mb-3" />
              <span className="font-bold">No products match search filters</span>
              <span className="text-xs text-zinc-600 mt-1">Make sure you have registered inventory or adjust the search params.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(prod => {
                // Find stock level in selected warehouse
                const invRec = inventory.find(i => i.productId === prod.id);
                const warehouseStockBalance = selectedWarehouse 
                  ? (invRec?.warehouseStock?.[selectedWarehouse.id] || 0)
                  : 0;

                const isLow = warehouseStockBalance <= (prod.lowStockLimit || 10);
                const isOut = warehouseStockBalance <= 0;

                return (
                  <button
                    key={prod.id}
                    disabled={isOut}
                    onClick={() => addToCart(prod)}
                    className={`bg-slate-900 border text-left p-3.5 rounded-xl transition flex flex-col justify-between h-36 relative overflow-hidden group select-none ${
                      isOut 
                        ? 'opacity-40 border-slate-800 cursor-not-allowed' 
                        : isLow 
                          ? 'border-amber-500/30 hover:border-amber-400 bg-amber-950/5'
                          : 'border-slate-800 hover:border-blue-500/60 hover:bg-slate-850/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-white font-bold text-sm line-clamp-2 leading-tight flex-1">
                          {prod.name}
                        </span>
                        {isLow && !isOut && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase px-1 rounded-full flex-shrink-0">
                            Low
                          </span>
                        )}
                        {isOut && (
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase px-1 rounded-full flex-shrink-0">
                            Out
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 block">
                        {prod.sku}
                      </span>
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-800/60 pt-2 mt-2">
                      <span className="text-base font-bold text-blue-400 font-mono">
                        ${prod.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[11px] font-bold font-mono ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {warehouseStockBalance} {prod.unit || 'pcs'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Warehouse footer indicator */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 flex-shrink-0 gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-zinc-500" />
            <span>Issuing Warehouse:</span>
            <select
              className="bg-slate-900 border border-slate-800 text-white rounded font-bold px-1.5 py-0.5"
              value={selectedWarehouse?.id || ''}
              onChange={(e) => {
                const wh = warehouses.find(w => w.id === e.target.value);
                if (wh) setSelectedWarehouse(wh);
              }}
            >
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>[F4] Focus Scanner</span>
            <span>[F8] Hold</span>
            <span>[F9] Reset</span>
            <span>[F10] Checkout</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, discounts & payments (1/3 width) */}
      <div className="w-full xl:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-full flex-shrink-0">
        
        {/* Cart Header */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" />
            <h3 className="font-bold text-white text-sm">Active Sale Cart</h3>
            <span className="bg-blue-600/10 text-blue-400 text-xs font-bold font-mono px-1.5 py-0.5 rounded-full">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>
          <button
            onClick={handleClearCart}
            className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1 font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        {/* Customer Select dropdown / Quick Add */}
        <div className="p-3 bg-slate-950/10 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <select
              className="w-full bg-slate-950 border border-slate-800 text-zinc-300 text-xs rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const cust = customers.find(c => c.id === e.target.value);
                setSelectedCustomer(cust || null);
              }}
            >
              <option value="">Select Customer (Required)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.fullName} ({c.customerId})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setQuickAddCustomerOpen(true)}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition flex items-center justify-center shrink-0"
            title="Quick Register Customer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Cart Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-2 space-y-1 select-none">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <ShoppingCart className="h-10 w-10 text-slate-800 mb-2" />
              <span className="text-xs font-bold text-zinc-600">POS Cart is currently empty</span>
              <span className="text-[10px] text-zinc-600 mt-0.5">Scan barcode or tap products.</span>
            </div>
          ) : (
            cart.map(item => {
              const basePrice = item.product.sellingPrice;
              const displayPrice = item.customPrice !== undefined ? item.customPrice : basePrice;

              return (
                <div key={item.product.id} className="p-2 hover:bg-slate-950/20 rounded-lg transition flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1">
                      <span className="text-xs text-white font-bold block leading-tight">
                        {item.product.name}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider mt-0.5 block">
                        {item.product.sku}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-slate-850"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-0.5 text-xs font-bold text-white font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="px-1.5 py-0.5 text-zinc-400 hover:text-white hover:bg-slate-850"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Pricing Display / override */}
                    <div className="flex items-center gap-1 text-right">
                      {canOverridePrice ? (
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-1 max-w-[80px]">
                          <span className="text-[10px] text-zinc-500">$</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-none text-right font-mono text-xs text-white focus:outline-none p-0.5"
                            value={item.customPrice !== undefined ? item.customPrice : basePrice}
                            onChange={(e) => updatePrice(item.product.id, Number(e.target.value))}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-zinc-300 font-mono">
                          ${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      
                      <span className="text-xs font-bold text-blue-400 font-mono pl-2">
                        ${(displayPrice * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pricing Summaries / Coupons Panel */}
        <div className="bg-slate-950/45 p-4 border-t border-slate-800 space-y-3 flex-shrink-0">
          
          {/* Coupon codes & custom Notes */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo Coupon Code (e.g. VIP20)..."
              className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 uppercase font-mono"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              onClick={handleApplyCoupon}
              className="bg-slate-800 hover:bg-slate-700 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              Apply
            </button>
          </div>

          {/* Checkout calculations */}
          <div className="space-y-1.5 text-xs text-zinc-400 border-t border-slate-800/50 pt-2.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-white font-mono">${getSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-mono">-${getDiscountAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({vatPercent}%):</span>
              <span className="text-white font-mono">+${getVatAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Tax ({taxPercent}%):</span>
              <span className="text-white font-mono">+${getTaxAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between text-base font-bold text-white border-t border-slate-800 pt-2 mt-1">
              <span>Grand Total:</span>
              <span className="text-blue-400 font-mono">${getGrandTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase block">Payment Method</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => { setPaymentMethod('Cash'); setCashSplit(0); setCardSplit(0); }}
                className={`py-1 text-[10px] font-bold rounded border transition flex flex-col items-center gap-0.5 ${
                  paymentMethod === 'Cash' ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-zinc-400 hover:text-white'
                }`}
              >
                <DollarSign className="h-3 w-3" /> Cash
              </button>
              <button
                onClick={() => { setPaymentMethod('Card'); setCashSplit(0); setCardSplit(0); }}
                className={`py-1 text-[10px] font-bold rounded border transition flex flex-col items-center gap-0.5 ${
                  paymentMethod === 'Card' ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-slate-900 border-slate-800 text-zinc-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-3 w-3" /> Card
              </button>
              <button
                onClick={() => { setPaymentMethod('Split'); setCashSplit(Math.round(getGrandTotal() / 2)); setCardSplit(Math.round(getGrandTotal() / 2)); }}
                className={`py-1 text-[10px] font-bold rounded border transition flex flex-col items-center gap-0.5 ${
                  paymentMethod === 'Split' ? 'bg-purple-600/10 border-purple-500/30 text-purple-400' : 'bg-slate-900 border-slate-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3 w-3" /> Split (50/50)
              </button>
            </div>
          </div>

          {/* Split Payment configurations */}
          {paymentMethod === 'Split' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold block">Cash Split ($)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs rounded p-1 text-right mt-0.5"
                  value={cashSplit}
                  onChange={(e) => {
                    const cash = Number(e.target.value);
                    setCashSplit(cash);
                    setCardSplit(Math.max(0, getGrandTotal() - cash));
                    setAmountPaid(String(getGrandTotal()));
                  }}
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 font-bold block">Card Split ($)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs rounded p-1 text-right mt-0.5"
                  value={cardSplit}
                  onChange={(e) => {
                    const card = Number(e.target.value);
                    setCardSplit(card);
                    setCashSplit(Math.max(0, getGrandTotal() - card));
                    setAmountPaid(String(getGrandTotal()));
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick Cash Buttons & Amount Input */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Amount Tendered ($)</label>
              {changeDue > 0 && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/15 px-1 rounded font-mono">
                  Change: ${changeDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder={`Enter amount or exact ($${getGrandTotal().toFixed(2)})`}
                className="flex-1 bg-slate-950 border border-slate-850 text-white font-mono text-sm font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              <button
                onClick={() => setAmountPaid(String(getGrandTotal()))}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2 rounded-lg transition shrink-0"
              >
                Exact
              </button>
            </div>

            {/* Cash Shortcuts */}
            <div className="grid grid-cols-4 gap-1">
              {[10, 20, 50, 100].map(cashVal => (
                <button
                  key={cashVal}
                  onClick={() => setAmountPaid(String(cashVal))}
                  className="py-1 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-zinc-400 hover:text-white font-mono text-[10px] rounded transition"
                >
                  ${cashVal}
                </button>
              ))}
            </div>
          </div>

          {/* Main Checkout Button */}
          <button
            onClick={handleCheckoutSubmit}
            disabled={cart.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-600/15 mt-2 transition"
          >
            <ShieldCheck className="h-5 w-5" /> Process POS Sale [F10]
          </button>

          <button
            onClick={handleHoldSale}
            disabled={cart.length === 0}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-zinc-300 font-bold text-xs py-1.5 rounded-lg transition"
          >
            Hold Current Transaction [F8]
          </button>
        </div>
      </div>

      {/* Floating Calculator widget */}
      {showCalculator && (
        <div className="absolute left-4 bottom-16 bg-slate-900 border border-slate-800 rounded-xl p-4 w-60 shadow-2xl z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-xs text-white flex items-center gap-1">
              <Calculator className="h-4.5 w-4.5 text-blue-500" /> POS Calculator
            </span>
            <button onClick={() => setShowCalculator(false)} className="text-zinc-500 hover:text-white p-0.5 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            readOnly
            className="w-full bg-slate-950 border border-slate-800 text-right font-mono text-lg text-white font-bold rounded px-2.5 py-1.5 mb-2 focus:outline-none"
            value={calcInput || '0'}
          />
          <div className="grid grid-cols-4 gap-1.5">
            {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', 'C', '=', '+'].map(char => (
              <button
                key={char}
                onClick={() => handleCalcPress(char)}
                className={`py-2 text-xs font-bold rounded font-mono transition ${
                  char === '=' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                  char === 'C' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  ['/', '*', '-', '+'].includes(char) ? 'bg-slate-800 text-blue-400 hover:bg-slate-750' :
                  'bg-slate-950 hover:bg-slate-800 text-white'
                }`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drafts Hold Modal dialog */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-bold text-white text-base mb-3">Save Cart Draft on Hold</h3>
            <input
              type="text"
              placeholder="Enter reference label or name (e.g. Table 4, Guest A)"
              className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 mb-4"
              value={holdName}
              onChange={(e) => setHoldName(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 text-sm font-bold">
              <button
                onClick={() => setShowHoldModal(false)}
                className="bg-slate-800 hover:bg-slate-750 text-zinc-400 px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldSale}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg"
              >
                Put on Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Add Popup */}
      {quickAddCustomerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/10">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-blue-500" /> Fast Customer Registration
              </h3>
              <button onClick={() => setQuickAddCustomerOpen(false)} className="text-zinc-500 hover:text-white p-0.5">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomerSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 mt-1"
                  placeholder="John Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block">Company Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 mt-1"
                  placeholder="Enterprise Inc."
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Phone</label>
                  <input
                    type="tel"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 mt-1"
                    placeholder="555-0199"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block">Email</label>
                  <input
                    type="email"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 mt-1"
                    placeholder="john@doe.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block">Client Type</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 mt-1"
                  value={newCustType}
                  onChange={(e) => setNewCustType(e.target.value as any)}
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="VIP">VIP</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQuickAddCustomerOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-zinc-400 px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg"
                >
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Holds List Sidebar button trigger */}
      {holdOrders.length > 0 && (
        <div className="absolute right-4 bottom-4 z-10 flex gap-2">
          {holdOrders.map(hold => (
            <button
              key={hold.id}
              onClick={() => resumeHoldSale(hold.id)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg border border-amber-500/30 transition flex items-center gap-1.5"
            >
              <Clipboard className="h-4 w-4" /> Resume "{hold.name}"
            </button>
          ))}
        </div>
      )}

      {/* Printable Thermal Invoice Preview Dialog */}
      {invoicePreview && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-xl w-full max-w-sm flex flex-col p-6 shadow-2xl relative">
            <button
              onClick={() => setInvoicePreview(null)}
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
                <span className="font-bold">{invoicePreview.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(invoicePreview.salesDate).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>SALESPERSON:</span>
                <span>{invoicePreview.salespersonName}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-bold">{invoicePreview.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>WAREHOUSE:</span>
                <span>{invoicePreview.warehouseName}</span>
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
                {invoicePreview.items.map((item, index) => (
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
                <span>${invoicePreview.subtotal.toFixed(2)}</span>
              </div>
              {invoicePreview.discountAmount > 0 && (
                <div className="flex justify-between text-zinc-500 font-bold">
                  <span>DISCOUNT:</span>
                  <span>-${invoicePreview.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT ({invoicePreview.items[0]?.vat || 5}%):</span>
                <span>+${invoicePreview.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TAX ({invoicePreview.items[0]?.tax || 2}%):</span>
                <span>+${invoicePreview.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black border-t border-zinc-200 pt-1.5">
                <span>GRAND TOTAL:</span>
                <span>${invoicePreview.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 font-bold">
                <span>PAID AMOUNT:</span>
                <span>${invoicePreview.paidAmount.toFixed(2)}</span>
              </div>
              {invoicePreview.dueAmount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>DUE BALANCE:</span>
                  <span>${invoicePreview.dueAmount.toFixed(2)}</span>
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
                onClick={handlePrint}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <PrintIcon className="h-3.5 w-3.5" /> Print Thermal Slip
              </button>
              <button
                onClick={() => setInvoicePreview(null)}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs py-2 px-3 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
