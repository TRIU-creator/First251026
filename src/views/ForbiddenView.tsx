import React from 'react';
import { useApp } from '../context/AppContext';
import { NavigationTab } from '../components/layout/AppSidebar';
import { ShieldAlert, Home } from 'lucide-react';

export const ForbiddenView: React.FC = () => {
  const { onNavigate } = useApp() as any;

  return (
    <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">403 — Access Forbidden</h1>
        <p className="text-slate-600 mb-8">
          Your role does not have permission to access this resource. Please contact your system administrator if you believe this is an error.
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
