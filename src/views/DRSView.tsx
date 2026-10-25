import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Barcode,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { DRSNumber } from '../types';

export const DRSView: React.FC = () => {
  const {
    drsNumbers,
    warehouses,
    refreshAll,
    isAdmin,
    isManager,
    isInspector,
    currentUser
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newDRSNumber, setNewDRSNumber] = useState('');
  const [newSourceModule, setNewSourceModule] = useState('MANUAL');
  const [newLinkedEntityType, setNewLinkedEntityType] = useState('');
  const [newLinkedEntityId, setNewLinkedEntityId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filtered = drsNumbers.filter((d) => {
    const matchSearch = d.drsNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchWH = warehouseFilter === 'ALL' || d.warehouseId === warehouseFilter;
    return matchSearch && matchStatus && matchWH;
  });

  const openCreateModal = () => {
    setNewWarehouseId('');
    setNewDRSNumber('');
    setNewSourceModule('MANUAL');
    setNewLinkedEntityType('');
    setNewLinkedEntityId('');
    setError(null);
    setSuccess(null);
    setIsCreateModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.createDRS({
        warehouseId: newWarehouseId,
        drsNumber: newDRSNumber.trim() || undefined,
        sourceModule: newSourceModule,
        linkedEntityType: newLinkedEntityType.trim() || undefined,
        linkedEntityId: newLinkedEntityId.trim() || undefined
      });
      setSuccess(res.message || 'DRS number created successfully');
      setIsCreateModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      setError(err.message || 'Failed to create DRS number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setIsSubmitting(true);
    try {
      await api.cancelDRS(cancelId, cancelRemarks);
      await refreshAll();
      setCancelId(null);
      setCancelRemarks('');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel DRS number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const warehouseOptions = warehouses.map(w => ({
    label: `${w.warehouseCode} — ${w.name}`,
    value: w.id
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">DRS Number Register</h2>
          <p className="text-slate-500 text-sm">
            Defence Requisition Slip numbers — track, link, and cancel DRS references across receipts and issues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            disabled={!(isAdmin || isManager || isInspector)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              isAdmin || isManager || isInspector
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <Barcode className="w-4 h-4" /> Create DRS
          </button>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search DRS Number</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Enter DRS number..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Warehouse</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="ALL">All Warehouses</option>
              {warehouseOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => refreshAll()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">DRS Number</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Warehouse</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Source Module</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Linked Entity</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Created</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No DRS numbers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{d.drsNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {d.warehouseCode || '—'} {d.warehouseName ? `— ${d.warehouseName}` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">{d.sourceModule}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      {d.linkedEntityType || '—'}{d.linkedEntityId ? ` / ${d.linkedEntityId}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${statusColor(d.status)}`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(d.status === 'ACTIVE' && (isAdmin || isManager)) && (
                        <button
                          onClick={() => { setCancelId(d.id); setCancelRemarks(''); }}
                          className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
            <span className="text-slate-500">{filtered.length} DRS record(s)</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csv = [
                    'DRS Number,Warehouse,Source Module,Linked Entity Type,Linked Entity ID,Status,Created At,Cancelled At,Cancel Reason'
                  ];
                  filtered.forEach(d => csv.push([
                    d.drsNumber, d.warehouseName || '', d.sourceModule,
                    d.linkedEntityType || '', d.linkedEntityId || '', d.status,
                    d.createdAt, d.cancelledAt || '', d.cancelReason || ''
                  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')));
                  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `drs-register-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs rounded transition-colors"
              >
                <Download className="w-3 h-3 mr-1" /> CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create DRS Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create DRS Number</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Warehouse *</label>
                <select
                  value={newWarehouseId}
                  onChange={(e) => setNewWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isSubmitting}
                >
                  <option value="">Select warehouse</option>
                  {warehouseOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">DRS Number (leave blank to auto-generate)</label>
                <input
                  type="text"
                  value={newDRSNumber}
                  onChange={(e) => setNewDRSNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isSubmitting}
                  placeholder="e.g. DRS-2026-000001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source Module</label>
                <select
                  value={newSourceModule}
                  onChange={(e) => setNewSourceModule(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isSubmitting}
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="RECEIPT">Receipt</option>
                  <option value="ISSUE">Issue</option>
                  <option value="TECH_MODULE">Technical Module</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Linked Entity Type</label>
                <input
                  type="text"
                  value={newLinkedEntityType}
                  onChange={(e) => setNewLinkedEntityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isSubmitting}
                  placeholder="e.g. RECEIPT, ISSUE"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Linked Entity ID</label>
                <input
                  type="text"
                  value={newLinkedEntityId}
                  onChange={(e) => setNewLinkedEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  disabled={isSubmitting}
                  placeholder="Entity record ID"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWarehouseId || isSubmitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create DRS Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel DRS Modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCancelId(null)} />
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Cancel DRS Number</h3>
            <p className="text-sm text-slate-600 mb-4">Cancellation remarks are mandatory.</p>
            <textarea
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-4"
              placeholder="Enter cancellation reason..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelRemarks.trim() || isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
