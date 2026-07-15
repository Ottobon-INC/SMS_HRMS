import React, { useState } from 'react';
import { DollarSign, Printer, Landmark, Sparkles, TrendingUp, HelpCircle, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { Language, Payslip, Allowance, Deduction } from '../types';
import { translations } from '../translations';
import SmsLogo from './SmsLogo';
import { numberToWords } from '../lib/utils';

interface PayrollModuleProps {
  language: Language;
  payslips: Payslip[];
  employeeName?: string;
  employeeId?: string;
  employeeEmail?: string;
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
  employeeEmail = 'employee@example.com',
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
            <button id="print-payslip-btn" onClick={handlePrint} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Printer className="w-4 h-4" /> {t.print}
            </button>
          )}
        </div>
      </div>

      <div 
        id="printable-payslip" 
        className="bg-white p-5 sm:p-8 md:p-12 shadow-sm border border-slate-200 relative overflow-hidden transition-all duration-300 print:border-0 print:shadow-none print:p-0"
      >
        {!isEditing ? (
          <div className="font-sans text-sm text-black">
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div className="flex gap-6 items-center">
                <div className="shrink-0 scale-125 origin-left pl-2">
                  <SmsLogo textSize="text-3xl font-black" subtitle={false} />
                </div>
                <div className="pl-6 border-l-2 border-slate-200">
                  <h1 className="text-2xl font-bold uppercase tracking-wider mb-2 text-teal-800">SMS DIAGNOSTICS</h1>
                  <p className="text-xs max-w-lg mb-1 text-slate-700">#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Visakhapatnam - 530002, Andhra Pradesh</p>
                  <p className="text-xs text-slate-700">info@smslabs.in &nbsp;&nbsp;|&nbsp;&nbsp; www.smslabs.in &nbsp;&nbsp;|&nbsp;&nbsp; Phone: 9059331954</p>
                </div>
              </div>
            </div>

            <div className="text-center font-bold text-lg mb-6">
              Pay slip for the month of {new Date(activeSlip.month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>

            <div className="grid grid-cols-2 border border-black mb-6">
              <div className="border-r border-black flex flex-col">
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black">Employee Code</div><div className="w-1/2 p-2">: {employeeId}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black">Base Location</div><div className="w-1/2 p-2">: N/A</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black">Date of Joining</div><div className="w-1/2 p-2">: {employeeJoiningDate ? new Date(employeeJoiningDate).toLocaleDateString('en-GB') : 'N/A'}</div></div>
              </div>
              <div className="flex flex-col">
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Company:</div><div className="w-2/3 p-2">SMS DIAGNOSTICS</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Name:</div><div className="w-2/3 p-2 font-bold">{employeeName}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Designation:</div><div className="w-2/3 p-2">{employeeDesignation}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Payslip #:</div><div className="w-2/3 p-2 font-mono text-xs">{activeSlip.id}</div></div>
              </div>
            </div>

            <div className="border border-black mb-6">
              <div className="grid grid-cols-2 bg-slate-100 font-bold border-b border-black">
                <div className="p-2 border-r border-black">Earnings</div>
                <div className="p-2">Deductions</div>
              </div>
              <div className="grid grid-cols-4 font-bold border-b border-black">
                <div className="p-2 border-r border-black">Particulars</div><div className="p-2 border-r border-black text-right">Rate</div>
                <div className="p-2 border-r border-black">Particulars</div><div className="p-2 text-right">Amount</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="border-r border-black flex flex-col">
                  <div className="flex justify-between p-2"><span>Basic Salary</span><span>{activeSlip.basicPay.toLocaleString('en-IN')}</span></div>
                  {allowancesList.map((a, i) => <div key={i} className="flex justify-between p-2"><span>{t[a.nameKey] || a.nameKey}</span><span>{a.amount.toLocaleString('en-IN')}</span></div>)}
                </div>
                <div className="flex flex-col">
                  {deductionsList.map((d, i) => <div key={i} className="flex justify-between p-2"><span>{t[d.nameKey] || d.nameKey}</span><span>{d.amount.toLocaleString('en-IN')}</span></div>)}
                  {activeSlip.advanceMoneyTaken && <div className="flex justify-between p-2 text-rose-700"><span>Advance</span><span>{activeSlip.advanceMoneyAmount?.toLocaleString('en-IN')}</span></div>}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-black font-bold">
                <div className="flex justify-between p-2 border-r border-black"><span>Total Earnings</span><span>{totalEarnings.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between p-2"><span>Total Deductions</span><span>{totalDeductions.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="border-t border-black font-bold flex justify-between p-2 bg-slate-100">
                <span>Net Salary:</span><span>Rs. {netPay.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-sm mb-8 pb-4 border-b border-black">
              <span className="font-bold">In words:</span> {numberToWords(netPay)}
            </div>

            <div className="flex justify-between items-end mt-12 pt-8">
              <div className="text-xs italic text-slate-500">
                This is a computer-generated payslip and does not require a signature.<br/>
                Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              
              <div className="text-center">
                <div className="border-b border-slate-800 w-48 mb-2"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Authorised Signatory</span>
              </div>
            </div>
          </div>
        ) : (
          /* ----- EDIT MODE VIEW ----- */
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-teal-700 border-l-3 border-teal-500 pl-2.5 uppercase">Earnings</h3>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span>Basic</span>
                  <input type="number" value={draftBasicPay} onChange={(e) => setDraftBasicPay(Number(e.target.value))} className="w-24 text-right border rounded p-1"/>
                </div>
                {allowancesList.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-2">
                    <select value={item.nameKey} onChange={(e) => handleUpdateAllowance(index, 'nameKey', e.target.value)} className="border p-1 text-xs">
                      <option value="hra">HRA</option><option value="medicalAllow">Medical</option><option value="specialAllow">Special</option>
                    </select>
                    <input type="number" value={item.amount} onChange={(e) => handleUpdateAllowance(index, 'amount', Number(e.target.value))} className="w-20 text-right border rounded p-1"/>
                    <button onClick={() => handleRemoveAllowance(index)}><Trash2 className="w-4 h-4 text-rose-500"/></button>
                  </div>
                ))}
                <button onClick={handleAddAllowance} className="text-xs text-teal-600 font-bold">+ Add Allowance</button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-rose-700 border-l-3 border-rose-500 pl-2.5 uppercase">Deductions</h3>
                {deductionsList.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-2">
                    <select value={item.nameKey} onChange={(e) => handleUpdateDeduction(index, 'nameKey', e.target.value)} className="border p-1 text-xs">
                      <option value="providentFund">PF</option><option value="professionalTax">PT</option>
                    </select>
                    <input type="number" value={item.amount} onChange={(e) => handleUpdateDeduction(index, 'amount', Number(e.target.value))} className="w-20 text-right border rounded p-1"/>
                    <button onClick={() => handleRemoveDeduction(index)}><Trash2 className="w-4 h-4 text-rose-500"/></button>
                  </div>
                ))}
                <button onClick={handleAddDeduction} className="text-xs text-rose-600 font-bold">+ Add Deduction</button>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-xs">Cancel</button>
              <button onClick={handleSaveChanges} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
