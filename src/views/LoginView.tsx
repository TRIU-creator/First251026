import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  Warehouse, 
  Crosshair, 
  FileCheck2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  FileCode2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

interface EnvRoleCred {
  role: string;
  title: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  description: string;
}

interface EnvCredentialsData {
  admin: EnvRoleCred;
  manager: EnvRoleCred;
  inspector: EnvRoleCred;
  viewer: EnvRoleCred;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envCreds, setEnvCreds] = useState<EnvCredentialsData | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<'admin' | 'manager' | 'inspector' | 'viewer'>('admin');
  const [showEnvInspector, setShowEnvInspector] = useState(false);

  // Fetch configured credentials directly from the .env backend endpoint
  useEffect(() => {
    let mounted = true;
    api.getEnvCredentials()
      .then((data) => {
        if (mounted && data) {
          setEnvCreds(data);
          // Set initial default to admin from .env
          setEmail(data.admin.email);
          setPassword(data.admin.password);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch .env credentials:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectRole = (key: 'admin' | 'manager' | 'inspector' | 'viewer', cred: EnvRoleCred, autoSubmit = false) => {
    setSelectedRoleKey(key);
    setEmail(cred.email);
    setPassword(cred.password);
    setError(null);

    if (autoSubmit) {
      executeLogin(cred.email, cred.password);
    }
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    if (!loginEmail.trim() || !loginPass) {
      setError('Please provide both official email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPass);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden text-slate-800">
      <div className="w-full max-w-4xl z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-3 shadow-xs">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase">
            Ammunition & Warehouse Compliance Management System (AWCMS)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider font-medium">
            ORDNANCE WAREHOUSE SURVEILLANCE &amp; FORM 263/270 VERIFICATION
          </p>

          {/* Active .env credentials badge */}
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-xs font-mono shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Credentials Fetched from <strong className="text-emerald-700">.env</strong> Environment File</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT / TOP: Quick .env Role Selector Cards */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                Select Role to Load Credentials from .env
              </span>
              <button
                type="button"
                onClick={() => setShowEnvInspector(!showEnvInspector)}
                className="text-xs text-emerald-700 hover:text-emerald-800 underline font-mono flex items-center gap-1 font-medium"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                {showEnvInspector ? 'Hide .env Details' : 'View .env Config'}
              </button>
            </div>

            {envCreds && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Master Admin */}
                <div
                  onClick={() => handleSelectRole('admin', envCreds.admin)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                    selectedRoleKey === 'admin'
                      ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Administrator</h4>
                        <span className="text-[10px] text-emerald-700 font-mono font-medium">ADMIN_EMAIL</span>
                      </div>
                    </div>
                    {selectedRoleKey === 'admin' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 mt-2 truncate">{envCreds.admin.name}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate">{envCreds.admin.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole('admin', envCreds.admin, true);
                    }}
                    className="mt-2.5 w-full py-1 text-[11px] font-mono font-medium rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Quick Login as Admin</span>
                  </button>
                </div>

                {/* 2. Warehouse Manager */}
                <div
                  onClick={() => handleSelectRole('manager', envCreds.manager)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                    selectedRoleKey === 'manager'
                      ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 border border-teal-200">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Depot Manager</h4>
                        <span className="text-[10px] text-teal-700 font-mono font-medium">MANAGER_EMAIL</span>
                      </div>
                    </div>
                    {selectedRoleKey === 'manager' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 mt-2 truncate">{envCreds.manager.name}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate">{envCreds.manager.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole('manager', envCreds.manager, true);
                    }}
                    className="mt-2.5 w-full py-1 text-[11px] font-mono font-medium rounded bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Quick Login as Manager</span>
                  </button>
                </div>

                {/* 3. Technical Inspector */}
                <div
                  onClick={() => handleSelectRole('inspector', envCreds.inspector)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                    selectedRoleKey === 'inspector'
                      ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                        <Crosshair className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">QA Inspector</h4>
                        <span className="text-[10px] text-amber-700 font-mono font-medium">INSPECTOR_EMAIL</span>
                      </div>
                    </div>
                    {selectedRoleKey === 'inspector' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 mt-2 truncate">{envCreds.inspector.name}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate">{envCreds.inspector.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole('inspector', envCreds.inspector, true);
                    }}
                    className="mt-2.5 w-full py-1 text-[11px] font-mono font-medium rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Quick Login as Inspector</span>
                  </button>
                </div>

                {/* 4. Staff / Viewer */}
                <div
                  onClick={() => handleSelectRole('viewer', envCreds.viewer)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                    selectedRoleKey === 'viewer'
                      ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Depot Staff / Viewer</h4>
                        <span className="text-[10px] text-indigo-700 font-mono font-medium">VIEWER_EMAIL</span>
                      </div>
                    </div>
                    {selectedRoleKey === 'viewer' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 mt-2 truncate">{envCreds.viewer.name}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate">{envCreds.viewer.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole('viewer', envCreds.viewer, true);
                    }}
                    className="mt-2.5 w-full py-1 text-[11px] font-mono font-medium rounded bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Quick Login as Staff</span>
                  </button>
                </div>
              </div>
            )}

            {/* .env Inspector Accordion */}
            {showEnvInspector && (
              <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4" />
                    Configured in .env file (backend loaded via dotenv)
                  </span>
                  <span className="text-[10px] text-slate-400">Root: /.env</span>
                </div>
                <div className="space-y-1.5 overflow-x-auto text-[11px]">
                  <div><span className="text-purple-700 font-semibold">ADMIN_EMAIL</span>=&quot;{envCreds?.admin.email}&quot;</div>
                  <div><span className="text-purple-700 font-semibold">ADMIN_PASSWORD</span>=&quot;{envCreds?.admin.password}&quot;</div>
                  <div><span className="text-teal-700 font-semibold">MANAGER_EMAIL</span>=&quot;{envCreds?.manager.email}&quot;</div>
                  <div><span className="text-teal-700 font-semibold">MANAGER_PASSWORD</span>=&quot;{envCreds?.manager.password}&quot;</div>
                  <div><span className="text-amber-700 font-semibold">INSPECTOR_EMAIL</span>=&quot;{envCreds?.inspector.email}&quot;</div>
                  <div><span className="text-amber-700 font-semibold">INSPECTOR_PASSWORD</span>=&quot;{envCreds?.inspector.password}&quot;</div>
                  <div><span className="text-indigo-700 font-semibold">VIEWER_EMAIL</span>=&quot;{envCreds?.viewer.email}&quot;</div>
                  <div><span className="text-indigo-700 font-semibold">VIEWER_PASSWORD</span>=&quot;{envCreds?.viewer.password}&quot;</div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT / BOTTOM: Login Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 text-xs text-slate-500 font-mono">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>AUTHENTICATION GATEWAY</span>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-3 rounded-lg mb-4 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-mono">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@defence.gov.in"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 font-mono shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
                    Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 font-mono shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 text-sm cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate &amp; Enter System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono text-center">
              Selected: <span className="text-emerald-700 font-semibold">{envCreds ? envCreds[selectedRoleKey]?.title : 'Admin'}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400 font-mono">
          DEFENCE TECHNICAL CORPS • SECURE ENCRYPTED SESSION • AUDIT LOGGING ACTIVE
        </div>
      </div>
    </div>
  );
};
