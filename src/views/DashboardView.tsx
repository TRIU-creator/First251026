import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2, Boxes, Layers, ClipboardCheck, AlertTriangle, FileSpreadsheet,
  CalendarCheck2, TrendingUp, ShieldCheck, CheckCircle, XCircle, Clock,
  ArrowRight, Truck, Package, RotateCcw, Users, DollarSign, FileText
} from 'lucide-react';
import { NavigationTab } from '../components/layout/AppSidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectInspection?: (id: string) => void;
}

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'SUBMITTED': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'UNDER_REVIEW': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'APPROVED': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'REJECTED': return 'bg-red-50 text-red-800 border-red-200';
    case 'REINSPECTION_REQUIRED': return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'CLOSED': return 'bg-teal-50 text-teal-800 border-teal-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectInspection }) => {
  const {
    dashboardSummary,
    dashboardCharts,
    dashboardSummaryExtended,
    dashboardChartsExtended,
    inspections,
    stockRecords,
    weeklyReviews,
    currentUser,
    isAdmin,
    isManager,
    isViewer
  } = useApp();

  const summary = dashboardSummaryExtended || dashboardSummary || {
    totalWarehouses: 0, totalUsers: 0, totalItems: 0, totalStockRecords: 0,
    totalReceipts: 0, totalIssues: 0, totalInspections: 0, pendingInspections: 0,
    completedInspections: 0, approvedInspections: 0, rejectedInspections: 0,
    pendingWeeklyApprovals: 0, completedWeeklyApprovals: 0, stockValue: 0,
    lowStockItems: 0, inspectionDueItems: 0, overdueInspections: 0,
    pendingForm263: 0, pendingForm270: 0
  };

  const charts = dashboardChartsExtended || dashboardCharts || {
    inspectionsByStatus: [], inspectionsByWarehouse: [], inspectionsByMonth: [],
    stockByCategory: [], form263Vs270: [], weeklyApprovalStatus: [], warehouseStockSummary: []
  };

  const pendingInspectionsList = inspections.filter(
    (i) => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW'
  );
  const pendingReviewsList = weeklyReviews.filter((r) => r.status === 'SUBMITTED');

  // Determine warehouse scope for display
  const userWarehouses = isAdmin ? [] : (isManager || isViewer ? [] : []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* App Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-2 font-semibold">
            <Package className="w-3 h-3" />
            <span>Ammunition & Warehouse Compliance Management System</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">AWCMS Operations Dashboard</h1>
          <p className="text-slate-300 text-sm mt-1">
            Real-time warehouse stock reconciliation, receipt/issue lifecycle, Form 263/270 inspection workflows,
            and weekly review approvals. Data sourced from live database.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => onNavigate('stock')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" /> Stock Inward
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

      {/* Primary KPI Grid - 8 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Warehouses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Warehouses</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalWarehouses}</div>
        </div>
        {/* KPI 2: Users */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalUsers}</div>
        </div>
        {/* KPI 3: Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Items</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalItems}</div>
        </div>
        {/* KPI 4: Stock Value */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{formatINR(summary.stockValue || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.totalStockRecords || 0} Stock Batches</div>
        </div>
        {/* KPI 5: Receipts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Receipts</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalReceipts}</div>
        </div>
        {/* KPI 6: Issues */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Issues</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalIssues}</div>
        </div>
        {/* KPI 7: Low Stock */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-amber-700 font-mono">{summary.lowStockItems}</div>
        </div>
        {/* KPI 8: Overdue Inspections */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Inspections</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-bold text-red-700 font-mono">{summary.overdueInspections}</div>
        </div>
      </div>

      {/* Secondary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspections */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Inspections</span>
            <ClipboardCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">{summary.totalInspections}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="text-emerald-600 font-medium">{summary.approvedInspections} Approved</span>
            <span className="ml-2 text-red-600 font-medium">{summary.rejectedInspections} Rejected</span>
          </div>
        </div>
        {/* Pending Inspections */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Inspections</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-amber-700 font-mono">{summary.pendingInspections}</div>
        </div>
        {/* Pending Weekly */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Weekly Approvals</span>
            <CalendarCheck2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-bold text-teal-700 font-mono">{summary.pendingWeeklyApprovals}</div>
        </div>
        {/* Pending Forms */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Form 263 / 270</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-700 font-mono">
            {summary.pendingForm263 + summary.pendingForm270}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between font-mono">
            <span>Form 263: {summary.pendingForm263}</span>
            <span>Form 270: {summary.pendingForm270}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspections by Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Inspections by Status</h3>
          <div className="space-y-2">
            {(charts.inspectionsByStatus || []).length > 0 ? (
              (charts.inspectionsByStatus as any[]).map((item) => {
                const max = Math.max(...(charts.inspectionsByStatus as any[]).map((x) => x.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">{item.status.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 font-mono">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${statusColor(item.status)}`} style={{ width: `${Math.max(pct, 5)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No inspection data.</div>
            )}
          </div>
        </div>

        {/* Inspections by Month */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Inspections by Month</h3>
          <div className="space-y-2">
            {(charts.inspectionsByMonth || []).length > 0 ? (
              (charts.inspectionsByMonth as any[]).map((item) => (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.month}</span>
                    <span className="text-slate-500 font-mono">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No monthly data.</div>
            )}
          </div>
        </div>

        {/* Form 263 vs 270 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Form 263 vs 270</h3>
          <div className="space-y-3">
            {(charts.form263Vs270 || []).length > 0 ? (
              (charts.form263Vs270 as any[]).map((item) => (
                <div key={item.formType} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.formType.replace('_', ' ')}</span>
                    <span className="text-slate-500 font-mono">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No form submissions.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock by Category */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Stock by Category</h3>
          <div className="space-y-3">
            {(charts.stockByCategory || []).length > 0 ? (
              (charts.stockByCategory as any[]).map((cat) => {
                const max = Math.max(...(charts.stockByCategory as any[]).map((c) => c.value), 1);
                const pct = Math.round((cat.value / max) * 100);
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium">{cat.name}</span>
                      <span className="text-slate-500 font-mono">{cat.value.toLocaleString()} units • {formatINR(cat.totalValue || 0)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No stock categories.</div>
            )}
          </div>
        </div>

        {/* Weekly Approval Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Weekly Approval Status</h3>
          <div className="space-y-3">
            {(charts.weeklyApprovalStatus || []).length > 0 ? (
              (charts.weeklyApprovalStatus as any[]).map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.status.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 font-mono">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No weekly reviews.</div>
            )}
          </div>
        </div>

        {/* Warehouse Stock Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Warehouse Stock Summary</h3>
          <div className="space-y-3">
            {(charts.warehouseStockSummary || []).length > 0 ? (
              (charts.warehouseStockSummary as any[]).map((wh) => (
                <div key={wh.warehouse} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">[{wh.warehouse}] {wh.name}</span>
                    <span className="text-slate-500 font-mono">{formatINR(wh.stockValue || 0)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">No warehouse stock data.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Inspections Awaiting Decision ({pendingInspectionsList.length})
              </h3>
            </div>
            <button onClick={() => onNavigate('inspections')} className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer">
              <span>All Inspections</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {pendingInspectionsList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pendingInspectionsList.slice(0, 5).map((insp) => (
                <div key={insp.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors" onClick={() => { if (onSelectInspection) onSelectInspection(insp.id); onNavigate('inspections'); }}>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="font-mono text-emerald-700">{insp.inspection_number}</span>
                      <span className="text-slate-500 font-normal">[{insp.warehouse_code}]</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{insp.item_name} • Qty: {insp.quantity_inspected}</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusColor(insp.status)}`}>
                      {insp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">No inspections pending decision.</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Weekly Reviews Under Review ({pendingReviewsList.length})
              </h3>
            </div>
            <button onClick={() => onNavigate('weekly-reviews')} className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer">
              <span>All Reviews</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {pendingReviewsList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pendingReviewsList.slice(0, 5).map((rev) => (
                <div key={rev.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors" onClick={() => onNavigate('weekly-reviews')}>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <span className="font-mono text-teal-700">{rev.review_number}</span>
                      <span className="text-slate-500 font-normal">[{rev.warehouse_code}]</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(rev.week_start_date).toLocaleDateString()} - {new Date(rev.week_end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      AWAITING ENDORSEMENT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">No weekly reviews pending endorsement.</div>
          )}
        </div>
      </div>
    </div>
  );
};
