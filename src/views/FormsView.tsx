import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  Building2,
  Calendar,
  X,
  FileUp,
  Printer
} from 'lucide-react';
import { FormSubmission, FormTemplate, FormField } from '../types';
import { api } from '../services/api';

export const FormsView: React.FC = () => {
  const {
    formTemplates,
    formSubmissions,
    warehouses,
    items,
    refreshAll,
    selectedWarehouseId,
    isAdmin,
    isInspector,
    isManager
  } = useApp();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Submit Form Modal
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [submissionWarehouseId, setSubmissionWarehouseId] = useState('');
  const [submissionItemId, setSubmissionItemId] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submissionRemarks, setSubmissionRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Submission Detail Modal
  const [viewingSubmission, setViewingSubmission] = useState<FormSubmission | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const openSubmitModal = (tpl: FormTemplate) => {
    setActiveTemplate(tpl);
    setSubmissionWarehouseId(warehouses[0]?.id || '');
    setSubmissionItemId(items[0]?.id || '');

    // Pre-populate default values
    const initialData: Record<string, any> = {};
    if (tpl.fields) {
      tpl.fields.forEach((f) => {
        if (f.default_value) {
          initialData[f.field_key] = f.default_value;
        } else if (f.options && f.options.length > 0) {
          initialData[f.field_key] = f.options[0];
        } else {
          initialData[f.field_key] = '';
        }
      });
    }

    setFormData(initialData);
    setSubmissionRemarks('Standard technical inspection protocol submission.');
    setFormError(null);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;
    setFormError(null);

    // Validate required fields
    if (activeTemplate.fields) {
      for (const field of activeTemplate.fields) {
        if (field.required && !formData[field.field_key]) {
          setFormError(`Field '${field.field_label}' is mandatory.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await api.createFormSubmission({
        formTemplateId: activeTemplate.id,
        warehouseId: submissionWarehouseId,
        itemId: submissionItemId || undefined,
        formData,
        remarks: submissionRemarks
      });

      // Instantly refresh across modules
      await refreshAll();
      setActiveTemplate(null);
    } catch (err: any) {
      setFormError(err.message || 'Form submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSubmission = async () => {
    if (!viewingSubmission) return;
    setApprovalError(null);
    if (!approvalRemarks.trim()) {
      setApprovalError('Mandatory officer approval endorsement remarks are required.');
      return;
    }

    setIsApproving(true);
    try {
      await api.approveForm(viewingSubmission.id, approvalRemarks.trim());
      await refreshAll();
      setViewingSubmission(null);
      setApprovalRemarks('');
    } catch (err: any) {
      setApprovalError(err.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectSubmission = async () => {
    if (!viewingSubmission) return;
    setApprovalError(null);
    if (!approvalRemarks.trim()) {
      setApprovalError('Mandatory rejection reasons / corrective instructions are required.');
      return;
    }

    setIsApproving(true);
    try {
      await api.rejectForm(viewingSubmission.id, approvalRemarks.trim());
      await refreshAll();
      setViewingSubmission(null);
      setApprovalRemarks('');
    } catch (err: any) {
      setApprovalError(err.message || 'Rejection failed');
    } finally {
      setIsApproving(false);
    }
  };

  const filteredSubmissions = formSubmissions.filter((s) => {
    const matchesWarehouse =
      selectedWarehouseId === 'ALL' || s.warehouse_id === selectedWarehouseId;
    const matchesTemplate =
      selectedTemplateId === 'ALL' || s.form_template_id === selectedTemplateId;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      s.submission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.form_name && s.form_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.item_name && s.item_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesWarehouse && matchesTemplate && matchesStatus && matchesSearch;
  });

  const canApprove = (isAdmin || isManager) && viewingSubmission?.status === 'SUBMITTED';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Technical Inspection Forms (Form 263 / Form 270)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Military ordnance lot acceptance, chemical propellant stability tests, and proof firing records.
          </p>
        </div>
      </div>

      {/* Available Technical Templates Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {tpl.form_code}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Ver {tpl.form_version}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{tpl.form_name}</h3>
              <p className="text-xs text-slate-500 mb-3">{tpl.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {tpl.fields?.length || 0} Standard Parameters
              </span>
              {(isAdmin || isInspector || isManager) && (
                <button
                  onClick={() => openSubmitModal(tpl)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fill &amp; Submit</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submissions Register Header & Filters */}
      <div className="pt-2">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          Technical Form Submissions Dossier
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Submission #, Form Name, or Item Code..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            />
          </div>

          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          >
            <option value="ALL">All Form Types</option>
            {formTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.form_code} - {t.form_name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          >
            <option value="ALL">All Submission Statuses</option>
            <option value="SUBMITTED">SUBMITTED (Awaiting Review)</option>
            <option value="APPROVED">APPROVED (Endorsed)</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Submission Dossier</th>
                <th className="py-3 px-4">Form Code &amp; Title</th>
                <th className="py-3 px-4">Depot</th>
                <th className="py-3 px-4">Ammunition Store</th>
                <th className="py-3 px-4">Submitting Inspector</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredSubmissions.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => setViewingSubmission(sub)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {sub.submission_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{sub.form_name}</div>
                    <div className="text-[11px] text-teal-700 font-mono">{sub.form_code}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    [{sub.warehouse_code}]
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{sub.item_name || 'General Batch'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{sub.item_code}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {sub.submitter_name || 'Inspector'}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        sub.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sub.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSubmission(sub);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-end gap-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="p-10 text-center text-xs text-slate-400 font-mono">
            No technical form submissions found matching your filters.
          </div>
        )}
      </div>

      {/* Fill & Submit Form Modal */}
      {activeTemplate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700">[{activeTemplate.form_code}]</span>
                <h2 className="text-base font-bold text-slate-900">{activeTemplate.form_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Depot Facility <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={submissionWarehouseId}
                    onChange={(e) => setSubmissionWarehouseId(e.target.value)}
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
                    Applicable Ammunition Item
                  </label>
                  <select
                    value={submissionItemId}
                    onChange={(e) => setSubmissionItemId(e.target.value)}
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

              {/* Dynamic Fields from Database Template */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase">
                  Technical Parameters &amp; Inspection Criteria
                </h3>
                {activeTemplate.fields?.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {field.field_label} {field.required ? <span className="text-rose-500">*</span> : null}
                    </label>

                    {field.field_type === 'SELECT' ? (
                      <select
                        value={formData[field.field_key] || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.field_type === 'TEXTAREA' ? (
                      <textarea
                        rows={2}
                        value={formData[field.field_key] || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                      />
                    ) : (
                      <input
                        type={field.field_type === 'NUMBER' ? 'number' : 'text'}
                        value={formData[field.field_key] || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  General Remarks / Inspector Notes
                </label>
                <textarea
                  rows={2}
                  value={submissionRemarks}
                  onChange={(e) => setSubmissionRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTemplate(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Technical Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Endorse Submission Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {viewingSubmission.submission_number}
                </span>
                <h2 className="text-base font-bold text-slate-900">{viewingSubmission.form_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {approvalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {approvalError}
              </div>
            )}

            {/* Particulars Card */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono mb-4">
              <div>
                <span className="text-slate-500">Depot:</span>{' '}
                <b className="text-slate-900">[{viewingSubmission.warehouse_code}] {viewingSubmission.warehouse_name}</b>
              </div>
              <div>
                <span className="text-slate-500">Ammunition Item:</span>{' '}
                <b className="text-slate-900">{viewingSubmission.item_name || 'General'}</b>
              </div>
              <div>
                <span className="text-slate-500">Submitted By:</span>{' '}
                <span className="text-slate-700">{viewingSubmission.submitter_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Submission Date:</span>{' '}
                <span className="text-slate-700">
                  {new Date(viewingSubmission.submission_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Recorded Technical Fields */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Recorded Technical Inspection Parameters
              </h3>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50 text-xs">
                {Object.entries(viewingSubmission.form_data || {}).map(([k, v]) => (
                  <div key={k} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-600 capitalize font-medium">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-mono text-emerald-800 font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval trail or Decision actions */}
            {canApprove ? (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Mandatory Approving Officer Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Official endorsement remarks, proof validation, or rejection grounds..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
                />

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={handleRejectSubmission}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Form</span>
                  </button>
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={handleApproveSubmission}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Endorse &amp; Approve Form</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                Status: <b className="text-slate-900">{viewingSubmission.status}</b>
                {viewingSubmission.remarks && (
                  <div className="mt-1 text-slate-500">Remarks: {viewingSubmission.remarks}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
