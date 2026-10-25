import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Plus,
  Search,
  Filter,
  History,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { StockRecord, StockLedger, StockStatus } from '../types';
import { api } from '../services/api';

export const StockView: React.FC = () => {
  const {
    stockRecords,
    warehouses,
    items,
    refreshAll,
    selectedWarehouseId,
    isAdmin,
    isManager
  } = useApp();

  const [activeTab, setActiveTab] = useState<'STOCK' | 'LEDGER'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState(selectedWarehouseId);

  // Inward Modal State
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [inwardWarehouseId, setInwardWarehouseId] = useState('');
  const [inwardItemId, setInwardItemId] = useState('');
  const [inwardBatch, setInwardBatch] = useState('');
  const [inwardSerial, setInwardSerial] = useState('');
  const [inwardQty, setInwardQty] = useState('');
  const [inwardCost, setInwardCost] = useState('');
  const [inwardLocation, setInwardLocation] = useState('Bay 01 / Stack A');
  const [inwardCondition, setInwardCondition] = useState('Dry Ventilated Ordnance Magazine');
  const [inwardReceiptDate, setInwardReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [inwardDueDate, setInwardDueDate] = useState('');
  const [inwardRemarks, setInwardRemarks] = useState('Initial Inward Consignment');
  const [inwardError, setInwardError] = useState<string | null>(null);
  const [isInwardSubmitting, setIsInwardSubmitting] = useState(false);

  // Adjustment Modal State
  const [adjustingRecord, setAdjustingRecord] = useState<StockRecord | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentRemarks, setAdjustmentRemarks] = useState('');
  const [adjustmentStatus, setAdjustmentStatus] = useState<StockStatus>('IN_STOCK');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isAdjustingSubmitting, setIsAdjustingSubmitting] = useState(false);

  // Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<StockLedger[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Sync warehouse filter with header
  useEffect(() => {
    setWarehouseFilter(selectedWarehouseId);
  }, [selectedWarehouseId]);

  // Load ledger entries when switching to ledger tab
  useEffect(() => {
    if (activeTab === 'LEDGER') {
      setIsLoadingLedger(true);
      api.getStockLedger()
        .then((res) => setLedgerEntries(res.ledgerEntries))
        .catch((err) => console.error('Ledger load error:', err))
        .finally(() => setIsLoadingLedger(false));
    }
  }, [activeTab]);

  const openInwardModal = () => {
    setInwardWarehouseId(warehouses[0]?.id || '');
    setInwardItemId(items[0]?.id || '');
    setInwardBatch('');
    setInwardSerial('');
    setInwardQty('');
    setInwardCost(items[0]?.unitCost?.toString() || '0');
    setInwardLocation('Bay 01 / Stack A');
    setInwardCondition('Dry Ventilated Ordnance Magazine');
    setInwardReceiptDate(new Date().toISOString().slice(0, 10));
    setInwardDueDate('');
    setInwardRemarks('Initial Inward Consignment');
    setInwardError(null);
    setIsInwardModalOpen(true);
  };

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInwardError(null);

    if (!inwardWarehouseId || !inwardItemId || !inwardBatch.trim() || !inwardQty || Number(inwardQty) <= 0) {
      setInwardError('Please fill in depot, item, lot/batch number, and valid quantity.');
      return;
    }

    const itemObj = items.find((i) => i.id === inwardItemId);
    if (itemObj?.serialNumberTracking && !inwardSerial.trim()) {
      setInwardError(`Serial number tracking is mandatory for item "${itemObj.itemName}".`);
      return;
    }

    setIsInwardSubmitting(true);
    try {
      await api.createStock({
        warehouseId: inwardWarehouseId,
        itemId: inwardItemId,
        batchNumber: inwardBatch.trim().toUpperCase(),
        serialNumber: inwardSerial.trim() || undefined,
        quantity: Number(inwardQty),
        unitCost: Number(inwardCost) || undefined,
        storageLocation: inwardLocation,
        storageCondition: inwardCondition,
        dateOfReceipt: inwardReceiptDate,
        nextInspectionDueDate: inwardDueDate || undefined,
        remarks: inwardRemarks
      });

      // Instantly propagate changes to stock, dashboard, reports, and reviews
      await refreshAll();
      setIsInwardModalOpen(false);
    } catch (err: any) {
      setInwardError(err.message || 'Stock Inward failed');
    } finally {
      setIsInwardSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingRecord) return;
    setAdjustmentError(null);

    if (!adjustmentRemarks.trim()) {
      setAdjustmentError('Mandatory remarks / reconciliation reason required.');
      return;
    }

    setIsAdjustingSubmitting(true);
    try {
      await api.updateStock(adjustingRecord.id, {
        status: adjustmentStatus,
        quantityAdjustment: Number(adjustmentQty) || 0,
        remarks: adjustmentRemarks
      });

      // Instantly propagate changes everywhere
      await refreshAll();
      setAdjustingRecord(null);
    } catch (err: any) {
      setAdjustmentError(err.message || 'Adjustment failed');
    } finally {
      setIsAdjustingSubmitting(false);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredStock = stockRecords.filter((s) => {
    const matchesWarehouse = warehouseFilter === 'ALL' || s.warehouseId === warehouseFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      (s.itemName && s.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.itemCode && s.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.batchNumber && s.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.serialNumber && s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesWarehouse && matchesStatus && matchesSearch;
  });

  const selectedItemObj = items.find((i) => i.id === inwardItemId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Ammunition &amp; Store Stock Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical magazine storage tracking, lot/batch accountability, and immutable transaction ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="bg-slate-100 border border-slate-200 p-1 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'STOCK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current Balances
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LEDGER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Transaction Ledger
            </button>
          </div>

          {(isAdmin || isManager) && (
            <button
              onClick={openInwardModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Inward Consignment</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'STOCK' ? (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stock by item name, ordnance code, batch/lot number, or serial number..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
              />
            </div>

            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            >
              <option value="ALL">All Assigned Depots</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouseCode} - {w.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            >
              <option value="ALL">All Storage Statuses</option>
              <option value="IN_STOCK">IN_STOCK (Serviceable)</option>
              <option value="INSPECTION_DUE">INSPECTION_DUE</option>
              <option value="QUARANTINE">QUARANTINE</option>
              <option value="REJECTED">REJECTED (Demolition)</option>
            </select>
          </div>

          {/* Stock Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Depot</th>
                    <th className="py-3 px-4">Item &amp; Nomenclature</th>
                    <th className="py-3 px-4">Lot / Batch No.</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Next Due</th>
                    {(isAdmin || isManager) && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredStock.map((record) => {
                    const isDue =
                      record.nextInspectionDueDate &&
                      new Date(record.nextInspectionDueDate).getTime() <= Date.now() + 14 * 86400000;

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="text-emerald-700">[{record.warehouseCode}]</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{record.itemName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {record.itemCode} • {record.itemCategory}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-teal-700 whitespace-nowrap">
                          {record.batchNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {record.serialNumber ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-teal-800 border border-slate-200 font-medium">
                              {record.serialNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {record.quantity.toLocaleString()} <span className="text-slate-500 font-normal">{record.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {formatINR(record.totalValue)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{record.storageLocation}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                              record.status === 'IN_STOCK'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : record.status === 'QUARANTINE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : record.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                          {record.nextInspectionDueDate ? (
                            <span
                              className={`text-[11px] ${
                                isDue ? 'text-amber-700 font-bold flex items-center justify-center gap-1' : 'text-slate-600'
                              }`}
                            >
                              {isDue && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                              {new Date(record.nextInspectionDueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {(isAdmin || isManager) && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setAdjustingRecord(record);
                                setAdjustmentQty('0');
                                setAdjustmentStatus(record.status);
                                setAdjustmentRemarks('');
                                setAdjustmentError(null);
                              }}
                              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Adjust / Status
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStock.length === 0 && (
              <div className="p-10 text-center text-xs text-slate-400 font-mono">
                No stock inventory records match the current filter criteria.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Immutable Stock Ledger */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Immutable Stock Ledger &amp; Transaction Audit
              </h3>
            </div>
            <a
              href={api.getExportUrl('ledger')}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Export Ledger CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Depot</th>
                  <th className="py-3 px-4">Item Nomenclature</th>
                  <th className="py-3 px-4">Txn Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Lot / Serial</th>
                  <th className="py-3 px-4">Remarks / Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      [{entry.warehouse_code}]
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {entry.item_name}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                          entry.transaction_type === 'INWARD'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : entry.transaction_type === 'ADJUSTMENT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {entry.transaction_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-teal-700 whitespace-nowrap">
                      {entry.balance_after_transaction.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {entry.batch_number} {entry.serial_number ? `(${entry.serial_number})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">
                      {entry.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ledgerEntries.length === 0 && !isLoadingLedger && (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              No ledger transactions recorded in database yet.
            </div>
          )}
        </div>
      )}

      {/* Inward Consignment Modal */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-2xl my-8">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Inward Ammunition Consignment Receipt
            </h2>

            {inwardError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {inwardError}
              </div>
            )}

            <form onSubmit={handleInwardSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Receiving Depot <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={inwardWarehouseId}
                    onChange={(e) => setInwardWarehouseId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.warehouseCode} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Store Item <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={inwardItemId}
                    onChange={(e) => setInwardItemId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.itemCode}] {i.itemName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Lot / Factory Batch Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inwardBatch}
                    onChange={(e) => setInwardBatch(e.target.value)}
                    placeholder="e.g. OFB-2024-LOT-44A"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono uppercase shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Individual Serial Number {selectedItemObj?.serialNumberTracking && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={inwardSerial}
                    onChange={(e) => setInwardSerial(e.target.value)}
                    placeholder={selectedItemObj?.serialNumberTracking ? 'Mandatory Serial No.' : 'Optional Serial'}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Quantity Inward <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Unit Cost (INR ₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inwardCost}
                    onChange={(e) => setInwardCost(e.target.value)}
                    placeholder={selectedItemObj?.unitCost?.toString() || '0'}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Next Inspection Due
                  </label>
                  <input
                    type="date"
                    value={inwardDueDate}
                    onChange={(e) => setInwardDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Magazine Bay / Grid
                  </label>
                  <input
                    type="text"
                    value={inwardLocation}
                    onChange={(e) => setInwardLocation(e.target.value)}
                    placeholder="Bay 01 / Stack A"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Storage Atmospheric Condition
                  </label>
                  <input
                    type="text"
                    value={inwardCondition}
                    onChange={(e) => setInwardCondition(e.target.value)}
                    placeholder="Dry Ventilated Ordnance Magazine"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Inward Voucher / Transaction Remarks
                </label>
                <textarea
                  rows={2}
                  value={inwardRemarks}
                  onChange={(e) => setInwardRemarks(e.target.value)}
                  placeholder="Receipt voucher reference, carrier details, lead seal intact..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInwardSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isInwardSubmitting ? 'Recording Inward...' : 'Confirm Inward Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust / Status Modal */}
      {adjustingRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Reconcile Stock / Update Status
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              [{adjustingRecord.itemCode}] {adjustingRecord.itemName} • Batch: {adjustingRecord.batchNumber}
            </p>

            {adjustmentError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {adjustmentError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Current Balance
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900">
                  {adjustingRecord.quantity.toLocaleString()} {adjustingRecord.unit}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Quantity Adjustment (+/-)
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="0 (e.g. -50 for issue/disposal, +20 for reconciliation)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Storage Status
                </label>
                <select
                  value={adjustmentStatus}
                  onChange={(e) => setAdjustmentStatus(e.target.value as StockStatus)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                >
                  <option value="IN_STOCK">IN_STOCK (Serviceable)</option>
                  <option value="INSPECTION_DUE">INSPECTION_DUE</option>
                  <option value="QUARANTINE">QUARANTINE</option>
                  <option value="REJECTED">REJECTED (Demolition)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Reconciliation Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentRemarks}
                  onChange={(e) => setAdjustmentRemarks(e.target.value)}
                  placeholder="Official justification for stock adjustment or status re-classification..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setAdjustingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAdjustingSubmitting ? 'Updating...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
