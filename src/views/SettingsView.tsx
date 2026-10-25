import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { Setting } from '../types';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [settingsList, setSettingsList] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSettings();
      setSettingsList(res.settings);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettingsList((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await api.saveSettings(settingsList.map((s) => ({ key: s.key, value: s.value })));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Saving settings failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Settings className="w-5 h-5" />
            </div>
            System Configuration & Technical Terminology
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Operating formation parameters, Indian Defence nomenclature, and weekly review cycle rules.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration parameters committed successfully.</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div className="space-y-4">
          {settingsList.map((setting) => (
            <div key={setting.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                {setting.key.replace(/_/g, ' ')}
              </label>
              <p className="text-[11px] text-slate-500 mb-2">{setting.description}</p>
              <input
                type="text"
                value={setting.value}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Committing...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
