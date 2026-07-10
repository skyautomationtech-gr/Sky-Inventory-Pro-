import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, Plus, Play, Check, X, Loader2, 
  Trash2, AlertCircle, Building2, Warehouse as WarehouseIcon, Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, query, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { BranchTransfer, Branch, Warehouse, ApprovalWorkflow } from '../../types';

export const InventoryTransfers: React.FC = () => {
  const { profile, logEnterpriseAudit } = useAuth();
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    // 1. Listen to Transfers
    const unsubTransfers = onSnapshot(collection(db, 'branch_transfers'), (snap) => {
      const list: BranchTransfer[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as BranchTransfer));
      list.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
      setTransfers(list);
    });

    // 2. Listen to Branches
    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      const list: Branch[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Branch));
      setBranches(list);
      if (list.length > 0) {
        setSourceBranchId(list[0].id);
        if (list.length > 1) setTargetBranchId(list[1].id);
      }
    });

    // 3. Listen to Warehouses
    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (snap) => {
      const list: Warehouse[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as Warehouse));
      setWarehouses(list);
      if (list.length > 0) {
        setSourceWarehouseId(list[0].id);
        if (list.length > 1) setTargetWarehouseId(list[1].id);
      }
    });

    // 4. Listen to Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setProducts(list);
      if (list.length > 0) setProductId(list[0].id);
    });

    // 5. Listen to Workflows
    const unsubWorkflows = onSnapshot(collection(db, 'approval_workflows'), (snap) => {
      const list: ApprovalWorkflow[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() } as ApprovalWorkflow));
      setWorkflows(list);
      setLoading(false);
    });

    return () => {
      unsubTransfers();
      unsubBranches();
      unsubWarehouses();
      unsubProducts();
      unsubWorkflows();
    };
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBranchId || !targetBranchId || !sourceWarehouseId || !targetWarehouseId || !productId || quantity <= 0) return;

    if (sourceWarehouseId === targetWarehouseId) {
      alert("Source and target warehouses cannot be identical.");
      return;
    }

    const trfId = 'TRF-' + Math.floor(100000 + Math.random() * 900000);
    const selectedProduct = products.find(p => p.id === productId);
    const srcBranchName = branches.find(b => b.id === sourceBranchId)?.branchName || 'Source Branch';
    const tgtBranchName = branches.find(b => b.id === targetBranchId)?.branchName || 'Target Branch';
    const srcWhName = warehouses.find(w => w.id === sourceWarehouseId)?.name || 'Source Warehouse';
    const tgtWhName = warehouses.find(w => w.id === targetWarehouseId)?.name || 'Target Warehouse';

    // 1. Check if an active Approval Workflow exists for "Branch Transfers"
    const activeRule = workflows.find(w => w.module === 'Branch Transfers' && w.status === 'Active');
    const needsApproval = activeRule !== undefined;

    const newTransfer: BranchTransfer = {
      id: trfId,
      transferNumber: trfId,
      companyId: branches.find(b => b.id === sourceBranchId)?.companyId || 'default-company',
      sourceBranchId,
      sourceBranchName: srcBranchName,
      targetBranchId,
      targetBranchName: tgtBranchName,
      sourceWarehouseId,
      sourceWarehouseName: srcWhName,
      targetWarehouseId,
      targetWarehouseName: tgtWhName,
      productId,
      productName: selectedProduct?.name || 'Unknown Product',
      sku: selectedProduct?.sku || 'SKU',
      quantity,
      reason,
      approvalStatus: needsApproval ? 'Pending' : 'Approved',
      transferDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: profile?.fullName || 'Staff'
    };

    try {
      // Create transfer doc
      await setDoc(doc(db, 'branch_transfers', trfId), newTransfer);

      // Create log
      await logEnterpriseAudit(
        'Inventory Transfer Requested',
        null,
        newTransfer,
        newTransfer.companyId,
        sourceBranchId
      );

      // 2. If needs approval, write to `pending_approvals` queue
      if (needsApproval) {
        const approvalReqId = 'APP-' + Math.floor(100000 + Math.random() * 900000);
        await setDoc(doc(db, 'pending_approvals', approvalReqId), {
          id: approvalReqId,
          sourceType: 'BranchTransfer',
          sourceId: trfId,
          companyId: newTransfer.companyId,
          branchId: sourceBranchId,
          title: `Inter-Branch Transfer ${trfId}`,
          description: `Transfer of ${quantity}x ${newTransfer.productName} (${newTransfer.sku}) from ${srcWhName} (${srcBranchName}) to ${tgtWhName} (${tgtBranchName}). Reason: ${reason}`,
          amount: 0, // No financial amount by default for transfers
          status: 'Pending',
          createdBy: profile?.fullName || 'Staff',
          createdAt: new Date().toISOString()
        });
      } else {
        // 3. If NO approval is needed, execute the inventory stock adjustments directly!
        // Query product inventory records for source and destination, and update!
        const invRef = collection(db, 'inventory');
        const invSnap = await getDocs(invRef);
        let srcInvDoc: any = null;
        let tgtInvDoc: any = null;

        invSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.productId === productId && d.warehouseId === sourceWarehouseId) {
            srcInvDoc = { id: docSnap.id, ...d };
          }
          if (d.productId === productId && d.warehouseId === targetWarehouseId) {
            tgtInvDoc = { id: docSnap.id, ...d };
          }
        });

        // Decrement source
        if (srcInvDoc) {
          await updateDoc(doc(db, 'inventory', srcInvDoc.id), {
            currentStock: Math.max(0, (srcInvDoc.currentStock || 0) - quantity),
            updatedAt: new Date().toISOString()
          });
        }

        // Increment target (create if not exist)
        if (tgtInvDoc) {
          await updateDoc(doc(db, 'inventory', tgtInvDoc.id), {
            currentStock: (tgtInvDoc.currentStock || 0) + quantity,
            updatedAt: new Date().toISOString()
          });
        } else {
          const newInvId = 'INV-' + Math.floor(100000 + Math.random() * 900000);
          await setDoc(doc(db, 'inventory', newInvId), {
            id: newInvId,
            productId,
            productName: selectedProduct?.name || 'Product',
            sku: selectedProduct?.sku || 'SKU',
            warehouseId: targetWarehouseId,
            warehouseName: tgtWhName,
            currentStock: quantity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      setIsModalOpen(false);
      setReason('');
      setQuantity(1);
    } catch (err) {
      console.error('Create transfer error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Inter-Branch & Warehouse Transfers</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Execute safe movements of stock between physical locations, warehouses, and corporate branches with robust workflow validations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Active Transfer Logs</span>
          <span className="text-[10px] text-slate-400 font-mono">Real-time Stock Ledger</span>
        </div>

        <div className="overflow-x-auto text-[11px]">
          {transfers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ArrowRightLeft className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p>No inventory transfer logs available.</p>
              <p className="text-[10px] mt-1">Inter-branch movements will be fully logged here.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Ref Number</th>
                  <th className="p-4">Item details</th>
                  <th className="p-4">Source Route</th>
                  <th className="p-4">Target Route</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-600 dark:text-slate-300">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{trf.transferNumber}</td>
                    <td className="p-4">
                      <div>
                        <span className="font-semibold block text-slate-800 dark:text-slate-200">{trf.productName}</span>
                        <span className="text-[9px] font-mono text-slate-400">SKU: {trf.sku}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-semibold block text-slate-800 dark:text-slate-200">{trf.sourceBranchName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">Whse: {trf.sourceWarehouseName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-semibold block text-slate-800 dark:text-slate-200">{trf.targetBranchName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">Whse: {trf.targetWarehouseName}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold font-mono text-slate-900 dark:text-white">{trf.quantity}</td>
                    <td className="p-4 text-slate-400">{new Date(trf.transferDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        trf.approvalStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        trf.approvalStatus === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {trf.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                <span>Inter-Branch Stock Transfer</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateTransfer} className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Product Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Boxes className="h-3.5 w-3.5" />
                  <span>Choose Enterprise Product *</span>
                </label>
                <select 
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                  ))}
                </select>
              </div>

              {/* Source Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">FROM: Origin Location</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-medium">Source Branch *</label>
                    <select 
                      value={sourceBranchId}
                      onChange={(e) => setSourceBranchId(e.target.value)}
                      required
                      className="w-full text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="">-- Source Branch --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-medium">Source Warehouse *</label>
                    <select 
                      value={sourceWarehouseId}
                      onChange={(e) => setSourceWarehouseId(e.target.value)}
                      required
                      className="w-full text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="">-- Source Warehouse --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Target Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">TO: Destination Location</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-medium">Target Branch *</label>
                    <select 
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      required
                      className="w-full text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="">-- Target Branch --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.branchName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-medium">Target Warehouse *</label>
                    <select 
                      value={targetWarehouseId}
                      onChange={(e) => setTargetWarehouseId(e.target.value)}
                      required
                      className="w-full text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                      <option value="">-- Target Warehouse --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quantity & Reason */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Quantity *</label>
                  <input 
                    type="number" 
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    min={1}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Transfer Reason / Remarks</label>
                  <input 
                    type="text" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Replenishing New York store reserves"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Initiate Transfer Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
