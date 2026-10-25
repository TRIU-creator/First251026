import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarCheck2,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  X,
  FileText
} from 'lucide-react';
import { WeeklyReview } from '../types';
import { api } from '../services/api';

export const WeeklyReviewsView: React.FC = () => {
  const { weeklyReviews, warehouses, refreshAll, selectedWarehouseId, isAdmin, isManager } = useApp();

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftWarehouseId, setDraftWarehouseId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [weekEndDate, setWeekEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reviewType, setReviewType] = useState('AMMUNITION_STORAGE');
  const [draftRemarks, setDraftRemarks] = useState('Weekly depot floor inspection and stock balance review cycle.');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  // Endorsement Modal
  const [endorsingReview, setEndorsingReview] = useState<WeeklyReview | null>(null);
  const [endorsementRemarks, setEndorsementRemarks] = useState('');
  const [endorsementError, setEndorsementError] = useState<string | null>(null);
  const [isEndorsing, setIsEndorsing] = useState(false);

  const openDraftModal = () => {
    setDraftWarehouseId(warehouses[0]?.id || '');
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setWeekStartDate(start.toISOString().slice(0, 10));
    setWeekEndDate(end.toISOString().slice(0, 10));
    setReviewType('AMMUNITION_STORAGE');
    setDraftRemarks('Weekly depot floor inspection and stock balance review cycle.');
    setDraftError(null);
    setIsDraftModalOpen(true);
  };

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDraftError(null);

    if (!draftWarehouseId || !weekStartDate || !weekEndDate) {
      setDraftError('Depot facility and review dates are mandatory.');
      return;
    }

    setIsSubmittingDraft(true);
    try {
      await api.createWeeklyReview({
        warehouseId: draftWarehouseId,
        weekStartDate,
        weekEndDate,
        reviewType,
        remarks: draftRemarks
      });

      await refreshAll();
      setIsDraftModalOpen(false);
    } catch (err: any) {
      setDraftError(err.message || 'Draft creation failed');
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await api.submitWeeklyReview(id);
      await refreshAll();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  const handleEndorseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endorsingReview) return;
    setEndorsementError(null);

    if (!endorsementRemarks.trim()) {
      setEndorsementError('Mandatory officer endorsement remarks are required to seal the weekly audit.');
      return;
    }

    setIsEndorsing(true);
    try {
      await api.approveWeeklyReview(endorsingReview.id, endorsementRemarks.trim());
      await refreshAll();
      setEndorsingReview(null);
      setEndorsementRemarks('');
    } catch (err: any) {
      setEndorsementError(err.message || 'Endorsement failed');
    } finally {
      setIsEndorsing(false);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const filtered = weeklyReviews.filter((r) => {
    if (selectedWarehouseId === 'ALL') return true;
    return r.warehouse_id === selectedWarehouseId;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
            Weekly Store Review &amp; Approval Cycles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Weekly inventory audit aggregation, inspection sign-off, and commanding officer endorsement locks.
          </p>
        </div>

        {(isAdmin || isManager) && (
          <button
            onClick={openDraftModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Weekly Review</span>
          </button>
        )}
      </div>

      {/* Reviews Cards / Grid */}
      <div className="space-y-4">
        {filtered.map((rev) => {
          const isDraft = rev.status === 'DRAFT';
          const isSubmitted = rev.status === 'SUBMITTED';
          const isApproved = rev.status === 'APPROVED';

          return (
            <div
              key={rev.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-300 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rev.review_number}
                    </span>
                    <span className="font-bold text-sm text-slate-900">[{rev.warehouse_code}] {rev.warehouse_name}</span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isSubmitted
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Review Cycle: {new Date(rev.week_start_date).toLocaleDateString()} to{' '}
                      {new Date(rev.week_end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {isDraft && (isAdmin || isManager) && (
                    <button
                      onClick={() => handleSubmitForReview(rev.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      Submit for Endorsement
                    </button>
                  )}

                  {isSubmitted && (isAdmin || isManager) && (
                    <button
                      onClick={() => {
                        setEndorsingReview(rev);
                        setEndorsementRemarks('');
                        setEndorsementError(null);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Endorse &amp; Seal Review</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Aggregated Real DB Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Stock Valuation</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {formatINR(rev.stock_value)}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Stock Batches Checked</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                    {rev.total_records_reviewed} Batches
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Inspections Completed</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
                    {rev.completed_inspections} ({rev.approved_inspections} Approved)
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Pending Floor Checks</span>
                  <span className="font-mono font-bold text-amber-700 text-sm mt-0.5 block">
                    {rev.pending_inspections}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Rejected / Quarantine</span>
                  <span className="font-mono font-bold text-rose-600 text-sm mt-0.5 block">
                    {rev.rejected_inspections}
                  </span>
                </div>
              </div>

              {/* Remarks & Signatures */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800">Remarks:</span> {rev.remarks || 'Standard weekly cycle.'}
                </div>
                <div className="font-mono text-[11px] text-slate-500 shrink-0">
                  Prepared by: <b className="text-slate-800">{rev.prepared_by_name || 'Officer'}</b>
                  {rev.approved_by_name && (
                    <span> • Endorsed by: <b className="text-teal-700">{rev.approved_by_name}</b></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 font-mono shadow-xs">
          No weekly review audit cycles generated yet for selected depot.
        </div>
      )}

      {/* Draft Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              Generate Weekly Store Audit Review
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              The system will automatically query and aggregate all live database records (stock valuation, completed inspections, pending actions) for the selected period.
            </p>

            {draftError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {draftError}
              </div>
            )}

            <form onSubmit={handleDraftSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Depot Facility <span className="text-rose-500">*</span>
                </label>
                <select
                  value={draftWarehouseId}
                  onChange={(e) => setDraftWarehouseId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Week Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Week End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={weekEndDate}
                    onChange={(e) => setWeekEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Audit Notes / Cycle Remarks
                </label>
                <textarea
                  rows={2}
                  value={draftRemarks}
                  onChange={(e) => setDraftRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDraft}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDraft ? 'Aggregating...' : 'Compile & Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Endorsement Modal */}
      {endorsingReview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Managerial Endorsement &amp; Seal
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Review: {endorsingReview.review_number} • Depot: [{endorsingReview.warehouse_code}] {endorsingReview.warehouse_name}
            </p>

            {endorsementError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {endorsementError}
              </div>
            )}

            <form onSubmit={handleEndorseSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Commanding Officer Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={endorsementRemarks}
                  onChange={(e) => setEndorsementRemarks(e.target.value)}
                  placeholder="Record formal endorsement, depot floor inspection sign-off, and security sealing..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEndorsingReview(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEndorsing}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isEndorsing ? 'Sealing...' : 'Endorse & Lock Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
