import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Building2,
  KeyRound,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { User, Role, Status } from '../types';
import { api } from '../services/api';

export const UsersView: React.FC = () => {
  const { warehouses, currentUser, refreshAll } = useApp();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('TECHNICAL_INSPECTOR');
  const [status, setStatus] = useState<Status>('ACTIVE');
  const [assignedWhIds, setAssignedWhIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      setUsersList(res.users);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('TECHNICAL_INSPECTOR');
    setStatus('ACTIVE');
    setAssignedWhIds([]);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setPassword(''); // Leave blank unless changing
    setRole(u.role);
    setStatus(u.status);
    setAssignedWhIds(u.assignedWarehouseIds || []);
    setError(null);
    setIsModalOpen(true);
  };

  const toggleWarehouse = (whId: string) => {
    if (assignedWhIds.includes(whId)) {
      setAssignedWhIds(assignedWhIds.filter((id) => id !== whId));
    } else {
      setAssignedWhIds([...assignedWhIds, whId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Officer name and official email are mandatory.');
      return;
    }

    if (!editingUser && (!password || password.length < 8)) {
      setError('Password must contain at least 8 characters for new personnel accounts.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password: password.trim() ? password : undefined,
          role,
          status,
          assignedWarehouseIds: assignedWhIds
        });
      } else {
        await api.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          role,
          status,
          assignedWarehouseIds: assignedWhIds
        });
      }

      await loadUsers();
      await refreshAll();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('You cannot delete your own administrative account.');
      return;
    }
    if (!window.confirm(`Permanently remove personnel account '${u.name}' (${u.email})?`)) {
      return;
    }
    try {
      await api.deleteUser(u.id);
      await loadUsers();
      await refreshAll();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const filtered = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users className="w-5 h-5" />
            </div>
            Personnel Administration & Depot Authorization
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role-based clearance (Admin, Warehouse Manager, Technical Inspector, Viewer) and assigned magazines.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Personnel Account</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search personnel by name, email, or designation..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">ADMIN (Full Access)</option>
          <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER</option>
          <option value="TECHNICAL_INSPECTOR">TECHNICAL_INSPECTOR</option>
          <option value="VIEWER">VIEWER / STAFF</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Officer Name & Contact</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Assigned Depots</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((user) => {
                const assignedNames = warehouses
                  .filter((w) => user.assignedWarehouseIds?.includes(w.id))
                  .map((w) => w.warehouseCode);

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      {user.phone && <div className="text-[11px] text-slate-500 font-mono">{user.phone}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                      {user.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                          user.role === 'ADMIN'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : user.role === 'TECHNICAL_INSPECTOR'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : user.role === 'WAREHOUSE_MANAGER'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {user.role === 'ADMIN' ? (
                        <span className="text-amber-700 font-semibold">ALL DEPOTS (UNRESTRICTED)</span>
                      ) : assignedNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedNames.map((code) => (
                            <span key={code} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">None Assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded font-bold border ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(user)}
                          title="Edit User"
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            title="Delete User"
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !isLoading && (
          <div className="p-10 text-center text-xs text-slate-500 font-mono">
            No personnel accounts match the current filter criteria.
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl my-8">
            <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {editingUser ? 'Edit Personnel Credentials' : 'Provision Personnel Account'}
            </h2>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Full Name & Rank/Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Capt. Arjun Varma / Ammunition Technical Officer"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjun.varma@defence.gov.in"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Contact Phone / Ext.
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ADMIN">ADMIN (Full Authority)</option>
                    <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER (Depot Mgr)</option>
                    <option value="TECHNICAL_INSPECTOR">TECHNICAL_INSPECTOR (Inspections)</option>
                    <option value="VIEWER">VIEWER / STAFF (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  {editingUser ? 'Reset Password (Leave blank to keep unchanged)' : 'Initial Secure Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Enter new password or leave blank' : 'Min. 8 characters'}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Warehouse Assignments */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1.5">
                  Assigned Ordnance Depots & Magazines
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {warehouses.map((wh) => (
                    <label
                      key={wh.id}
                      className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={assignedWhIds.includes(wh.id)}
                        onChange={() => toggleWarehouse(wh.id)}
                        className="w-3.5 h-3.5 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="font-mono text-emerald-700 font-bold">[{wh.warehouseCode}]</span>
                      <span>{wh.name}</span>
                    </label>
                  ))}
                  {warehouses.length === 0 && (
                    <span className="text-xs text-slate-500 font-mono">No depots configured.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update Account' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
