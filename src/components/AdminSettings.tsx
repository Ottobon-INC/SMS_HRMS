import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, RefreshCcw } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';
import { fetchPayrollConfig, upsertPayrollConfig, PayrollConfig } from '../lib/services/payroll-config-service';

interface AdminSettingsProps {
  language: Language;
}

export default function AdminSettings({ language }: AdminSettingsProps) {
  const t = translations[language];
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const data = await fetchPayrollConfig();
    setConfig(data);
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setIsSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        let label = '';
        switch (key) {
          case 'hra_fixed': label = 'HRA (Fixed)'; break;
          case 'medical_allowance': label = 'Medical Allowance'; break;
          case 'conveyance_allowance': label = 'Conveyance Allowance'; break;
          case 'pf_percent': label = 'PF % of Basic'; break;
          case 'professional_tax': label = 'Professional Tax (Fixed)'; break;
        }
        await upsertPayrollConfig(key, value as number, label);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save settings. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: keyof PayrollConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      [key]: Number(value)
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCcw className="w-8 h-8 animate-spin mb-4 text-teal-500" />
        <p>Loading settings...</p>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'సిస్టమ్ సెట్టింగ్‌లు' : 'System Settings'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'పేరోల్ స్ట్రక్చర్ మరియు ఇతర సెట్టింగ్‌లను కాన్ఫిగర్ చేయండి.' 
              : 'Configure payroll structure, allowances, and deductions.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              {language === 'te' ? 'పేరోల్ స్ట్రక్చర్ (Payroll Structure)' : 'Payroll Structure'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Allowances */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  HRA (Fixed Amount)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={config.hra_fixed || ''}
                    onChange={(e) => handleChange('hra_fixed', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Medical Allowance
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={config.medical_allowance || ''}
                    onChange={(e) => handleChange('medical_allowance', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Conveyance Allowance
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={config.conveyance_allowance || ''}
                    onChange={(e) => handleChange('conveyance_allowance', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  PF % (Percentage of Basic)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={config.pf_percent || ''}
                    onChange={(e) => handleChange('pf_percent', e.target.value)}
                    className="w-full pl-4 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                  <span className="absolute right-4 top-2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Professional Tax (Fixed)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    value={config.professional_tax || ''}
                    onChange={(e) => handleChange('professional_tax', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-teal-50 border border-teal-100 rounded-xl">
              <p className="text-xs text-teal-800 font-medium">
                <span className="font-bold">Info:</span> Changing these values will apply to all <b>future</b> payslips generated. Existing payslips will not be modified unless manually regenerated.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {saveSuccess && (
              <span className="text-emerald-600 text-sm font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4" />
                Settings Saved!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md shadow-teal-600/15 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70"
            >
              {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {language === 'te' ? 'సేవ్ చేయండి' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
