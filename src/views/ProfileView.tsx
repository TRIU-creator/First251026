import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Lock, KeyRound, Shield, Building2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const ProfileView: React.FC = () => {
  const { currentUser, warehouses } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword || !newPassword) {
      setErrorMsg('Current password and new password are required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsUpdating(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccessMsg('Security password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password change failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const assignedDepots = warehouses.filter((w) =>
    currentUser?.assignedWarehouseIds?.includes(w.id)
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="w-5 h-5" />
          </div>
          Officer Profile & Security Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          View assigned formation credentials, operational role permissions, and update security password.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personnel Particulars Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Operational Account Particulars
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Officer Name</span>
              <span className="font-semibold text-slate-900 text-sm">{currentUser?.name}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Official Email</span>
              <span className="font-mono text-emerald-700 font-semibold">{currentUser?.email}</span>
            </div>

            {currentUser?.phone && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Phone / Ext.</span>
                <span className="font-mono text-slate-700">{currentUser?.phone}</span>
              </div>
            )}

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono">Designated Role</span>
              <span className="inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {currentUser?.role}
              </span>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 block text-[10px] uppercase font-mono mb-1.5">
                Authorized Depots & Magazines
              </span>
              {currentUser?.role === 'ADMIN' ? (
                <span className="font-mono text-amber-700 text-xs font-semibold">
                  FULL UNRESTRICTED ACCESS (ALL DEPOTS)
                </span>
              ) : assignedDepots.length > 0 ? (
                <div className="space-y-1">
                  {assignedDepots.map((d) => (
                    <div key={d.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-mono text-emerald-700 font-bold">[{d.warehouseCode}]</span>
                      <span className="text-slate-800">{d.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 font-mono">No specific depots assigned.</span>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            Update Security Password
          </h2>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                New Secure Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
