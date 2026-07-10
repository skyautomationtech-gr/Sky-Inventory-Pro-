import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Warehouse as WarehouseIcon, Plus, Edit2, MapPin, User, 
  ArrowLeftRight, Search, FileDown, Check, X, ShieldAlert, Layers, Box, Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { Warehouse, InventoryRecord, Product } from '../types';

export const WarehousePage: React.FC = () => {
  const { profile, user, setNotification } = useAuth();
  
  // States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  
  // Selected warehouse for details view
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer Modal states
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [targetWarehouse, setTargetWarehouse] = useState('');
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');

  const isReadOnly = profile?.role === 'Staff';

  // Listen to Warehouses and Inventory
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const wQuery = query(collection(db, 'warehouses'), orderBy('createdAt', 'desc'));
    const unsubWarehouses = onSnapshot(wQuery, (snap) => {
      const list: Warehouse[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Warehouse);
      });
      setWarehouses(list);
      if (list.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(list[0].id);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to synchronize warehouses.' });
      try {
        handleFirestoreError(err, OperationType.LIST, 'warehouses');
      } catch (e) {}
    });

    const invQuery = query(collection(db, 'inventory'), orderBy('productName', 'asc'));
    const unsubInventory = onSnapshot(invQuery, (snap) => {
      const list: InventoryRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as InventoryRecord);
      });
      setInventory(list);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'inventory');
      } catch (e) {}
    });

    // Fetch products for Transfer dropdown
    const prodQuery = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(prodQuery, (snap) => {
      const list: Product[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(list);
    }, (err) => {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'products');
      } catch (e) {}
    });

    return () => {
      unsubWarehouses();
      unsubInventory();
      unsubProducts();
    };
  }, [user, selectedWarehouseId]);

  // Seed initial main warehouse if empty
  useEffect(() => {
    const hasAdminRole = profile && ['Super Admin', 'Admin', 'Manager'].includes(profile.role);
    if (warehouses.length === 0 && !loading && hasAdminRole) {
      const seedWarehouse = async () => {
        try {
          const docId = doc(collection(db, 'warehouses')).id;
          await setDoc(doc(db, 'warehouses', docId), {
            id: docId,
            name: 'Central Warehouse',
            code: 'C-WH-01',
            address: '100 Enterprise Boulevard, Sector 4',
            manager: profile?.fullName || 'Manager',
            status: 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user?.uid || ''
          });
        } catch (e) {
          console.error('Error seeding initial warehouse:', e);
        }
      };
      seedWarehouse();
    }
  }, [warehouses, loading, profile, user]);

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setNotification({ type: 'error', message: 'Unauthorized. Staff role has read-only access.' });
      return;
    }

    if (!name || !code) {
      setNotification({ type: 'error', message: 'Warehouse Name and Code are required.' });
      return;
    }

    const payload = {
      name,
      code,
      address,
      manager,
      status,
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid || ''
    };

    try {
      if (editingWarehouse) {
        const ref = doc(db, 'warehouses', editingWarehouse.id);
        await updateDoc(ref, payload);
        
        // Add activity log
        await addDoc(collection(db, 'activity_logs'), {
          id: doc(collection(db, 'activity_logs')).id,
          uid: user?.uid || '',
          userName: profile?.fullName || 'Unknown',
          userRole: profile?.role || 'Staff',
          action: 'Warehouse Updated',
          details: `Modified warehouse: ${name} (${code})`,
          timestamp: new Date().toISOString()
        });

        setNotification({ type: 'success', message: `Warehouse "${name}" successfully updated.` });
      } else {
        const docRef = await addDoc(collection(db, 'warehouses'), {
          ...payload,
          id: '',
          createdAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'warehouses', docRef.id), { id: docRef.id });

        // Add activity log
        await addDoc(collection(db, 'activity_logs'), {
          id: doc(collection(db, 'activity_logs')).id,
          uid: user?.uid || '',
          userName: profile?.fullName || 'Unknown',
          userRole: profile?.role || 'Staff',
          action: 'Warehouse Registered',
          details: `Registered new warehouse: ${name} (${code})`,
          timestamp: new Date().toISOString()
        });

        setNotification({ type: 'success', message: `Warehouse "${name}" successfully registered.` });
      }
      closeModal();
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to persist warehouse data.' });
      try {
        handleFirestoreError(err, OperationType.WRITE, 'warehouses');
      } catch (e) {}
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setNotification({ type: 'error', message: 'Unauthorized. Staff role has read-only access.' });
      return;
    }

    if (!sourceWarehouse || !targetWarehouse || !transferProduct || !transferQty) {
      setNotification({ type: 'error', message: 'All transfer fields are required.' });
      return;
    }

    if (sourceWarehouse === targetWarehouse) {
      setNotification({ type: 'error', message: 'Source and target warehouses must be different.' });
      return;
    }

    const qtyVal = Number(transferQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setNotification({ type: 'error', message: 'Quantity must be a valid positive number.' });
      return;
    }

    // Verify source stock quantity
    const record = inventory.find(r => r.productId === transferProduct);
    const sourceStock = record?.warehouseStock?.[sourceWarehouse] || 0;

    if (sourceStock < qtyVal) {
      setNotification({ 
        type: 'error', 
        message: `Insufficient stock in source warehouse. Available: ${sourceStock} units.` 
      });
      return;
    }

    try {
      const srcWhName = warehouses.find(w => w.id === sourceWarehouse)?.name || 'Source';
      const tgtWhName = warehouses.find(w => w.id === targetWarehouse)?.name || 'Target';
      const prodName = products.find(p => p.id === transferProduct)?.name || 'Product';

      // Perform updates
      const inventoryRef = doc(db, 'inventory', transferProduct);
      const updatedWhStock = { ...(record?.warehouseStock || {}) };
      updatedWhStock[sourceWarehouse] = (updatedWhStock[sourceWarehouse] || 0) - qtyVal;
      updatedWhStock[targetWarehouse] = (updatedWhStock[targetWarehouse] || 0) + qtyVal;

      const refNo = `TRF-${Math.floor(100000 + Math.random() * 900000)}`;

      await updateDoc(inventoryRef, {
        warehouseStock: updatedWhStock,
        lastStockUpdate: new Date().toISOString(),
        referenceNumber: refNo,
        updatedAt: new Date().toISOString()
      });

      // Write Transaction Logs
      // 1. Log Source Decrease
      const srcTxRef = doc(collection(db, 'inventory_transactions'));
      await addDoc(collection(db, 'inventory_transactions'), {
        id: srcTxRef.id,
        referenceNumber: refNo,
        transactionType: 'Transfer',
        productId: transferProduct,
        productName: prodName,
        sku: record?.sku || '',
        barcode: record?.barcode || '',
        quantity: qtyVal,
        previousQuantity: record?.currentStock || 0,
        newQuantity: record?.currentStock || 0, // overall stays same
        difference: -qtyVal,
        warehouseId: sourceWarehouse,
        warehouseName: srcWhName,
        remarks: `Stock Transfer outbound to ${tgtWhName}. ${transferRemarks}`,
        requestedBy: profile?.fullName || 'Operator',
        approvedBy: profile?.fullName || 'Operator',
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

      // 2. Log Target Increase
      const tgtTxRef = doc(collection(db, 'inventory_transactions'));
      await addDoc(collection(db, 'inventory_transactions'), {
        id: tgtTxRef.id,
        referenceNumber: refNo,
        transactionType: 'Transfer',
        productId: transferProduct,
        productName: prodName,
        sku: record?.sku || '',
        barcode: record?.barcode || '',
        quantity: qtyVal,
        previousQuantity: record?.currentStock || 0,
        newQuantity: record?.currentStock || 0,
        difference: qtyVal,
        warehouseId: targetWarehouse,
        warehouseName: tgtWhName,
        remarks: `Stock Transfer inbound from ${srcWhName}. ${transferRemarks}`,
        requestedBy: profile?.fullName || 'Operator',
        approvedBy: profile?.fullName || 'Operator',
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

      // Audit Log
      await addDoc(collection(db, 'activity_logs'), {
        id: doc(collection(db, 'activity_logs')).id,
        uid: user?.uid || '',
        userName: profile?.fullName || '',
        userRole: profile?.role || '',
        action: 'Inventory Transfer',
        details: `Transferred ${qtyVal} units of "${prodName}" from ${srcWhName} to ${tgtWhName}`,
        timestamp: new Date().toISOString()
      });

      // Notification
      await addDoc(collection(db, 'inventory_notifications'), {
        id: doc(collection(db, 'inventory_notifications')).id,
        type: 'adjustment',
        productId: transferProduct,
        productName: prodName,
        sku: record?.sku || '',
        message: `Transferred ${qtyVal} units from ${srcWhName} to ${tgtWhName}.`,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        status: 'Active'
      });

      setNotification({ type: 'success', message: `Successfully transferred ${qtyVal} units of "${prodName}".` });
      setIsTransferOpen(false);
      setTransferQty('');
      setTransferRemarks('');
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to log transfer transaction.' });
    }
  };

  const openAddModal = () => {
    setEditingWarehouse(null);
    setName('');
    setCode('');
    setAddress('');
    setManager('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setName(wh.name);
    setCode(wh.code);
    setAddress(wh.address);
    setManager(wh.manager);
    setStatus(wh.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  // Filter products matching current warehouse inventory with search query
  const selectedWh = warehouses.find(w => w.id === selectedWarehouseId);
  const warehouseStocks = inventory.filter(rec => {
    const qty = rec.warehouseStock?.[selectedWarehouseId || ''] || 0;
    const matchesSearch = 
      rec.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return qty > 0 && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <WarehouseIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            Warehouse Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Configure multiple physical warehouse facilities and track localized real-time inventories.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <>
              <button
                onClick={() => setIsTransferOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Warehouse Stock Transfer
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add New Warehouse
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Warehouses List */}
        <div className="space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
            Facility Locations ({warehouses.length})
          </h2>

          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {warehouses.map((wh) => {
                const isSelected = selectedWarehouseId === wh.id;
                // Calculate total items in this warehouse
                const totalItems = inventory.reduce((acc, rec) => acc + (rec.warehouseStock?.[wh.id] || 0), 0);
                
                return (
                  <div
                    key={wh.id}
                    onClick={() => setSelectedWarehouseId(wh.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-blue-500/10 border-blue-500/30 dark:border-blue-500/50 shadow-sm' 
                        : 'bg-white dark:bg-slate-900 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400">
                          {wh.code}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-1">
                          {wh.name}
                        </h3>
                      </div>
                      
                      {wh.status === 'Active' ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-zinc-400 mt-1" />
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{wh.address || 'No Address Listed'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{wh.manager || 'No Manager Assigned'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                        {totalItems} total stock units
                      </span>
                      
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(wh);
                          }}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Hand: Detailed Warehouse Inventory */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
              Stock In: {selectedWh ? selectedWh.name : 'No Warehouse Selected'}
            </h2>

            {/* Local Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search warehouse stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-slate-900/50 border-b border-zinc-100 dark:border-zinc-800/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Barcode</th>
                    <th className="px-5 py-3 text-right">Localized Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300">
                  {warehouseStocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-zinc-400 font-medium">
                        <Box className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                        No product stocks recorded in this warehouse yet.
                      </td>
                    </tr>
                  ) : (
                    warehouseStocks.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-50/40 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                          {rec.productName}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          {rec.sku}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          {rec.barcode}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {rec.warehouseStock?.[selectedWarehouseId || ''] || 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 1. Create / Edit Warehouse Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden text-zinc-800 dark:text-zinc-100"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">
                {editingWarehouse ? 'Modify Warehouse Facility' : 'Register Warehouse Facility'}
              </h2>

              <form onSubmit={handleSaveWarehouse} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Central distribution Hub"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Warehouse Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. WH-01"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Manager
                    </label>
                    <input
                      type="text"
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      placeholder="e.g. Jack Ryan"
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 500 Enterprise Way, Industrial Zone 3"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Facility Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="Active">Active / Fully Operational</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    {editingWarehouse ? 'Save Changes' : 'Register Location'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Warehouse Stock Transfer Modal */}
      <AnimatePresence>
        {isTransferOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden text-zinc-800 dark:text-zinc-100"
            >
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">
                Inter-Warehouse Stock Transfer
              </h2>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Select Product *
                  </label>
                  <select
                    required
                    value={transferProduct}
                    onChange={(e) => setTransferProduct(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">-- Choose Catalog Product --</option>
                    {products.map((p) => {
                      const currentRec = inventory.find(r => r.productId === p.id);
                      const totalQty = currentRec?.currentStock || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (SKU: {p.sku}) | Total Available: {totalQty}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Source Warehouse *
                    </label>
                    <select
                      required
                      value={sourceWarehouse}
                      onChange={(e) => setSourceWarehouse(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">-- Source --</option>
                      {warehouses.filter(w => w.status === 'Active').map((w) => {
                        const prodRec = inventory.find(r => r.productId === transferProduct);
                        const qtyInWH = prodRec?.warehouseStock?.[w.id] || 0;
                        return (
                          <option key={w.id} value={w.id}>
                            {w.name} ({qtyInWH} units)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                      Target Warehouse *
                    </label>
                    <select
                      required
                      value={targetWarehouse}
                      onChange={(e) => setTargetWarehouse(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">-- Destination --</option>
                      {warehouses.filter(w => w.status === 'Active').map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Transfer Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    placeholder="Enter stock amount..."
                    min="1"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                    Transfer Remarks
                  </label>
                  <textarea
                    value={transferRemarks}
                    onChange={(e) => setTransferRemarks(e.target.value)}
                    placeholder="Log audit comments for this stock shift..."
                    rows={3}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-800 dark:text-zinc-100 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setIsTransferOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    Execute Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default WarehousePage;
