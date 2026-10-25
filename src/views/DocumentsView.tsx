import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileUp,
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { Document as DocumentType } from '../types';
import { api } from '../services/api';

export const DocumentsView: React.FC = () => {
  const { documents, refreshAll, isAdmin, isManager } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('GENERAL');
  const [entityId, setEntityId] = useState('DEPOT-MAIN');
  const [remarks, setRemarks] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentType | null>(null);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!file) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId.trim() || 'DEPOT-GENERAL');
      formData.append('remarks', remarks.trim());

      await api.uploadDocument(formData);
      await refreshAll();
      setIsUploadOpen(false);
      setFile(null);
      setRemarks('');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete document '${name}'?`)) return;
    try {
      await api.deleteDocument(id);
      await refreshAll();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.remarks && doc.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.entity_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileUp className="w-5 h-5" />
            </div>
            Document Storage & Technical PDF Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Archival repository for ballistic proof records, ordnance certificates, and safety telemetry.
          </p>
        </div>

        <button
          onClick={() => {
            setFile(null);
            setRemarks('');
            setUploadError(null);
            setIsUploadOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Supporting Document</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by file name, remarks, or entity reference..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Entity Attachments</option>
          <option value="INSPECTION">Ammunition Inspection</option>
          <option value="STOCK_RECORD">Stock Consignment</option>
          <option value="FORM_SUBMISSION">Form 263 / 270</option>
          <option value="GENERAL">General Technical Attachment</option>
        </select>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => {
          const isPdf = doc.file_type?.toLowerCase().includes('pdf') || doc.file_name.toLowerCase().endsWith('.pdf');
          const isImage = doc.file_type?.toLowerCase().includes('image') || /\.(jpg|jpeg|png)$/i.test(doc.file_name);

          return (
            <div
              key={doc.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {isPdf ? (
                      <div className="p-2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                        <FileText className="w-4 h-4" />
                      </div>
                    ) : isImage ? (
                      <div className="p-2 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      {doc.entity_type}
                    </span>
                  </div>

                  {(isAdmin || isManager) && (
                    <button
                      onClick={() => handleDelete(doc.id, doc.file_name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                      title="Delete File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 mb-1 truncate" title={doc.file_name}>
                  {doc.file_name}
                </h3>
                <p className="text-[11px] text-slate-600 mb-2 line-clamp-2">
                  {doc.remarks || 'Official technical file attachment.'}
                </p>

                <div className="text-[10px] font-mono text-slate-500 space-y-0.5 mb-3">
                  <div>Size: {(doc.file_size / 1024).toFixed(1)} KB</div>
                  <div>Uploaded by: {doc.uploaded_by_name || 'Staff'}</div>
                  <div>Date: {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <a
                  href={api.getDocumentDownloadUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500 font-mono">
          No document attachments or proof sheets match your current filters.
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-emerald-600" />
              Upload Proof Document / Certificate
            </h2>

            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Select File (PDF, Images, Sheets) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Attachment Category
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="GENERAL">General Depot Document</option>
                    <option value="INSPECTION">Inspection Certificate</option>
                    <option value="STOCK_RECORD">Inward Consignment Sheet</option>
                    <option value="FORM_SUBMISSION">Form 263 / 270 Dossier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Entity / Voucher Reference
                  </label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="e.g. INSP-2024-001"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Document Description & Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Record description (e.g. Proof firing velocity calibration sheet, Ordnance seal certificate)..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Save Attachment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF / Document In-App Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold text-slate-900 truncate">{previewDoc.file_name}</h3>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold">{previewDoc.entity_type} • Ref: {previewDoc.entity_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={api.getDocumentDownloadUrl(previewDoc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
              {previewDoc.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={api.getDocumentDownloadUrl(previewDoc.id)}
                  className="w-full h-full rounded border border-slate-300 bg-white shadow-xs"
                  title={previewDoc.file_name}
                />
              ) : /\.(jpg|jpeg|png)$/i.test(previewDoc.file_name) ? (
                <img
                  src={api.getDocumentDownloadUrl(previewDoc.id)}
                  alt={previewDoc.file_name}
                  className="max-w-full max-h-full object-contain rounded bg-white shadow-xs"
                />
              ) : (
                <div className="text-center text-xs font-mono text-slate-600 bg-white p-8 rounded-xl border border-slate-200 shadow-xs max-w-md">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-semibold text-slate-800">Binary technical document ready.</p>
                  <a
                    href={api.getDocumentDownloadUrl(previewDoc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 text-emerald-600 hover:underline font-semibold"
                  >
                    Click here to download {previewDoc.file_name}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
