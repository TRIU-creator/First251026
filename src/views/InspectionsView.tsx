import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Calendar,
  Building2,
  X
} from 'lucide-react';
import { Inspection, InspectionType, InspectionResult } from '../types';
import { api } from '../services/api';
import { InspectionDetailView } from './InspectionDetailView';

interface InspectionsViewProps {
  initialSelectedId?: string | null;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({ initialSelectedId }) => {
  const {
    inspections,
    warehouses,
    items,
    stockRecords,
    refreshAll,
    selectedWarehouseId,
    isAdmin,
    isInspector,
    isManager
  } = useApp();

  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(initialSelectedId || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState(selectedWarehouseId);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [stockRecordId, setStockRecordId] = useState('');
  const [inspectionType, setInspectionType] = useState<InspectionType>('ROUTINE');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [qtyInspected, setQtyInspected] = useState('50');
  const [qtyPassed, setQtyPassed] = useState('50');
  const [qtyFailed, setQtyFailed] = useState('0');
  const [qtyQuarantined, setQtyQuarantined] = useState('0');
  const [overallResult, setOverallResult] = useState<InspectionResult>('PASS');
  const [findings, setFindings] = useState('Visual and mechanical parameters compliant with specifications.');
  const [recommendations, setRecommendations] = useState('Cat A - Fit for operational issue.');

  // Default Ammunition Inspection Parameters Checklist
  const [parameters, setParameters] = useState([
    {
      parameterName: 'Packaging Lead Wire & Tamper Seal',
      expectedValue: 'Factory Crimped & Intact',
      observedValue: 'Intact & Undamaged',
      result: 'PASS',
      remarks: 'Verified'
    },
    {
      parameterName: 'Moisture / Humidity Indicator Card (HIC)',
      expectedValue: 'Deep Blue (< 30% RH)',
      observedValue: 'Deep Blue (Safe)',
      result: 'PASS',
      remarks: 'No moisture ingress'
    },
    {
      parameterName: 'Primer Pocket Seal & Lacquer',
      expectedValue: 'Uniform Lacquer Seal',
      observedValue: 'Intact without pitting',
      result: 'PASS',
      remarks: 'Hermetic'
    },
    {
      parameterName: 'Propellant Grain Condition & Odour',
      expectedValue: 'Normal Mild Solvent Odour',
      observedValue: 'Free of nitrous acidic fumes',
      result: 'PASS',
      remarks: 'Chemically stable'
    },
    {
      parameterName: 'Cartridge Case Denting / Neck Split',
      expectedValue: 'Zero Major Structural Defects',
      observedValue: 'Conforming to MIL-STD',
      result: 'PASS',
      remarks: 'Serviceable'
    }
  ]);

  const [serialEntries, setSerialEntries] = useState<{ serialNumber: string; quantity: number; condition: string; result: string; remarks: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setWarehouseFilter(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const openCreateModal = () => {
    const defaultWh = warehouses[0]?.id || '';
    const defaultItem = items[0]?.id || '';
    setWarehouseId(defaultWh);
    setItemId(defaultItem);
    setStockRecordId('');
    setInspectionType('ROUTINE');
    setInspectionDate(new Date().toISOString().slice(0, 10));
    setQtyInspected('50');
    setQtyPassed('50');
    setQtyFailed('0');
    setQtyQuarantined('0');
    setOverallResult('PASS');
    setFindings('Visual and mechanical parameters compliant with specifications.');
    setRecommendations('Cat A - Fit for operational issue.');
    setSerialEntries([]);
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleParameterChange = (index: number, field: string, value: string) => {
    const updated = [...parameters];
    (updated[index] as any)[field] = value;
    setParameters(updated);
  };

  const addSerialRow = () => {
    setSerialEntries([
      ...serialEntries,
      { serialNumber: '', quantity: 1, condition: 'Serviceable', result: 'PASS', remarks: '' }
    ]);
  };

  const removeSerialRow = (index: number) => {
    setSerialEntries(serialEntries.filter((_, i) => i !== index));
  };

  const handleSerialChange = (index: number, field: string, value: any) => {
    const updated = [...serialEntries];
    (updated[index] as any)[field] = value;
    setSerialEntries(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!warehouseId || !itemId || !qtyInspected || Number(qtyInspected) <= 0) {
      setError('Please select depot, ammunition item, and specify quantity inspected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createInspection({
        warehouseId,
        itemId,
        stockRecordId: stockRecordId || undefined,
        inspectionType,
        inspectionDate,
        formType: 'AMMUNITION_INSPECTION_FORM',
        quantityInspected: Number(qtyInspected),
        quantityPassed: Number(qtyPassed),
        quantityFailed: Number(qtyFailed),
        quantityQuarantined: Number(qtyQuarantined),
        overallResult,
        findings,
        recommendations,
        parameters,
        serials: serialEntries.filter((s) => s.serialNumber.trim())
      });

      // Instantly refresh whole system
      await refreshAll();
      setIsCreateModalOpen(false);
      setSelectedInspectionId(res.id);
    } catch (err: any) {
      setError(err.message || 'Inspection creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If viewing details of a specific inspection
  if (selectedInspectionId) {
    return (
      <InspectionDetailView
        inspectionId={selectedInspectionId}
        onBack={() => setSelectedInspectionId(null)}
        onRefresh={async () => {
          await refreshAll();
        }}
      />
    );
  }

  const filtered = inspections.filter((insp) => {
    const matchesWarehouse = warehouseFilter === 'ALL' || insp.warehouse_id === warehouseFilter;
    const matchesStatus = statusFilter === 'ALL' || insp.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || insp.inspection_type === typeFilter;
    const matchesSearch =
      insp.inspection_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (insp.item_name && insp.item_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (insp.item_code && insp.item_code.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesWarehouse && matchesStatus && matchesType && matchesSearch;
  });

  const availableStock = stockRecords.filter((s) => s.warehouseId === warehouseId && s.itemId === itemId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Ammunition &amp; Store Inspection Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Routine depot floor surveillance, proof test certifications, and military storage categorization.
          </p>
        </div>

        {(isAdmin || isInspector || isManager) && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Ammunition Inspection</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Inspection Dossier #, Nomenclature, or Item Code..."
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Inspection Types</option>
          <option value="ROUTINE">ROUTINE</option>
          <option value="SURVEILLANCE">SURVEILLANCE</option>
          <option value="PROOF_TEST">PROOF_TEST</option>
          <option value="PRE_ISSUE">PRE_ISSUE</option>
          <option value="ANNUAL">ANNUAL</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED (Pending Review)</option>
          <option value="APPROVED">APPROVED (Locked)</option>
          <option value="REJECTED">REJECTED</option>
          <option value="REINSPECTION_REQUIRED">REINSPECTION_REQUIRED</option>
        </select>
      </div>

      {/* Inspections Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Dossier Number</th>
                <th className="py-3 px-4">Inspection Date</th>
                <th className="py-3 px-4">Depot</th>
                <th className="py-3 px-4">Ammunition Store Item</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Quantities (Pass / Tot)</th>
                <th className="py-3 px-4 text-center">Finding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.map((insp) => (
                <tr
                  key={insp.id}
                  onClick={() => setSelectedInspectionId(insp.id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {insp.inspection_number}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(insp.inspection_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    [{insp.warehouse_code}]
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{insp.item_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {insp.item_code} • Insp: {insp.inspector_name || 'Inspector'}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-teal-700 whitespace-nowrap">
                    {insp.inspection_type}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold whitespace-nowrap text-slate-900">
                    <span className="text-emerald-700">{insp.quantity_passed}</span> / {insp.quantity_inspected}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        insp.overall_result === 'PASS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {insp.overall_result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        insp.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : insp.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : insp.status === 'SUBMITTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {insp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInspectionId(insp.id);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-end gap-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-xs text-slate-400 font-mono">
            No ammunition inspections match your current search and filter parameters.
          </div>
        )}
      </div>

      {/* Create Inspection Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                Log Ammunition &amp; Technical Store Inspection
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Warehouse & Item */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Depot / Magazine Facility <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
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
                    Ammunition Item <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
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

              {/* Linked Stock Record & Inspection Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Linked Batch / Stock Entry
                  </label>
                  <select
                    value={stockRecordId}
                    onChange={(e) => setStockRecordId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono shadow-xs"
                  >
                    <option value="">General Floor Inspection (No link)</option>
                    {availableStock.map((s) => (
                      <option key={s.id} value={s.id}>
                        Lot: {s.batchNumber} {s.serialNumber ? `(S/N: ${s.serialNumber})` : ''} - Qty: {s.quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Inspection Type
                  </label>
                  <select
                    value={inspectionType}
                    onChange={(e) => setInspectionType(e.target.value as InspectionType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  >
                    <option value="ROUTINE">ROUTINE (Monthly Magazine)</option>
                    <option value="SURVEILLANCE">SURVEILLANCE (Annual Proof)</option>
                    <option value="PROOF_TEST">PROOF_TEST (Firing Range)</option>
                    <option value="PRE_ISSUE">PRE_ISSUE (Final Clearance)</option>
                    <option value="SPECIAL">SPECIAL / INVESTIGATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Quantities & Overall Outcome */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Qty Inspected <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qtyInspected}
                    onChange={(e) => setQtyInspected(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Qty Passed
                  </label>
                  <input
                    type="number"
                    value={qtyPassed}
                    onChange={(e) => setQtyPassed(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Qty Failed
                  </label>
                  <input
                    type="number"
                    value={qtyFailed}
                    onChange={(e) => setQtyFailed(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Quarantined
                  </label>
                  <input
                    type="number"
                    value={qtyQuarantined}
                    onChange={(e) => setQtyQuarantined(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Finding Result
                  </label>
                  <select
                    value={overallResult}
                    onChange={(e) => setOverallResult(e.target.value as InspectionResult)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  >
                    <option value="PASS">PASS (Serviceable)</option>
                    <option value="FAIL">FAIL (Demolition)</option>
                    <option value="REINSPECTION_REQUIRED">REINSPECTION_REQUIRED</option>
                  </select>
                </div>
              </div>

              {/* Standard Parameters Table */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-800 uppercase mb-2">
                  Condition &amp; Quality Parameters Verification Checklist
                </label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-2 px-3">Surveillance Parameter</th>
                        <th className="py-2 px-3">Standard Criterion</th>
                        <th className="py-2 px-3">Observed Depot Finding</th>
                        <th className="py-2 px-3 text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {parameters.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-900">{p.parameterName}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{p.expectedValue}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={p.observedValue}
                              onChange={(e) => handleParameterChange(idx, 'observedValue', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono shadow-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={p.result}
                              onChange={(e) => handleParameterChange(idx, 'result', e.target.value)}
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold shadow-xs"
                            >
                              <option value="PASS">PASS</option>
                              <option value="FAIL">FAIL</option>
                              <option value="RECHECK">RECHECK</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Serials (Optional) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-800 uppercase">
                    Tracked Individual Serial Numbers (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={addSerialRow}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    + Add Serial Entry
                  </button>
                </div>

                {serialEntries.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                          <th className="py-2 px-3">Serial Number</th>
                          <th className="py-2 px-3">Condition</th>
                          <th className="py-2 px-3">Result</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {serialEntries.map((s, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. SN-88392-A"
                                value={s.serialNumber}
                                onChange={(e) => handleSerialChange(idx, 'serialNumber', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono shadow-xs"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="text"
                                placeholder="Serviceable / Minor scratch"
                                value={s.condition}
                                onChange={(e) => handleSerialChange(idx, 'condition', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 shadow-xs"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <select
                                value={s.result}
                                onChange={(e) => handleSerialChange(idx, 'result', e.target.value)}
                                className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-900 font-mono shadow-xs"
                              >
                                <option value="PASS">PASS</option>
                                <option value="FAIL">FAIL</option>
                              </select>
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeSerialRow(idx)}
                                className="text-rose-600 hover:text-rose-700 text-xs cursor-pointer font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Findings & Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Inspector Floor Findings
                  </label>
                  <textarea
                    rows={2}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Recommendations &amp; Categorization
                  </label>
                  <textarea
                    rows={2}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Recording Inspection...' : 'Record Ammunition Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
