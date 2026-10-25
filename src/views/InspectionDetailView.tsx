import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ShieldAlert,
  FileUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { Inspection, InspectionStatus } from '../types';
import { api } from '../services/api';

interface InspectionDetailViewProps {
  inspectionId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  inspectionId,
  onBack,
  onRefresh
}) => {
  const { currentUser, isAdmin, isManager, isInspector } = useApp();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [overrideResult, setOverrideResult] = useState<'PASS' | 'FAIL' | 'REINSPECTION_REQUIRED'>('PASS');

  // File Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchInspection = async () => {
    setIsLoading(true);
    try {
      const res = await api.getInspection(inspectionId);
      setInspection(res.inspection);
    } catch (err) {
      console.error('Error fetching inspection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [inspectionId]);

  const handleSubmitForReview = async () => {
    if (!inspection) return;
    try {
      await api.submitInspection(inspection.id);
      await fetchInspection();
      onRefresh();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  const handleApprove = async () => {
    if (!inspection) return;
    setActionError(null);
    if (!actionRemarks.trim()) {
      setActionError('Mandatory officer approval remarks are required.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      await api.approveInspection(inspection.id, actionRemarks.trim());
      setShowApproveModal(false);
      setActionRemarks('');
      await fetchInspection();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Approval failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!inspection) return;
    setActionError(null);
    if (!actionRemarks.trim()) {
      setActionError('Mandatory rejection reasons / corrective instructions are required.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      await api.rejectInspection(inspection.id, actionRemarks.trim());
      setShowRejectModal(false);
      setActionRemarks('');
      await fetchInspection();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOverride = async () => {
    if (!inspection) return;
    setActionError(null);
    if (!overrideRemarks.trim()) {
      setActionError('Administrator override remarks are mandatory by security protocol.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      await api.overrideInspection(inspection.id, {
        overallResult: overrideResult,
        overrideRemarks: overrideRemarks.trim()
      });
      setShowOverrideModal(false);
      setOverrideRemarks('');
      await fetchInspection();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Override failed');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !inspection) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('entityType', 'INSPECTION');
      formData.append('entityId', inspection.id);
      formData.append('remarks', uploadRemarks || 'Inspection test report attachment');

      await api.uploadDocument(formData);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadRemarks('');
      await fetchInspection();
      onRefresh();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !inspection) {
    return (
      <div className="p-12 text-center text-xs font-mono text-slate-500">
        Loading ammunition inspection dossier...
      </div>
    );
  }

  const canApprove = (isAdmin || isManager) && (inspection.status === 'SUBMITTED' || inspection.status === 'UNDER_REVIEW');
  const canSubmit = (isAdmin || isInspector || isManager) && inspection.status === 'DRAFT';
  const canOverride = isAdmin && inspection.status === 'APPROVED';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Controls (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Inspection Register</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {canSubmit && (
            <button
              onClick={handleSubmitForReview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Submit for Manager Review
            </button>
          )}

          {canApprove && (
            <>
              <button
                onClick={() => {
                  setActionRemarks('');
                  setActionError(null);
                  setShowApproveModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Endorse &amp; Approve</span>
              </button>

              <button
                onClick={() => {
                  setActionRemarks('');
                  setActionError(null);
                  setShowRejectModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Inspection</span>
              </button>
            </>
          )}

          {canOverride && (
            <button
              onClick={() => {
                setOverrideResult(inspection.overall_result as any);
                setOverrideRemarks('');
                setActionError(null);
                setShowOverrideModal(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Admin Override</span>
            </button>
          )}

          <button
            onClick={() => setIsUploadOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attach Proof File</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-teal-600" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs text-slate-800 print:bg-white print:text-black print:border-black print:p-0">
        {/* Defence Certificate Header */}
        <div className="border-b-2 border-slate-200 print:border-black pb-4 mb-6 text-center">
          <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500 font-semibold print:text-gray-700">
            DEFENCE TECHNICAL STORES &amp; ORDNANCE SURVEILLANCE
          </div>
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900 print:text-black mt-1">
            Official Ammunition Inspection &amp; Condition Certificate
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs font-mono text-emerald-800 print:text-gray-900 mt-2 font-medium">
            <span>Dossier: <b className="text-slate-900">{inspection.inspection_number}</b></span>
            <span>•</span>
            <span>Date: <b className="text-slate-900">{new Date(inspection.inspection_date).toLocaleDateString()}</b></span>
            <span>•</span>
            <span>Type: <b className="text-slate-900">{inspection.inspection_type}</b></span>
          </div>
        </div>

        {/* Status & Outcome Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-400">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold print:text-gray-600 block">
              Inspection Status
            </span>
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                inspection.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 print:text-green-800'
                  : inspection.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 print:text-red-800'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 print:text-amber-800'
              }`}
            >
              {inspection.status}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold print:text-gray-600 block">
              Technical Finding Result
            </span>
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                inspection.overall_result === 'PASS'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 print:text-green-800'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 print:text-red-800'
              }`}
            >
              {inspection.overall_result}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold print:text-gray-600 block">
              Quantities Inspected
            </span>
            <div className="text-xs font-mono font-semibold mt-1 text-slate-900">
              Passed: <b className="text-emerald-700 print:text-green-800">{inspection.quantity_passed}</b> / Total:{' '}
              <b>{inspection.quantity_inspected}</b>
              {inspection.quantity_quarantined > 0 && (
                <span className="text-amber-700 ml-1">({inspection.quantity_quarantined} Quarantined)</span>
              )}
            </div>
          </div>
        </div>

        {/* Store & Depot Particulars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg print:border-gray-400">
            <span className="font-bold text-slate-900 print:text-black uppercase text-[11px] block mb-2">
              Depot &amp; Magazine Facility
            </span>
            <div className="space-y-1 font-mono text-slate-700 print:text-gray-800">
              <div>Depot Code: <b className="text-slate-900">{inspection.warehouse_code}</b></div>
              <div>Facility Name: {inspection.warehouse_name}</div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg print:border-gray-400">
            <span className="font-bold text-slate-900 print:text-black uppercase text-[11px] block mb-2">
              Ammunition Specification
            </span>
            <div className="space-y-1 font-mono text-slate-700 print:text-gray-800">
              <div>Item Code: <b className="text-slate-900">{inspection.item_code}</b></div>
              <div>Nomenclature: {inspection.item_name}</div>
              <div>Category: {inspection.item_category}</div>
            </div>
          </div>
        </div>

        {/* Parameters Checklist Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black mb-2">
            Standard Condition &amp; Surveillance Parameters Checklist
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden print:border-gray-400">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200 print:bg-gray-200 print:text-black">
                  <th className="py-2.5 px-3">Surveillance Parameter</th>
                  <th className="py-2.5 px-3">Standard Criterion</th>
                  <th className="py-2.5 px-3">Depot Observed Value</th>
                  <th className="py-2.5 px-3 text-center">Finding</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 print:text-black print:divide-gray-300">
                {inspection.parameters && inspection.parameters.length > 0 ? (
                  inspection.parameters.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-medium text-slate-900 print:text-black">{p.parameterName}</td>
                      <td className="py-2 px-3 text-slate-500 print:text-gray-600 font-mono text-[11px]">{p.expectedValue}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-teal-700 font-semibold print:text-gray-900">{p.observedValue}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            p.result === 'PASS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.result}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 print:text-gray-600 text-[11px]">{p.remarks || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 font-mono text-xs">
                      No discrete parameter checks registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Serials Table (If present) */}
        {inspection.serials && inspection.serials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 print:text-black mb-2">
              Individual Tracked Serial Numbers
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden print:border-gray-400">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200 print:bg-gray-200 print:text-black">
                    <th className="py-2 px-3">Serial Number</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Condition Assessment</th>
                    <th className="py-2 px-3 text-center">Result</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 print:text-black print:divide-gray-300">
                  {inspection.serials.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono font-bold text-teal-800 print:text-black">{s.serialNumber}</td>
                      <td className="py-2 px-3 font-mono">{s.quantity}</td>
                      <td className="py-2 px-3">{s.condition}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[10px] text-emerald-700">
                        {s.result}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{s.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Findings & Recommendations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg print:border-gray-400">
            <span className="font-bold text-slate-900 print:text-black uppercase text-[10px] block mb-1">
              Technical Inspector Observations &amp; Findings
            </span>
            <p className="text-slate-700 print:text-black leading-relaxed">
              {inspection.findings || 'No adverse physical anomalies noted during floor inspection.'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg print:border-gray-400">
            <span className="font-bold text-slate-900 print:text-black uppercase text-[10px] block mb-1">
              Storage Recommendations &amp; Endorsement
            </span>
            <p className="text-slate-700 print:text-black leading-relaxed">
              {inspection.recommendations || 'Store in standard ventilated magazine. Maintain normal surveillance frequency.'}
            </p>
          </div>
        </div>

        {/* Signatures & Endorsement Block */}
        <div className="pt-6 border-t-2 border-slate-200 print:border-black grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold print:text-gray-600 block">
              Inspecting Technical Officer
            </span>
            <div className="font-bold text-slate-900 print:text-black">{inspection.inspector_name || 'Inspector'}</div>
            <div className="text-[10px] text-slate-500 print:text-gray-700 font-mono">
              Date: {new Date(inspection.inspection_date).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-1 text-right">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold print:text-gray-600 block">
              Authorised Approving Authority
            </span>
            <div className="font-bold text-slate-900 print:text-black">
              {inspection.approver_name ? inspection.approver_name : 'Pending Final Officer Signature'}
            </div>
            {inspection.approved_at && (
              <div className="text-[10px] text-slate-500 print:text-gray-700 font-mono">
                Approved: {new Date(inspection.approved_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Supporting Documents (Screen Only) */}
        {inspection.documents && inspection.documents.length > 0 && (
          <div className="print:hidden mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Attached Proof Firing Sheets &amp; Certificates ({inspection.documents.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inspection.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-900 truncate">{doc.file_name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={api.getDocumentDownloadUrl(doc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white px-2.5 py-1 rounded border border-slate-300 shadow-xs"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Endorse &amp; Approve Ammunition Inspection
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Approving this inspection will automatically update the linked stock record status in the depot inventory.
            </p>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {actionError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Approver Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Record formal approval endorsement, storage categorization (Cat A/B/C), and clearance..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingAction ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Reject Inspection Record
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Provide formal non-conformance reasons. Record will be marked as REJECTED.
            </p>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {actionError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Rejection Reasons <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Specify defects found (e.g., moisture indicator pink, excessive propellant grain disintegration)..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={handleReject}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingAction ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Administrative Security Override
            </h2>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Administrator authority is required to adjust an already approved ammunition inspection.
            </p>

            {actionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {actionError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Adjust Overall Result
                </label>
                <select
                  value={overrideResult}
                  onChange={(e) => setOverrideResult(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-xs"
                >
                  <option value="PASS">PASS (Serviceable)</option>
                  <option value="FAIL">FAIL (Quarantine / Demolition)</option>
                  <option value="REINSPECTION_REQUIRED">REINSPECTION_REQUIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Mandatory Override Protocol Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  placeholder="Official justification for overriding approved ammunition inspection record..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={handleOverride}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingAction ? 'Applying...' : 'Commit Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-emerald-600" />
              Attach Proof File / Certificate (Max 10MB)
            </h2>

            <form onSubmit={handleUploadDocument} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Select File (PDF, PNG, JPG) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Document Description / Remarks
                </label>
                <input
                  type="text"
                  value={uploadRemarks}
                  onChange={(e) => setUploadRemarks(e.target.value)}
                  placeholder="e.g. Proof firing velocity calibration chart"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Attach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
