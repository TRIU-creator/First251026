import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from './AppSidebar';
import { LogOut, Bell, Building2, User, ShieldCheck } from 'lucide-react';

interface AppHeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentTab, onSelectTab, onLogout }) => {
  const { currentUser, warehouses, selectedWarehouseId, setSelectedWarehouseId, inspections, weeklyReviews } = useApp();

  const pendingInspections = inspections.filter((i) => i.status === 'SUBMITTED').length;
  const pendingReviews = weeklyReviews.filter((w) => w.status === 'SUBMITTED').length;
  const totalPending = pendingInspections + pendingReviews;

  const tabTitles: Record<NavigationTab, string> = {
    dashboard: 'Command Operations & Surveillance Dashboard',
    stock: 'Ammunition & Technical Store Stock Register',
    inspections: 'Ammunition Condition & Routine Inspections',
    forms: 'Technical Inspection Forms (Form 263 / 270)',
    'weekly-reviews': 'Weekly Store Review & Approval Cycles',
    reports: 'Appendix A & Appendix B Official Store Returns',
    items: 'Technical Item Master & Ammunition Specifications',
    warehouses: 'Ordnance Depots & Storage Magazine Facilities',
    documents: 'Document Attachments & Proof Certificates Hub',
    users: 'Role-Based User Administration & Depot Assignments',
    'audit-logs': 'Immutable Security Audit Logs & Transaction Ledger',
    settings: 'Technical Store Configuration & Terminology',
    profile: 'Officer Profile & Security Credentials'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 select-none z-20 text-slate-800 shadow-xs">
      {/* Title & Section */}
      <div className="flex items-center space-x-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          {tabTitles[currentTab] || 'Ammunition Management'}
        </h2>
      </div>

      {/* Right side tools */}
      <div className="flex items-center space-x-4">
        {/* Depot / Warehouse Filter */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs hover:border-slate-300 transition-colors">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-500 hidden md:inline font-medium">Depot:</span>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-medium text-xs"
          >
            <option value="ALL" className="bg-white text-slate-900">All Assigned Depots</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id} className="bg-white text-slate-900">
                {w.warehouseCode} - {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pending approvals badge */}
        {totalPending > 0 && (
          <div
            onClick={() => onSelectTab('inspections')}
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
            title={`${pendingInspections} inspections and ${pendingReviews} weekly reviews pending approval`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>{totalPending} Pending Approval</span>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <button
            onClick={() => onSelectTab('profile')}
            className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-emerald-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
              <User className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline font-mono font-medium">{currentUser?.name}</span>
          </button>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
