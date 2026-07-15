import React, { useState } from 'react';
import { DollarSign, Printer, Landmark, Sparkles, TrendingUp, HelpCircle, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { Language, Payslip, Allowance, Deduction } from '../types';
import { translations } from '../translations';
import SmsLogo from './SmsLogo';

interface PayrollModuleProps {
  language: Language;
  payslips: Payslip[];
  employeeName?: string;
  employeeId?: string;
  employeeDesignation?: string;
  employeeJoiningDate?: string;
  employeeExperience?: number;
  onUpdatePayslip?: (updatedSlip: Payslip) => void;
}

export default function PayrollModule({
  language,
  payslips,
  employeeName = 'Ravi Kumar',
  employeeId = 'EMP-2026-089',
  employeeDesignation = 'Software Engineer',
  employeeJoiningDate,
  employeeExperience,
  onUpdatePayslip,
}: PayrollModuleProps) {
  const t = translations[language];

  // Selected payslip state
  const [selectedSlipId, setSelectedSlipId] = useState(payslips[0]?.id || '');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [draftBasicPay, setDraftBasicPay] = useState<number>(0);
  const [draftAllowances, setDraftAllowances] = useState<Allowance[]>([]);
  const [draftDeductions, setDraftDeductions] = useState<Deduction[]>([]);
  const [draftAdvanceTaken, setDraftAdvanceTaken] = useState<boolean>(false);
  const [draftAdvanceAmount, setDraftAdvanceAmount] = useState<number>(0);

  const activeSlip = payslips.find(p => p.id === selectedSlipId) || payslips[0];

  if (!activeSlip) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500 shadow-sm border border-slate-100">
        {t.noData}
      </div>
    );
  }

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Math Calculations (Live/Draft vs Standard)
  const basicPayValue = isEditing ? draftBasicPay : activeSlip.basicPay;
  const allowancesList = isEditing ? draftAllowances : activeSlip.allowances;
  const deductionsList = isEditing ? draftDeductions : activeSlip.deductions;
  
  const advanceTaken = isEditing ? draftAdvanceTaken : activeSlip.advanceMoneyTaken;
  const advanceAmount = isEditing ? (draftAdvanceTaken ? draftAdvanceAmount : 0) : (activeSlip.advanceMoneyTaken ? activeSlip.advanceMoneyAmount || 0 : 0);

  const totalEarnings = basicPayValue + allowancesList.reduce((acc, a) => acc + a.amount, 0);
  const totalDeductions = deductionsList.reduce((acc, d) => acc + d.amount, 0) + advanceAmount;
  const netPay = totalEarnings - totalDeductions;

  // Advance Eligibility
  let isEligibleForAdvance = false;
  if (employeeExperience && employeeExperience >= 1) {
    isEligibleForAdvance = true;
  } else if (employeeJoiningDate) {
    const joinDate = new Date(employeeJoiningDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    isEligibleForAdvance = joinDate <= oneYearAgo;
  }

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Start Editing Draft
  const startEditing = () => {
    setDraftBasicPay(activeSlip.basicPay);
    setDraftAllowances([...activeSlip.allowances]);
    setDraftDeductions([...activeSlip.deductions]);
    setDraftAdvanceTaken(activeSlip.advanceMoneyTaken || false);
    setDraftAdvanceAmount(activeSlip.advanceMoneyAmount || 0);
    setIsEditing(true);
  };

  // Allowance handlers
  const handleAddAllowance = () => {
    setDraftAllowances([...draftAllowances, { nameKey: 'specialAllow', amount: 0 }]);
  };

  const handleUpdateAllowance = (index: number, field: keyof Allowance, value: any) => {
    setDraftAllowances(draftAllowances.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveAllowance = (index: number) => {
    setDraftAllowances(draftAllowances.filter((_, idx) => idx !== index));
  };

  // Deduction handlers
  const handleAddDeduction = () => {
    setDraftDeductions([...draftDeductions, { nameKey: 'professionalTax', amount: 0 }]);
  };

  const handleUpdateDeduction = (index: number, field: keyof Deduction, value: any) => {
    setDraftDeductions(draftDeductions.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveDeduction = (index: number) => {
    setDraftDeductions(draftDeductions.filter((_, idx) => idx !== index));
  };

  // Save changes
  const handleSaveChanges = () => {
    if (onUpdatePayslip) {
      onUpdatePayslip({
        ...activeSlip,
        basicPay: draftBasicPay,
        allowances: draftAllowances,
        deductions: draftDeductions,
        advanceMoneyTaken: draftAdvanceTaken,
        advanceMoneyAmount: draftAdvanceTaken ? draftAdvanceAmount : 0,
      });
    }
    setIsEditing(false);
  };

  return (
    <div id="payroll-module-container" className="space-y-6">
      
      {/* Top Controller: Selector and Print/Edit Buttons */}
      <div id="payroll-top-panel" className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
          <div>
            <h2 className="text-xl font-bold font-display text-slate-800">
              {t.payrollTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {onUpdatePayslip 
                ? (language === 'te' ? 'జీతాల వివరాలు సవరించండి మరియు పర్యవేక్షించండి' : 'Edit and inspect employee monthly payroll documents') 
                : t.payrollSelect}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Dropdown Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              {t.payrollSelect}:
            </label>
            <select
              id="payslip-month-select"
              value={selectedSlipId}
              disabled={isEditing}
              onChange={(e) => setSelectedSlipId(e.target.value)}
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50"
            >
              {payslips.map(slip => {
                const [yr, mn] = slip.month.split('-');
                const monthName = language === 'te' 
                  ? (mn === '07' ? 'జూలై' : mn === '06' ? 'జూన్' : mn === '05' ? 'మే' : 'ఏప్రిల్') 
                  : (mn === '07' ? 'July' : mn === '06' ? 'June' : mn === '05' ? 'May' : 'April');
                return (
                  <option key={slip.id} value={slip.id}>
                    {monthName} {yr}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Admin Edit Trigger */}
          {onUpdatePayslip && !isEditing && (
            <button
              id="edit-payslip-btn"
              onClick={startEditing}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-transparent"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'సవరించు' : 'Edit Payslip'}</span>
            </button>
          )}

          {/* Print Button */}
          {!isEditing && (
            <button
              id="print-payslip-btn"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
          )}
        </div>
      </div>

      {/* The Payslip Document or Edit Form */}
      <div 
        id="printable-payslip" 
        className="bg-white rounded-[32px] p-5 sm:p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden transition-all duration-300 print:border-0 print:shadow-none print:p-0"
      >
        {/* Subtle decorative background watermark (will be hidden in print) */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-50/20 rounded-full blur-3xl pointer-events-none no-print" />

        {/* Corporate Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-slate-100 pb-8">
          <div>
            <div className="flex items-center">
              <SmsLogo textSize="text-xl font-black" subtitle={false} />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 max-w-sm whitespace-pre-line leading-relaxed">
              #18-1-30/9, Opp. KGH OP Gate, Aditya Complex<br />
              Visakhapatnam - 530002, Andhra Pradesh<br />
              Email: info@smslabs.in | Web: www.smslabs.in | Phone: 9059331954
            </p>
          </div>

          <div className="text-left md:text-right space-y-1">
            <span className="inline-block bg-teal-50 text-teal-800 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide">
              {t.slipForMonth} {activeSlip.month}
            </span>
            <p className="text-xs text-slate-400">
              Slip Reference: {activeSlip.id}
            </p>
          </div>
        </div>

        {/* Employee details overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-slate-50 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">{t.employeeNameLabel}</span>
            <span className="text-slate-800 font-bold mt-1 block">{employeeName}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">{t.employeeIdLabel}</span>
            <span className="text-slate-800 font-mono font-bold mt-1 block">{employeeId}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">Designation</span>
            <span className="text-slate-800 font-bold mt-1 block">{employeeDesignation}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">{t.paymentModeLabel}</span>
            <span className="text-slate-800 font-bold mt-1 block">{t.paymentModeValue}</span>
          </div>
        </div>

        {/* Breakdown Panel: Dual columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
          
          {/* Earnings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-teal-700 border-l-3 border-teal-500 pl-2.5 uppercase tracking-wider flex items-center justify-between">
              <span>{t.earningsTitle}</span>
              {isEditing && (
                <button
                  onClick={handleAddAllowance}
                  className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1.5 py-1 px-2.5 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Allowance</span>
                </button>
              )}
            </h3>
            
            <div className="space-y-3">
              {/* Basic Salary edit or render */}
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-600 font-medium">{t.basicSalary}</span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                    <span className="text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={draftBasicPay}
                      onChange={(e) => setDraftBasicPay(Number(e.target.value))}
                      className="w-24 text-right bg-transparent text-xs font-bold font-mono focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(activeSlip.basicPay)}</span>
                )}
              </div>

              {/* Allowances list */}
              {allowancesList.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <select
                        value={item.nameKey}
                        onChange={(e) => handleUpdateAllowance(index, 'nameKey', e.target.value)}
                        className="text-xs font-medium border border-slate-200 bg-slate-50 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="hra">HRA</option>
                        <option value="medicalAllow">Medical Allowance</option>
                        <option value="conveyanceAllow">Conveyance Allowance</option>
                        <option value="specialAllow">Special Allowance</option>
                      </select>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleUpdateAllowance(index, 'amount', Number(e.target.value))}
                            className="w-20 text-right bg-transparent text-xs font-bold font-mono focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveAllowance(index)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-600 font-medium">{t[item.nameKey] || item.nameKey}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-slate-800 pt-1">
              <span>{t.totalEarnings}</span>
              <span className="font-mono text-base text-slate-900">{formatCurrency(totalEarnings)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-700 border-l-3 border-rose-500 pl-2.5 uppercase tracking-wider flex items-center justify-between">
              <span>{t.deductionsTitle}</span>
              {isEditing && (
                <button
                  onClick={handleAddDeduction}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 py-1 px-2.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Deduction</span>
                </button>
              )}
            </h3>
            
            <div className="space-y-3">
              {deductionsList.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <select
                        value={item.nameKey}
                        onChange={(e) => handleUpdateDeduction(index, 'nameKey', e.target.value)}
                        className="text-xs font-medium border border-slate-200 bg-slate-50 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="providentFund">PF (Provident Fund)</option>
                        <option value="professionalTax">Professional Tax</option>
                        <option value="incomeTax">Income Tax (TDS)</option>
                      </select>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                          <span className="text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleUpdateDeduction(index, 'amount', Number(e.target.value))}
                            className="w-20 text-right bg-transparent text-xs font-bold font-mono focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveDeduction(index)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-600 font-medium">{t[item.nameKey] || item.nameKey}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                    </>
                  )}
                </div>
              ))}
              
              {/* Advance Money Deduction Row */}
              {isEditing ? (
                <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 gap-2 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium text-xs">
                      <input 
                        type="checkbox" 
                        checked={draftAdvanceTaken}
                        onChange={(e) => setDraftAdvanceTaken(e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                      />
                      {t.advanceMoney || 'Advance Money Deducted'}
                    </label>
                    {!isEligibleForAdvance && (
                      <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-bold bg-slate-100 text-slate-400 rounded">
                        Not Eligible
                      </span>
                    )}
                  </div>
                  {draftAdvanceTaken && (
                    <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={draftAdvanceAmount}
                        onChange={(e) => setDraftAdvanceAmount(Number(e.target.value))}
                        className="w-20 text-right bg-transparent text-xs font-bold font-mono focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              ) : (
                activeSlip.advanceMoneyTaken && (
                  <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 gap-2 mt-4 pt-4 border-t text-rose-600">
                    <span className="font-medium">{t.advanceMoneyRecovery || 'Advance Money Recovery'}</span>
                    <span className="font-mono font-bold">{formatCurrency(activeSlip.advanceMoneyAmount || 0)}</span>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-slate-800 pt-5">
              <span>{t.totalDeductions}</span>
              <span className="font-mono text-base text-rose-700">{formatCurrency(totalDeductions)}</span>
            </div>
          </div>

        </div>

        {/* Net Take-Home Highlight Panel */}
        <div className="my-8 bg-slate-50/70 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                {t.netPay}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {t.netPayFormula}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-3xl md:text-4xl font-black font-mono text-emerald-700 tracking-tight block">
              {formatCurrency(netPay)}
            </span>
          </div>
        </div>

        {/* Transparent Mathematical Explanation Card */}
        <div className="bg-amber-50/30 border border-amber-100/50 rounded-2xl p-5 flex gap-3 text-slate-600 no-print">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {language === 'te' ? 'నిజాయితీ గల వివరణ (Transparent Calculation)' : 'Simple & Honest Math Breakdown'}
            </h4>
            <p className="text-xs leading-relaxed mt-1 text-slate-600">
              {t.netPayExplanation}
            </p>
          </div>
        </div>

        {/* Form Action Controls inside editor */}
        {isEditing && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            
            <button
              onClick={handleSaveChanges}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-teal-600/10 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}

        {/* Document Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-center text-[10px] text-slate-400 uppercase tracking-wider">
          Computer generated pay slip. No physical signature required. Confidential document issued by SMS Diagnostics.
        </div>

      </div>
    </div>
  );
}
