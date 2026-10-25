import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Download, Printer, Filter, Building2, Calendar, Shield } from 'lucide-react';
import { api } from '../services/api';

export const AppendixReportsView: React.FC = () => {
  const { warehouses, selectedWarehouseId } = useApp();

  const [activeAppendix, setActiveAppendix] = useState<'APPENDIX_A' | 'APPENDIX_B'>('APPENDIX_A');
  const [warehouseFilter, setWarehouseFilter] = useState(selectedWarehouseId);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setWarehouseFilter(selectedWarehouseId);
  }, [selectedWarehouseId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const whId = warehouseFilter === 'ALL' ? undefined : warehouseFilter;
      if (activeAppendix === 'APPENDIX_A') {
        const res = await api.getAppendixA(whId);
        setReportData(res.records);
        setReportTitle(res.reportTitle);
        setGeneratedAt(res.generatedAt);
      } else {
        const res = await api.getAppendixB(whId);
        setReportData(res.records);
        setReportTitle(res.reportTitle);
        setGeneratedAt(res.generatedAt);
      }
    } catch (err) {
      console.error('Error fetching appendix report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeAppendix, warehouseFilter]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const exportUrl = api.getExportUrl(
    activeAppendix === 'APPENDIX_A' ? 'appendix-a' : 'appendix-b',
    warehouseFilter === 'ALL' ? undefined : warehouseFilter
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Controls (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileText className="w-5 h-5" />
            </div>
            Official Defence Returns (Appendix A & Appendix B)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized Indian Ordnance stock ledger condition returns and technical surveillance reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-slate-300 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Print Formatted Return</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filter Bar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Appendix Tab Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveAppendix('APPENDIX_A')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-semibold transition-all ${
              activeAppendix === 'APPENDIX_A'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Appendix A: Stock Ledger & Return
          </button>
          <button
            onClick={() => setActiveAppendix('APPENDIX_B')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-semibold transition-all ${
              activeAppendix === 'APPENDIX_B'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Appendix B: Inspection & Surveillance Return
          </button>
        </div>

        {/* Depot Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          >
            <option value="ALL">All Ordnance Depots</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.warehouseCode} - {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs text-slate-800 print:border-none print:shadow-none print:p-0">
        {/* Military Letterhead */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
          <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500">
            TECHNICAL AMMUNITION SUPPORT GROUP • CENTRAL ORDNANCE COMMAND
          </div>
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-900 mt-1">
            {reportTitle}
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-emerald-700 mt-2">
            <span>Generated: {generatedAt ? new Date(generatedAt).toLocaleString() : 'Live System'}</span>
            <span>•</span>
            <span>
              Depot Scope: <b>{warehouseFilter === 'ALL' ? 'All Formations' : warehouseFilter}</b>
            </span>
            <span>•</span>
            <span>Total Records: <b>{reportData.length}</b></span>
          </div>
        </div>

        {/* Report Content */}
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-500">
            Compiling official defence records from database...
          </div>
        ) : activeAppendix === 'APPENDIX_A' ? (
          /* Appendix A Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Depot Code</th>
                  <th className="py-2.5 px-3">Item Nomenclature</th>
                  <th className="py-2.5 px-3">Ordnance Code</th>
                  <th className="py-2.5 px-3">Lot / Batch</th>
                  <th className="py-2.5 px-3">Serial No.</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Valuation (INR)</th>
                  <th className="py-2.5 px-3">Storage Location</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.warehouse_code}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{r.item_name}</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{r.item_code}</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{r.batch_number}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                      {r.serial_number || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {r.quantity.toLocaleString()} {r.unit}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatINR(r.total_value)}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">{r.storage_location}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        r.status === 'SERVICEABLE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.status === 'UNSERVICEABLE'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                      {r.next_inspection_due_date ? new Date(r.next_inspection_due_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Appendix B Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Dossier Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Depot</th>
                  <th className="py-2.5 px-3">Ammunition Item</th>
                  <th className="py-2.5 px-3">Surveillance Type</th>
                  <th className="py-2.5 px-3 text-center">Inspected / Passed</th>
                  <th className="py-2.5 px-3 text-center">Finding</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Inspecting Officer</th>
                  <th className="py-2.5 px-3">Approver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                      {r.inspection_number}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {new Date(r.inspection_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      [{r.warehouse_code}]
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {r.item_name} <span className="font-mono text-slate-500">({r.item_code})</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700">{r.inspection_type}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {r.quantity_inspected} / <span className="text-emerald-700">{r.quantity_passed}</span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-[10px]">
                      <span className={`inline-block px-1.5 py-0.5 rounded border ${
                        r.overall_result === 'PASSED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.overall_result === 'FAILED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.overall_result}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-[10px]">
                      <span className={`inline-block px-1.5 py-0.5 rounded border ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                      {r.inspector_name || 'Inspector'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                      {r.approver_name || 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData.length === 0 && !isLoading && (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">
            No report data recorded in database for this criterion.
          </div>
        )}

        {/* Official Endorsement Signatures Footer */}
        <div className="pt-8 mt-8 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Compiled By Store Keeper / Technical Supervisor
            </span>
            <div className="font-bold text-slate-900">Official Signature & Date Stamp</div>
          </div>

          <div className="space-y-1 text-right">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Commanding Officer / Chief Ordnance Officer Endorsement
            </span>
            <div className="font-bold text-slate-900">Sealed & Counter-Signed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
