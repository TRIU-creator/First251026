import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Boxes,
  Layers,
  ClipboardCheck,
  AlertTriangle,
  FileSpreadsheet,
  CalendarCheck2,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { NavigationTab } from '../components/layout/AppSidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectInspection?: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectInspection }) => {
  const { dashboardSummary, dashboardCharts, inspections, stockRecords, weeklyReviews, currentUser } = useApp();

  const summary = dashboardSummary || {
    totalWarehouses: 0,
    totalItems: 0,
    totalStockRecords: 0,
    totalQuantityInStock: 0,
    totalStockValueINR: 0,
    totalInspections: 0,
    pendingInspections: 0,
    completedInspections: 0,
    approvedInspections: 0,
    rejectedInspections: 0,
    weeklyApprovalsPending: 0,
    weeklyApprovalsCompleted: 0,
    itemsRequiringReinspection: 0,
    form263Submissions: 0,
    form270Submissions: 0
  };

  const pendingInspectionsList = inspections.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW'
  );

  const pendingReviewsList = weeklyReviews.filter((r) => r.status === 'SUBMITTED');

  // Format currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 uppercase tracking-wider mb-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active Surveillance Status • Indian Ordnance Standard
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Ammunition & Technical Stores Surveillance Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time depot stock reconciliation, Form 263/270 inspection lifecycles, and weekly review endorsements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('stock')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stock Inward</span>
          </button>
          <button
            onClick={() => onNavigate('inspections')}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-slate-200 shadow-xs cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Log Inspection</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Depot Inventory Valuation</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{formatINR(summary.totalStockValueINR)}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{summary.totalQuantityInStock.toLocaleString()} Total Units</span>
            <span className="text-emerald-700 font-medium">{summary.totalStockRecords} Batches</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inspections Completed</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{summary.completedInspections}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" /> {summary.approvedInspections} Approved
            </span>
            <span className="text-rose-600 font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-500" /> {summary.rejectedInspections} Rejected
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Decisions</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{summary.pendingInspections}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Weekly Reviews Pending:</span>
            <span className="font-semibold text-amber-700 font-mono">{summary.weeklyApprovalsPending}</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Form 263 / 270 Submissions</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {summary.form263Submissions + summary.form270Submissions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
            <span>Form 263: {summary.form263Submissions}</span>
            <span>Form 270: {summary.form270Submissions}</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Category Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ammunition & Store Classification Breakdown
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Database Aggregated</span>
          </div>

          <div className="space-y-3">
            {dashboardCharts?.stockByCategory && dashboardCharts.stockByCategory.length > 0 ? (
              dashboardCharts.stockByCategory.map((cat) => {
                const maxVal = Math.max(...dashboardCharts.stockByCategory.map((c) => c.value), 1);
                const pct = Math.round((cat.value / maxVal) * 100);
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">{cat.name}</span>
                      <span className="text-slate-500 font-mono">
                        {cat.value.toLocaleString()} units • {formatINR(cat.totalValue)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No active stock classifications recorded in database.
              </div>
            )}
          </div>
        </div>

        {/* Top Warehouses by Storage Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Warehouse Depot Storage Allocation
            </h3>
            <button
              onClick={() => onNavigate('warehouses')}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View Depots</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {dashboardCharts?.topWarehouses && dashboardCharts.topWarehouses.length > 0 ? (
              dashboardCharts.topWarehouses.map((wh) => {
                const maxVal = Math.max(...dashboardCharts.topWarehouses.map((w) => w.totalQuantity), 1);
                const pct = Math.round((wh.totalQuantity / maxVal) * 100);
                return (
                  <div key={wh.warehouse_code} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">
                        [{wh.warehouse_code}] {wh.name}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {wh.totalQuantity.toLocaleString()} units • {formatINR(wh.totalValue)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                No depot inventory records registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Tables: Pending Inspections & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Inspections Requiring Approval */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Inspections Awaiting Decision ({pendingInspectionsList.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('inspections')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>All Inspections</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingInspectionsList.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {pendingInspectionsList.slice(0, 5).map((insp) => (
                <div
                  key={insp.id}
                  onClick={() => {
                    if (onSelectInspection) onSelectInspection(insp.id);
                    onNavigate('inspections');
                  }}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="font-mono text-emerald-700">{insp.inspection_number}</span>
                      <span className="text-slate-500 font-normal">[{insp.warehouse_code}]</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {insp.item_name} • Qty Inspected: {insp.quantity_inspected}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      SUBMITTED
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(insp.inspection_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              All submitted ammunition inspections have been reviewed.
            </div>
          )}
        </div>

        {/* Weekly Reviews Requiring Endorsement */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Weekly Reviews Under Review ({pendingReviewsList.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('weekly-reviews')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>All Reviews</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingReviewsList.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden">
              {pendingReviewsList.slice(0, 5).map((rev) => (
                <div
                  key={rev.id}
                  onClick={() => onNavigate('weekly-reviews')}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="font-mono text-teal-700">{rev.review_number}</span>
                      <span className="text-slate-500 font-normal">[{rev.warehouse_code}]</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Period: {new Date(rev.week_start_date).toLocaleDateString()} -{' '}
                      {new Date(rev.week_end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      AWAITING ENDORSEMENT
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      Stock: {formatINR(rev.stock_value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No weekly review cycles pending officer endorsement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
