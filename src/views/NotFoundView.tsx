import React from 'react';
import { useApp } from '../context/AppContext';
import { NavigationTab } from '../components/layout/AppSidebar';
import { AlertTriangle, Home, ShieldAlert } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const { onNavigate } = useApp() as any;

  return (
    <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">404 — Page Not Found</h1>
        <p className="text-slate-600 mb-8">
          The requested page or resource could not be found in the Ammunition & Warehouse Compliance Management System (AWCMS).
        </p>
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          <Home className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};
