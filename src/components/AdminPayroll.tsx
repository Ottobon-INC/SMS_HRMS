import React, { useState } from 'react';
import { Landmark, Play, CheckCircle2, User, HelpCircle, DollarSign, Plus } from 'lucide-react';
import { Language, Employee, Payslip } from '../types';
import { translations } from '../translations';
import PayrollModule from './PayrollModule';

interface AdminPayrollProps {
  language: 'en' | 'te';
  employees: Employee[];
  onRunBulkPayroll: (month: string) => void;
  onGenerateSinglePayslip: (employeeId: string, month: string, basicPay: number) => void;
  onUpdatePayslip: (employeeId: string, updatedSlip: Payslip) => void;
}

export default function AdminPayroll({
  language,
  employees,
  onRunBulkPayroll,
  onGenerateSinglePayslip,
  onUpdatePayslip,
}: AdminPayrollProps) {
  const t = translations[language];

  // Selected state
  const [payrollMonth, setPayrollMonth] = useState('2026-07');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  
  // Notice Banner state
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const eligibleEmployees = employees.filter(e => e.role !== 'admin');

  // Trigger bulk payroll
  const handleBulkPayroll = () => {
    onRunBulkPayroll(payrollMonth);
    setShowNotification(
      language === 'te' 
        ? `${payrollMonth} నెలకు సిబ్బంది అందరికీ జీతాలు విజయవంతంగా రన్ చేయబడ్డాయి!` 
        : `Successfully processed monthly payroll run for all employees for ${payrollMonth}!`
    );
    setTimeout(() => setShowNotification(null), 6000);
  };

  // Find inspected employee
  const activeEmployee = employees.find(e => e.id === selectedEmpId);

  const handleUpdatePayslip = async (updatedSlip: Payslip) => {
    if (!activeEmployee) return;
    try {
      await onUpdatePayslip(activeEmployee.id, updatedSlip);
      setShowNotification(
        language === 'te' 
          ? `జీతం రశీదు విజయవంతంగా సవరించబడింది!` 
          : `Payslip updated successfully!`
      );
    } catch (error) {
      console.error(error);
      setShowNotification("Error saving payslip. Check console for details.");
    }
    setTimeout(() => setShowNotification(null), 3000);
  };

  const localizedText = {
    en: {
      title: "Company Payroll Center",
      subtitle: "Execute batch payroll cycles, issue monthly payslips, and inspect individual records.",
      bulkHeader: "Monthly Bulk Payroll Run",
      bulkDesc: "Generates official monthly payslips for all onboarded employees simultaneously based on basic salary, standard 40% HRA, professional medical allowances, PF, and TDS taxes on file.",
      btnRun: "Run Bulk Payroll Engine",
      inspectHeader: "Inspect Employee Payslips",
      selectEmpPlace: "Choose an employee to view salary history...",
      emptySlips: "No payslip documents have been generated for this employee yet. You can run bulk payroll or generate one manually below.",
      btnGenerateSingle: "Generate Single Payslip",
      bulkBanner: "Run Completed",
    },
    te: {
      title: "కంపెనీ జీతాల నిర్వహణ",
      subtitle: "నెలవారీ జీతాలను రన్ చేయండి మరియు ఉద్యోగుల జీతం రశీదులను పరిశీలించండి.",
      bulkHeader: "నెలవారీ బల్క్ జీతాల రన్",
      bulkDesc: "ప్రస్తుత నెలలో కంపెనీ ఉద్యోగులందరికీ వారి ప్రాథమిక జీతం, ఇంటి అద్దె భత్యం, ప్రావిడెంట్ ఫండ్ కటింగులతో కూడిన సాలరీ స్లిప్‌లను ఒకే క్లిక్‌తో సృష్టించండి.",
      btnRun: "బల్క్ జీతాలు రన్ చేయండి",
      inspectHeader: "ఉద్యోగుల జీతం రశీదుల పరిశీలన",
      selectEmpPlace: "ఉద్యోగిని ఎంచుకోండి...",
      emptySlips: "ఈ ఉద్యోగికి ఎలాంటి సాలరీ స్లిప్స్ సృష్టించబడలేదు. పైన జీతాలు రన్ చేయడం ద్వారా లేదా క్రింద మాన్యువల్‌గా క్రియేట్ చేయవచ్చు.",
      btnGenerateSingle: "సింగిల్ సాలరీ స్లిప్ సృష్టించండి",
      bulkBanner: "రన్ పూర్తయింది",
    }
  }[language];

  return (
    <div id="admin-payroll-root" className="space-y-6 animate-fadeIn">
      
      {/* 1. Header */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-800">
          {localizedText.title}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {localizedText.subtitle}
        </p>
      </div>

      {/* Notification Banner */}
      {showNotification && (
        <div id="payroll-toast" className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs font-bold leading-normal">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p>{showNotification}</p>
        </div>
      )}

      {/* 2. Bulk Payroll Run Control Card */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
          <h3 className="text-base font-bold text-slate-800">{localizedText.bulkHeader}</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          {localizedText.bulkDesc}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.monthSelector}:</span>
            <select
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/10 cursor-pointer"
            >
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
            </select>
          </div>

          <button
            onClick={handleBulkPayroll}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-wider cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>{localizedText.btnRun}</span>
          </button>
        </div>
      </div>

      {/* 3. Individual Employee Payslip Inspector Card */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
          <span className="w-1.5 h-1.5 bg-purple-600 rounded-full shrink-0" />
          <h3 className="text-base font-bold text-slate-800">{localizedText.inspectHeader}</h3>
        </div>

        {/* Dropdown Employee Selector */}
        <div className="space-y-1 max-w-sm">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'te' ? 'ఉద్యోగిని ఎంచుకోండి' : 'Select Employee'}
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/10 cursor-pointer"
          >
            <option value="">{localizedText.selectEmpPlace}</option>
            {eligibleEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.id}) — Basic: ₹{emp.basicSalary}
              </option>
            ))}
          </select>
        </div>

        {/* Render Selected Employee Slips */}
        {activeEmployee ? (
          <div className="pt-4 border-t border-slate-100 space-y-6">
            {activeEmployee.payslips.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 italic">
                  {localizedText.emptySlips}
                </p>
                <button
                  onClick={() => {
                    onGenerateSinglePayslip(activeEmployee.id, payrollMonth, activeEmployee.basicSalary);
                    setShowNotification(language === 'te' ? 'సాలరీ స్లిప్ సృష్టించబడింది!' : 'Successfully generated individual payslip!');
                    setTimeout(() => setShowNotification(null), 3000);
                  }}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{localizedText.btnGenerateSingle}</span>
                </button>
              </div>
            ) : (
              <div className="p-1 bg-slate-50/50 rounded-2xl border border-slate-100">
                <PayrollModule
                  language={language}
                  payslips={activeEmployee.payslips}
                  employeeName={activeEmployee.name}
                  employeeId={activeEmployee.id}
                  employeeDesignation={activeEmployee.designation}
                  employeeJoiningDate={activeEmployee.joiningDate}
                  employeeExperience={activeEmployee.experience}
                  onUpdatePayslip={handleUpdatePayslip}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs italic">
            {language === 'te' ? 'ఉద్యోగి వివరాలు చూడటానికి ఒకరిని ఎంచుకోండి.' : 'Select an employee above to inspect their payslip history.'}
          </div>
        )}
      </div>

    </div>
  );
}
