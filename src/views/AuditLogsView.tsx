import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Shield, Calendar, Terminal } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        search: searchTerm.trim() || undefined
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Activity className="w-5 h-5" />
            </div>
            Immutable Security Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Full chronological audit trail capturing logins, stock entries, inspections, approvals, overrides, and deletions.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-slate-300 shadow-xs"
        >
          Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by Action, Entity ID, User, or IP address..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Recorded Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="STOCK_INWARD">STOCK_INWARD</option>
          <option value="STOCK_UPDATE">STOCK_UPDATE</option>
          <option value="CREATE_INSPECTION">CREATE_INSPECTION</option>
          <option value="APPROVE_INSPECTION">APPROVE_INSPECTION</option>
          <option value="REJECT_INSPECTION">REJECT_INSPECTION</option>
          <option value="ADMIN_OVERRIDE_INSPECTION">ADMIN_OVERRIDE_INSPECTION</option>
          <option value="CREATE_WEEKLY_REVIEW">CREATE_WEEKLY_REVIEW</option>
          <option value="APPROVE_WEEKLY_REVIEW">APPROVE_WEEKLY_REVIEW</option>
          <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
        </select>
      </form>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Security Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity Reference</th>
                <th className="py-3 px-4">Operator / Account</th>
                <th className="py-3 px-4 text-right">IP Address</th>
                <th className="py-3 px-4 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                        log.action.includes('OVERRIDE')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : log.action.includes('REJECT') || log.action.includes('DELETE')
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : log.action.includes('APPROVE')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {log.entity_type}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {log.entity_id}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{log.user_name || 'System / Setup'}</span>
                    {log.user_email && (
                      <span className="text-[10px] text-slate-500 font-mono block">{log.user_email}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    {(log.before_data || log.after_data) ? (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[10px] font-mono font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors"
                      >
                        Inspect
                      </button>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !isLoading && (
          <div className="p-10 text-center text-xs text-slate-500 font-mono">
            No audit logs match current search criteria.
          </div>
        )}
      </div>

      {/* Inspect Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Audit Payload Inspection: {selectedLog.action}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Entity: {selectedLog.entity_type} • ID: {selectedLog.entity_id} • User: {selectedLog.user_name}
            </p>

            <div className="space-y-3 text-xs">
              {selectedLog.before_data && (
                <div>
                  <span className="font-mono text-[10px] uppercase text-rose-700 font-bold block mb-1">Before State:</span>
                  <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto text-[11px] font-mono text-slate-800">
                    {JSON.stringify(JSON.parse(selectedLog.before_data), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-700 font-bold block mb-1">Committed Payload:</span>
                  <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto text-[11px] font-mono text-emerald-800">
                    {JSON.stringify(JSON.parse(selectedLog.after_data), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
