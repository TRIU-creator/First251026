import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppSidebar, NavigationTab } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { SetupAdminView } from './views/SetupAdminView';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StockView } from './views/StockView';
import { InspectionsView } from './views/InspectionsView';
import { FormsView } from './views/FormsView';
import { WeeklyReviewsView } from './views/WeeklyReviewsView';
import { AppendixReportsView } from './views/AppendixReportsView';
import { ItemsView } from './views/ItemsView';
import { WarehousesView } from './views/WarehousesView';
import { DocumentsView } from './views/DocumentsView';
import { UsersView } from './views/UsersView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import { ProfileView } from './views/ProfileView';
import { ReceiptsView } from './views/ReceiptsView';
import { IssuesView } from './views/IssuesView';
import { DRSView } from './views/DRSView';
import { NotFoundView } from './views/NotFoundView';
import { ForbiddenView } from './views/ForbiddenView';

function MainApp() {
  const {
    hasAdmin,
    isAuthenticated,
    isLoading,
    refreshHealth,
    refreshUser,
    logout
  } = useApp();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 font-semibold">
          Initializing Ammunition & Warehouse Compliance Management System...
        </p>
      </div>
    );
  }

  // 1. First-time Setup Screen if No Admin exists in database
  if (hasAdmin === false) {
    return <SetupAdminView onSetupSuccess={() => refreshHealth()} />;
  }

  // 2. Login Screen if not authenticated
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => refreshUser()} />;
  }

  // 3. Operational Command Console
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 select-none">
      {/* Sidebar Navigation */}
      <AppSidebar currentTab={currentTab} onSelectTab={(tab) => {
        setSelectedInspectionId(null);
        setCurrentTab(tab);
      }} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onLogout={logout}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onSelectInspection={(id) => {
                setSelectedInspectionId(id);
                setCurrentTab('inspections');
              }}
            />
          )}
          {currentTab === 'stock' && <StockView />}
          {currentTab === 'inspections' && (
            <InspectionsView initialSelectedId={selectedInspectionId} />
          )}
          {currentTab === 'forms' && <FormsView />}
          {currentTab === 'weekly-reviews' && <WeeklyReviewsView />}
          {currentTab === 'reports' && <AppendixReportsView />}
          {currentTab === 'items' && <ItemsView />}
          {currentTab === 'warehouses' && <WarehousesView />}
          {currentTab === 'documents' && <DocumentsView />}
          {currentTab === 'users' && <UsersView />}
          {currentTab === 'audit-logs' && <AuditLogsView />}
          {currentTab === 'settings' && <SettingsView />}
          {currentTab === 'profile' && <ProfileView />}
          {currentTab === 'receipts' && <ReceiptsView />}
          {currentTab === 'issues' && <IssuesView />}
          {currentTab === 'drs' && <DRSView />}
          {currentTab === '404' && <NotFoundView />}
          {currentTab === '403' && <ForbiddenView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
