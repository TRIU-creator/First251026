import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  CalendarCheck2,
  FileText,
  FileUp,
  Users,
  Shield,
  Activity,
  Settings,
  UserCheck,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type NavigationTab =
  | 'dashboard'
  | 'stock'
  | 'inspections'
  | 'forms'
  | 'weekly-reviews'
  | 'reports'
  | 'items'
  | 'warehouses'
  | 'documents'
  | 'users'
  | 'audit-logs'
  | 'settings'
  | 'profile';

interface AppSidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser, isAdmin, isManager, isInspector, isViewer } = useApp();

  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Operations Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'stock' as NavigationTab,
      label: 'Stock & Storage Ledger',
      icon: Layers,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'inspections' as NavigationTab,
      label: 'Ammunition Inspections',
      icon: ClipboardCheck,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'forms' as NavigationTab,
      label: 'Tech Forms (263 / 270)',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'weekly-reviews' as NavigationTab,
      label: 'Weekly Reviews',
      icon: CalendarCheck2,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Appendix A & B Reports',
      icon: FileText,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'items' as NavigationTab,
      label: 'Item Master (Ammunition)',
      icon: Boxes,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'warehouses' as NavigationTab,
      label: 'Warehouses & Depots',
      icon: Building2,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER']
    },
    {
      id: 'documents' as NavigationTab,
      label: 'Document Hub & PDFs',
      icon: FileUp,
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICAL_INSPECTOR', 'VIEWER']
    },
    {
      id: 'users' as NavigationTab,
      label: 'User Management',
      icon: Users,
      roles: ['ADMIN']
    },
    {
      id: 'audit-logs' as NavigationTab,
      label: 'Security Audit Logs',
      icon: Activity,
      roles: ['ADMIN']
    },
    {
      id: 'settings' as NavigationTab,
      label: 'System Configuration',
      icon: Settings,
      roles: ['ADMIN']
    }
  ];

  const userRole = currentUser?.role || 'VIEWER';
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col shrink-0 h-screen border-r border-slate-200 select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
          <Shield className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold text-slate-900 tracking-wide truncate uppercase">ATSI-WMS</h2>
          <p className="text-[10px] text-slate-500 font-mono tracking-tight truncate">
            AMMUNITION & TECH STORES
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User profile bottom bar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <button
          onClick={() => onSelectTab('profile')}
          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
            currentTab === 'profile' ? 'bg-white shadow-xs text-slate-900 border border-slate-200' : 'hover:bg-white text-slate-700'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0 text-xs font-bold">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'OP'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser?.name || 'Officer'}</p>
            <span className="inline-block text-[10px] text-emerald-700 font-mono font-medium uppercase">
              {currentUser?.role?.replace('_', ' ') || 'VIEWER'}
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
};
