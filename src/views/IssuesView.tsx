import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck,
  Plus,
  Search,
  Filter,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Package
} from 'lucide-react';
import { api } from '../services/api';
import { Issue, Warehouse, Item } from '../types';

export const IssuesView: React.FC = () => {
  const {
    issues,
    warehouses,
    items,
    refreshAll,
    isAdmin,
    isManager
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionIssueId, setActionIssueId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete'>('approve');
  const [actionRemarks, setActionRemarks] = useState('');

  // Create form state
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newIssueToName, setNewIssueToName] = useState('');
  const [newIssueToOrg, setNewIssueToOrg] = useState('');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDRSNumber, setNewDRSNumber] = useState('');
  const [issueItems, setIssueItems] = useState<{
    receiptId: string; stockRecordId: string; itemId: string; batchNumber: string;
    serialNumber: string; quantityRequested: string; unit: string; unitCost: string;
  }[]>([{ receiptId: '', stockRecordId: '', itemId: '', batchNumber: '', serialNumber: '', quantityRequested: '', unit: 'ROUNDS', unitCost: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filtered = issues.filter((i) => {
    const matchSearch = i.issueNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.issueToName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchWH = warehouseFilter === 'ALL' || i.warehouseId === warehouseFilter;
    return matchSearch && matchStatus && matchWH;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'SUBMITTED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PENDING_APPROVAL': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIALLY_ISSUED': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'COMPLETED': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'REJECTED':
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const openCreateModal = () => {
    setNewWarehouseId('');
    setNewIssueToName('');
    setNewIssueToOrg('');
    setNewIssueDate(new Date().toISOString().slice(0, 10));
    setNewDRSNumber('');
    setIssueItems([{ receiptId: '', stockRecordId: '', itemId: '', batchNumber: '', serialNumber: '', quantityRequested: '', unit: 'ROUNDS', unitCost: '' }]);
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  };

  const addItemRow = () => {
    setIssueItems([...issueItems, { receiptId: '', stockRecordId: '', itemId: '', batchNumber: '', serialNumber: '', quantityRequested: '', unit: 'ROUNDS', unitCost: '' }]);
  };

  const removeItemRow = (idx: number) => {
    if (issueItems.length <= 1) return;
    setIssueItems(issueItems.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const validItems = issueItems.filter(it => it.itemId && it.batchNumber && it.quantityRequested && Number(it.quantityRequested) > 0);
    if (!newWarehouseId) { setError('Warehouse is required'); setIsSubmitting(false); return; }
    if (validItems.length === 0) { setError('At least one valid item is required'); setIsSubmitting(false); return; }

    try {
      const res = await api.createIssue({
        warehouseId: newWarehouseId,
        drsNumber: newDRSNumber.trim() || undefined,
        issueToName: newIssueToName.trim() || undefined,
        issueToOrganization: newIssueToOrg.trim() || undefined,
        issueDate: newIssueDate,
        items: validItems.map(it => ({
          receiptId: it.receiptId || undefined,
          stockRecordId: it.stockRecordId || undefined,
          itemId: it.itemId,
          batchNumber: it.batchNumber,
          serialNumber: it.serialNumber.trim() || undefined,
          quantityRequested: Number(it.quantityRequested),
          unit: it.unit,
          unitCost: Number(it.unitCost) || 0
        }))
      });
      setSuccess(res.message || 'Issue created successfully');
      setIsCreateModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setError(err.message || 'Failed to create issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!actionIssueId || !actionRemarks.trim() && actionType !== 'complete') return;
    setIsSubmitting(true);
    try {
      if (actionType === 'approve') {
        await api.approveIssue(actionIssueId, actionRemarks);
      } else if (actionType === 'reject') {
        await api.rejectIssue(actionIssueId, actionRemarks);
      } else {
        await api.completeIssue(actionIssueId);
      }
      setIsActionModalOpen(false);
      setActionIssueId(null);
      setActionRemarks('');
      await refreshAll();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const warehouseOptions = warehouses.map(w => ({ label: `${w.warehouseCode} — ${w.name}`, value: w.id }));
  const itemOptions = items.map(i => ({ label: `${i.itemCode} — ${i.itemName}`, value: i.id }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Issues & Outward Consignments</h2>
          <p className="text-slate-500 text-sm">
            Workflow: DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → PARTIALLY_ISSUED → COMPLETED
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            disabled={!(isAdmin || isManager)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              isAdmin || isManager
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" /> New Issue
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="Issue number, issue to..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_ISSUED">Partially Issued</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Warehouse</label>
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
              <option value="ALL">All Warehouses</option>
              {warehouseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => refreshAll()} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-slate-50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">Issue Number</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Warehouse</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Issue To</th>
                <th className="px-4 py-3 font-semibold text-slate-600">DRS Number</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No issues found.</td></tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium">{i.issueNumber}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{i.warehouseCode} — {i.warehouseName}</td>
                    <td className="px-4 py-3 text-slate-700">{i.issueToName || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">{i.drsNumber || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(i.issueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${statusColor(i.status)}`}>
                        {i.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1">
                        {i.status === 'SUBMITTED' && (isAdmin || isManager) && (
                          <>
                            <button onClick={() => { setActionType('approve'); setActionIssueId(i.id); setIsActionModalOpen(true); }}
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Approve</button>
                            <button onClick={() => { setActionType('reject'); setActionIssueId(i.id); setIsActionModalOpen(true); }}
                              className="text-xs text-red-600 hover:text-red-800 font-medium">Reject</button>
                          </>
                        )}
                        {(i.status === 'APPROVED' || i.status === 'PARTIALLY_ISSUED') && (isAdmin || isManager) && (
                          <button onClick={() => { setActionType('complete'); setActionIssueId(i.id); setIsActionModalOpen(true); }}
                            className="text-xs text-teal-600 hover:text-teal-800 font-medium">Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsActionModalOpen(false)} />
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {actionType === 'approve' ? 'Approve Issue' : actionType === 'reject' ? 'Reject Issue' : 'Complete Issue'}
            </h3>
            {actionType !== 'complete' && (
              <>
                <p className="text-sm text-slate-600 mb-4">Remarks are mandatory for this action.</p>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-4"
                  placeholder={`Enter ${actionType} remarks...`}
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAction} disabled={actionType !== 'complete' && !actionRemarks.trim() || isSubmitting}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                  actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                {isSubmitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Issue</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Warehouse *</label>
                <select value={newWarehouseId} onChange={(e) => setNewWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" disabled={isSubmitting}>
                  <option value="">Select warehouse</option>
                  {warehouseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Issue To (Name)</label>
                  <input type="text" value={newIssueToName} onChange={(e) => setNewIssueToName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Organization</label>
                  <input type="text" value={newIssueToOrg} onChange={(e) => setNewIssueToOrg(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" disabled={isSubmitting} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Date</label>
                  <input type="date" value={newIssueDate} onChange={(e) => setNewIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">DRS Number (optional)</label>
                  <input type="text" value={newDRSNumber} onChange={(e) => setNewDRSNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" disabled={isSubmitting} />
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Issue Items</span>
                  <button type="button" onClick={addItemRow} disabled={isSubmitting}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3" /> Add Item
                  </button>
                </div>
                {issueItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 border-b border-slate-100 pb-2">
                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-500">Item *</label>
                      <select value={it.itemId} onChange={(e) => {
                        const updated = [...issueItems]; updated[idx] = { ...updated[idx], itemId: e.target.value }; setIssueItems(updated);
                      }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isSubmitting}>
                        <option value="">Select item</option>
                        {itemOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500">Batch *</label>
                      <input value={it.batchNumber} onChange={(e) => {
                        const updated = [...issueItems]; updated[idx] = { ...updated[idx], batchNumber: e.target.value }; setIssueItems(updated);
                      }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isSubmitting} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500">Serial No.</label>
                      <input value={it.serialNumber} onChange={(e) => {
                        const updated = [...issueItems]; updated[idx] = { ...updated[idx], serialNumber: e.target.value }; setIssueItems(updated);
                      }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isSubmitting} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500">Qty Requested *</label>
                      <input type="number" value={it.quantityRequested} onChange={(e) => {
                        const updated = [...issueItems]; updated[idx] = { ...updated[idx], quantityRequested: e.target.value }; setIssueItems(updated);
                      }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isSubmitting} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500">Receipt ID (optional)</label>
                      <input value={it.receiptId} onChange={(e) => {
                        const updated = [...issueItems]; updated[idx] = { ...updated[idx], receiptId: e.target.value }; setIssueItems(updated);
                      }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 outline-none" disabled={isSubmitting} placeholder="Link to receipt" />
                    </div>
                    <div className="md:col-span-1">
                      <button type="button" onClick={() => removeItemRow(idx)} disabled={issueItems.length <= 1 || isSubmitting}
                        className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
