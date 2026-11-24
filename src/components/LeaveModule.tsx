import React, { useState } from 'react';
import { CalendarDays, Send, ShieldAlert, CheckCircle, XCircle, Clock, ToggleLeft, ToggleRight, UserCheck, Trash2, AlertTriangle, Coffee } from 'lucide-react';
import { Language, LeaveType, LeaveRequest, LeaveBalance, MonthlyLeaveQuota } from '../types';
import { translations } from '../translations';

interface LeaveModuleProps {
  language: Language;
  leaveBalance: LeaveBalance;
  monthlyQuota: MonthlyLeaveQuota;
  leaveRequests: LeaveRequest[];
  gender?: 'male' | 'female' | 'other';
  onApplyLeave: (type: LeaveType, fromDate: string, toDate: string, reason: string) => Promise<void>;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onDeleteLeave?: (id: string) => Promise<void> | void;
  onUpdateBalances?: (type: LeaveType, allotted: number, used: number) => void;
}

export default function LeaveModule({
  language,
  leaveBalance,
  monthlyQuota,
  leaveRequests,
  gender,
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onDeleteLeave,
  onUpdateBalances
}: LeaveModuleProps) {
  const t = translations[language];

  // Balances & Quota calculations
  const weekOffAllowed = leaveBalance?.weekoff?.allowed ?? (gender === 'female' ? 3 : 2);
  const weekOffTaken = leaveBalance?.weekoff?.taken ?? 0;
  const weekOffRemaining = Math.max(0, weekOffAllowed - weekOffTaken);

  const casualRemaining = Math.max(0, leaveBalance.casual.allowed - leaveBalance.casual.taken);
  const sickRemaining = Math.max(0, leaveBalance.sick.allowed - leaveBalance.sick.taken);
  const maternityRemaining = Math.max(0, (leaveBalance.maternity?.allowed || 90) - (leaveBalance.maternity?.taken || 0));
  const maternityUnpaidRemaining = Math.max(0, (leaveBalance.maternity_unpaid?.allowed || 90) - (leaveBalance.maternity_unpaid?.taken || 0));
  const paternityRemaining = Math.max(0, (leaveBalance.paternity?.allowed || 15) - (leaveBalance.paternity?.taken || 0));
  const isPaidExhausted = casualRemaining === 0 && sickRemaining === 0;

  // Dynamic available leave options: EXHAUSTED LEAVES (0 balance) ARE HIDDEN
  const availableLeaveOptions: { type: LeaveType; label: string }[] = [];
  if (casualRemaining > 0) {
    availableLeaveOptions.push({
      type: 'casual',
      label: language === 'te'
        ? `క్యాజువల్ లీవ్ (Casual Leave - 1/నెల, పెయిడ్) [${casualRemaining} మిగిలి ఉన్నాయి]`
        : `Casual Leave (1/month, Paid) [${casualRemaining} left]`
    });
  }
  if (sickRemaining > 0) {
    availableLeaveOptions.push({
      type: 'sick',
      label: language === 'te'
        ? `సిక్ లీవ్ (Sick Leave - 1/నెల, పెయిడ్) [${sickRemaining} మిగిలి ఉన్నాయి]`
        : `Sick Leave (1/month, Paid) [${sickRemaining} left]`
    });
  }
  if (weekOffRemaining > 0) {
    availableLeaveOptions.push({
      type: 'weekoff',
      label: language === 'te'
        ? `వారం సెలవు (Week Off - పెయిడ్, జీతం కట్ అవ్వదు) [${weekOffRemaining} మిగిలి ఉన్నాయి]`
        : `Week Off (WO - Paid, No Pay Cut) [${weekOffRemaining} left]`
    });
  }
  if (gender === 'female') {
    if (maternityRemaining > 0) {
      availableLeaveOptions.push({
        type: 'maternity',
        label: language === 'te'
          ? `ప్రసూతి సెలవు (వేతనంతో కూడినది - 90 రోజులు) [${maternityRemaining} మిగిలి ఉన్నాయి]`
          : `Maternity Leave (With Pay - 90 Days) [${maternityRemaining} left]`
      });
    }
    if (maternityUnpaidRemaining > 0) {
      availableLeaveOptions.push({
        type: 'maternity_unpaid',
        label: language === 'te'
          ? `ప్రసూతి సెలవు (వేతనం లేకుండా / LOP - 90 రోజులు) [${maternityUnpaidRemaining} మిగిలి ఉన్నాయి]`
          : `Maternity Leave (Without Pay / LOP - 90 Days) [${maternityUnpaidRemaining} left]`
      });
    }
  }
  if (gender !== 'female' && paternityRemaining > 0) {
    availableLeaveOptions.push({
      type: 'paternity',
      label: language === 'te'
        ? `పితృత్వ సెలవు (Paternity Leave) [${paternityRemaining} మిగిలి ఉన్నాయి]`
        : `Paternity Leave [${paternityRemaining} left]`
    });
  }
  // Loss of Pay (LOP) is ALWAYS available
  availableLeaveOptions.push({
    type: 'lop',
    label: language === 'te'
      ? 'లాస్ ఆఫ్ పే (Loss of Pay - LOP) (1 రోజు వేతనం తగ్గింపు / 1 Day Salary Deduction)'
      : 'Loss of Pay (LOP) (Unpaid - 1 Day Salary Deduction)'
  });

  // Local Form state - defaults to first valid option (or LOP if all paid are done)
  const [leaveType, setLeaveType] = useState<LeaveType>(availableLeaveOptions[0]?.type || 'lop');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Automatically keep leaveType aligned with available options
  React.useEffect(() => {
    const isCurrentValid = availableLeaveOptions.some(opt => opt.type === leaveType);
    if (!isCurrentValid) {
      setLeaveType(availableLeaveOptions[0]?.type || 'lop');
    }
  }, [casualRemaining, sickRemaining, weekOffRemaining, maternityRemaining, maternityUnpaidRemaining, leaveType]);

  // Manager Mode state
  const [managerMode, setManagerMode] = useState(false);

  // Form submission handler
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageType, setManageType] = useState<LeaveType>('casual');
  const [manageAllotted, setManageAllotted] = useState(0);
  const [manageUsed, setManageUsed] = useState(0);

  const openManageModal = (type: LeaveType) => {
    setManageType(type);
    if (type === 'monthly') {
      setManageAllotted(monthlyQuota.allotted);
      setManageUsed(monthlyQuota.used);
    } else {
      setManageAllotted((leaveBalance as any)[type]?.allowed || 0);
      setManageUsed((leaveBalance as any)[type]?.taken || 0);
    }
    setShowManageModal(true);
  };

  const handleSaveManage = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateBalances) {
      onUpdateBalances(manageType, manageAllotted, manageUsed);
    }
    setShowManageModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fromDate || !toDate) {
      setErrorMsg(language === 'te' ? 'దయచేసి తేదీలను ఎంచుకోండి.' : 'Please select both start and end dates.');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setErrorMsg(language === 'te' ? 'చివరి తేదీ, ప్రారంభ తేదీ కంటే ముందు ఉండకూడదు.' : 'To Date cannot be earlier than From Date.');
      return;
    }

    // 1. Anti-Spam / Overlap Check: Prevent duplicate leave on the same date(s)
    const reqFromTime = new Date(fromDate).getTime();
    const reqToTime = new Date(toDate).getTime();

    const overlapping = (leaveRequests || []).find(r => {
      if (r.status === 'rejected') return false; // Rejected leaves don't block
      const exFrom = new Date(r.fromDate).getTime();
      const exTo = new Date(r.toDate).getTime();
      return reqFromTime <= exTo && reqToTime >= exFrom;
    });

    if (overlapping) {
      setErrorMsg(
        language === 'te'
          ? `మీరు ఇప్పటికే ఈ తేదీన (${overlapping.fromDate} నుండి ${overlapping.toDate}) సెలవు దరఖాస్తు చేసుకున్నారు (${overlapping.status.toUpperCase()}). మీరు మళ్లీ దరఖాస్తు చేయాలనుకుంటే, క్రింది హిస్టరీ నుండి మీ పెండింగ్ అభ్యర్థనను రద్దు/డిలీట్ చేయండి.`
          : `You already have an existing leave application (${overlapping.status.toUpperCase()}) for ${overlapping.fromDate} to ${overlapping.toDate}. To re-apply, please cancel/delete your pending request in Leave History below first.`
      );
      return;
    }

    // Date bounds: allow today, future dates, or retroactive application from yesterday (within 24 hours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const selectedFrom = new Date(fromDate);
    selectedFrom.setHours(0, 0, 0, 0);

    if (selectedFrom < yesterday) {
      setErrorMsg(
        language === 'te'
          ? 'గత తేదీలకు సెలవు దరఖాస్తు చేయలేరు (గరిష్టంగా నిన్నటి తేదీ నుండి మాత్రమే అనుమతించబడుతుంది).'
          : 'You cannot apply for past dates beyond yesterday (retroactive applications allowed within 24 hours).'
      );
      return;
    }

    const diffTime = Math.abs(new Date(toDate).getTime() - new Date(fromDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Consecutive duration validations
    if (leaveType === 'weekoff') {
      if (diffDays > 2) {
        setErrorMsg(
          language === 'te'
            ? 'వారం సెలవు ఒకేసారి గరిష్టంగా 2 రోజులు మాత్రమే దరఖాస్తు చేసుకోగలరు.'
            : 'Week Off cannot exceed 2 consecutive days per application.'
        );
        return;
      }
      if (diffDays > weekOffRemaining) {
        setErrorMsg(
          language === 'te'
            ? `వారం సెలవుల కోటా సరిపోదు! ఈ నెలకు మిగిలి ఉన్నవి: ${weekOffRemaining} రోజులు (${gender === 'female' ? 'మహిళలకు 3' : 'పురుషులకు 2'}).`
            : `Insufficient Week Off balance! You requested ${diffDays} day(s) but only have ${weekOffRemaining} left this month (${gender === 'female' ? '3/mo for women' : '2/mo for men'}).`
        );
        return;
      }
    } else if (leaveType === 'casual' || leaveType === 'sick' || leaveType === 'lop' || leaveType === 'monthly') {
      if (diffDays > 3) {
        setErrorMsg(
          language === 'te'
            ? 'నిరంతర సెలవు 3 రోజులకు మించకూడదు. 4వ రోజు నుండి హాజరు రాలేదు (Absent) గా నమోదు చేయబడుతుంది.'
            : 'Continuous leave cannot exceed 3 days. Any absence beyond 3 consecutive days will be marked as Absent.'
        );
        return;
      }
    } else if (leaveType === 'paternity') {
      if (diffDays > 7) {
        setErrorMsg(
          language === 'te'
            ? 'పితృత్వ సెలవు ఒకేసారి గరిష్టంగా వరుసగా 7 రోజులు మాత్రమే తీసుకోవచ్చు. 7 రోజుల తర్వాత మిగిలిన సెలవుల కోసం మళ్లీ దరఖాస్తు చేసుకోవాలి.'
            : 'Paternity leave can only be taken up to 7 consecutive days per application. You must re-apply for remaining days after 7 days.'
        );
        return;
      }
    } else if (leaveType === 'maternity' || leaveType === 'maternity_unpaid') {
      if (diffDays > 90) {
        setErrorMsg(language === 'te' ? 'ప్రసూతి సెలవు 90 రోజులకు మించకూడదు.' : 'Maternity leave cannot exceed 90 days.');
        return;
      }
    }

    // Quota and balance checks (Auto-convert to LOP if paid leave balance is 0)
    let finalType = leaveType;
    if (leaveType === 'casual' || leaveType === 'sick') {
      const balance = leaveBalance[leaveType];
      const remaining = balance ? Math.max(0, balance.allowed - balance.taken) : 0;
      if (remaining === 0) {
        // Automatic conversion to LOP when paid leaves are exhausted
        finalType = 'lop';
      } else if (diffDays > remaining) {
        setErrorMsg(
          language === 'te'
            ? `మీకు ఈ నెలలో ${remaining} రోజు(లు) మాత్రమే మిగిలి ఉన్నాయి. మిగిలిన రోజుల కోసం Loss of Pay (LOP) ను ఎంచుకోండి.`
            : `Insufficient balance! You requested ${diffDays} day(s) but only have ${remaining} day(s) remaining this month. Please select Loss of Pay (LOP).`
        );
        return;
      }
    } else if (leaveType === 'paternity') {
      const balance = leaveBalance.paternity;
      const remaining = balance ? Math.max(0, balance.allowed - balance.taken) : 0;
      if (diffDays > remaining) {
        setErrorMsg(
          language === 'te'
            ? `పితృత్వ సెలవుల కోటా సరిపోదు! మిగిలి ఉన్నవి: ${remaining} రోజులు.`
            : `Insufficient paternity balance! Remaining: ${remaining} days.`
        );
        return;
      }
    } else if (leaveType === 'maternity') {
      if (diffDays > maternityRemaining) {
        setErrorMsg(
          language === 'te'
            ? `ప్రసూతి సెలవుల (With Pay) కోటా సరిపోదు! మిగిలి ఉన్నవి: ${maternityRemaining} రోజులు.`
            : `Insufficient Maternity Leave (With Pay) balance! Remaining: ${maternityRemaining} days.`
        );
        return;
      }
    } else if (leaveType === 'maternity_unpaid') {
      if (diffDays > maternityUnpaidRemaining) {
        setErrorMsg(
          language === 'te'
            ? `ప్రసూతి సెలవుల (Without Pay / LOP) కోటా సరిపోదు! మిగిలి ఉన్నవి: ${maternityUnpaidRemaining} రోజులు.`
            : `Insufficient Maternity Leave (Without Pay / LOP) balance! Remaining: ${maternityUnpaidRemaining} days.`
        );
        return;
      }
    }

    try {
      await onApplyLeave(finalType, fromDate, toDate, reason);
      const isAutoLop = finalType === 'lop' && (leaveType === 'casual' || leaveType === 'sick');
      setSuccessMsg(
        isAutoLop
          ? (language === 'te'
            ? 'పెయిడ్ సెలవుల కోటా పూర్తి కావడంతో ఈ సెలవు "Loss of Pay (LOP)" గా విజయవంతంగా సమర్పించబడింది.'
            : 'Submitted successfully as Loss of Pay (LOP) because paid leave quota is completed.')
          : (language === 'te'
            ? 'సెలవు అప్లికేషన్ విజయవంతంగా సబ్మిట్ చేయబడింది!'
            : 'Leave application submitted successfully!')
      );
      setFromDate('');
      setToDate('');
      setReason('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit leave. Please check your connection.');
    }
  };

  // Status tag styling helper
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            {t.statusApproved}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold border border-rose-100">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            {t.statusRejected}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-100 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {t.statusPending}
          </span>
        );
    }
  };

  return (
    <div id="leave-module-root" className="space-y-6">

      {/* Top Controls: Leave Title & Manager Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">
            {t.leave}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {managerMode ? t.managerViewLabel : "Submit and track your formal leave applications"}
          </p>
        </div>

        {/* Manager Mode Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.roleManager}
          </span>
          <button
            id="manager-mode-toggle"
            onClick={() => {
              setManagerMode(!managerMode);
              setSuccessMsg('');
              setErrorMsg('');
            }}
            className="focus:outline-none cursor-pointer"
          >
            {managerMode ? (
              <ToggleRight className="w-9 h-9 text-teal-600" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Leave Balances Header Cards */}
      <div id="leave-balances-grid" className={`grid grid-cols-2 md:grid-cols-3 ${gender === 'female' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
        {/* Casual Leave Card */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
          {onUpdateBalances && (
            <button onClick={() => openManageModal('casual')} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'te' ? 'క్యాజువల్ లీవ్ (CL)' : 'Casual Leave (CL)'}
          </span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-slate-800">
              {casualRemaining}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {leaveBalance.casual.allowed} {leaveBalance.casual.allowed === 0 ? '(Probation)' : 'left'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            {leaveBalance.casual.allowed === 0 ? 'Unlocked after 1 yr' : '1 Paid / Month'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${leaveBalance.casual.allowed > 0 ? (casualRemaining / leaveBalance.casual.allowed) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
          {onUpdateBalances && (
            <button onClick={() => openManageModal('sick')} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'te' ? 'సిక్ లీవ్ (SL)' : 'Sick Leave (SL)'}
          </span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-slate-800">
              {sickRemaining}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {leaveBalance.sick.allowed} {leaveBalance.sick.allowed === 0 ? '(Probation)' : 'left'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            {leaveBalance.sick.allowed === 0 ? 'Unlocked after 1 yr' : '1 Paid / Month'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${leaveBalance.sick.allowed > 0 ? (sickRemaining / leaveBalance.sick.allowed) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Week Off (WO) Card */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            {language === 'te' ? 'వారం సెలవు (Week Off)' : 'Week Off (WO)'}
          </span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-emerald-700">
              {weekOffRemaining}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {weekOffAllowed} left
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 mt-2 font-semibold">
            {gender === 'female' ? '3 / Month (Women, Paid)' : '2 / Month (Men, Paid)'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${weekOffAllowed > 0 ? (weekOffRemaining / weekOffAllowed) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Parental Leave Cards: Maternity (Female) or Paternity (Male) */}
        {gender === 'female' ? (
          <>
            {/* Maternity Leave (With Pay) Card */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
              {onUpdateBalances && (
                <button onClick={() => openManageModal('maternity')} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}
              <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">
                {language === 'te' ? 'ప్రసూతి సెలవు (With Pay)' : 'Maternity (With Pay)'}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black font-mono text-pink-600">
                  {maternityRemaining}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {leaveBalance.maternity?.allowed || 90} left
                </span>
              </div>
              <p className="text-[10px] text-pink-600 mt-2 font-semibold">
                {language === 'te' ? '90 రోజులు (పూర్తి వేతనంతో)' : '90 Days (100% Paid Salary)'}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-pink-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(maternityRemaining / (leaveBalance.maternity?.allowed || 90)) * 100}%` }}
                />
              </div>
            </div>

            {/* Maternity Leave (Without Pay / LOP) Card */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
              {onUpdateBalances && (
                <button onClick={() => openManageModal('maternity_unpaid')} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                {language === 'te' ? 'ప్రసూతి సెలవు (Without Pay)' : 'Maternity (Without Pay / LOP)'}
              </span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black font-mono text-purple-600">
                  {maternityUnpaidRemaining}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  / {leaveBalance.maternity_unpaid?.allowed || 90} left
                </span>
              </div>
              <p className="text-[10px] text-purple-600 mt-2 font-semibold">
                {language === 'te' ? '90 రోజులు (వేతనం లేకుండా / LOP)' : '90 Days (Unpaid / LOP)'}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(maternityUnpaidRemaining / (leaveBalance.maternity_unpaid?.allowed || 90)) * 100}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
            {onUpdateBalances && (
              <button onClick={() => openManageModal('paternity')} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.leavePaternity || 'Paternity Leave'}
            </span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-slate-800">
                {Math.max(0, (leaveBalance.paternity?.allowed || 15) - (leaveBalance.paternity?.taken || 0))}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {leaveBalance.paternity?.allowed || 15} left
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Max 7 Consecutive Days/App</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${(Math.max(0, (leaveBalance.paternity?.allowed || 15) - (leaveBalance.paternity?.taken || 0)) / (leaveBalance.paternity?.allowed || 15)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Loss of Pay (LOP) Card */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative group">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
            {language === 'te' ? 'లాస్ ఆఫ్ పే (LOP)' : 'Loss of Pay (LOP)'}
          </span>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-black font-mono text-rose-600">
              {leaveBalance.lop?.taken || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">days taken</span>
          </div>
          <p className="text-[10px] text-rose-500 mt-2 font-semibold">
            1 Day Salary Cut per Day
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((leaveBalance.lop?.taken || 0) / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Manage Balance Modal */}
        {showManageModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-xl animate-scaleUp">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-600" />
                Manage Balance
              </h3>

              <form onSubmit={handleSaveManage} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allotted</label>
                    <input
                      type="number"
                      required
                      value={manageAllotted}
                      onChange={(e) => setManageAllotted(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taken</label>
                    <input
                      type="number"
                      required
                      value={manageUsed}
                      onChange={(e) => setManageUsed(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowManageModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LEFT COLUMN: Apply Leave (only visible in Employee Mode) */}
        {!managerMode ? (
          <div id="leave-form-container" className="lg:col-span-5 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <h3 className="text-base font-bold font-display text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
              {t.leaveTitle}
            </h3>

            {/* Exhausted Paid Leaves Banner */}
            {isPaidExhausted && (
              <div className="mb-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900">
                    {language === 'te'
                      ? 'ఈ నెలకు పెయిడ్ సెలవుల కోటా (CL/SL) పూర్తయింది'
                      : 'Monthly Paid Leave Quota (CL/SL) Completed'}
                  </p>
                  <p className="text-amber-700 leading-relaxed text-[11px]">
                    {language === 'te'
                      ? `మీకు పెయిడ్ సెలవులు మిగిలి లేవు (0 left). అత్యవసరంగా సెలవు అవసరమైతే మీరు "Loss of Pay (LOP)" ద్వారా దరఖాస్తు చేసుకోవచ్చు${weekOffRemaining > 0 ? ` లేదా మిగిలి ఉన్న ${weekOffRemaining} వారం సెలవు (Week Off) ఉపయోగించుకోవచ్చు` : ''}.`
                      : `You have 0 paid leaves left this month. You can apply for "Loss of Pay (LOP)"${weekOffRemaining > 0 ? ` or use your remaining ${weekOffRemaining} Week Off(s)` : ''}.`}
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 bg-rose-50 text-rose-700 p-3.5 rounded-xl border border-rose-100 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-50 text-emerald-700 p-3.5 rounded-xl border border-emerald-100 text-sm font-medium">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t.formType}
                </label>
                <select
                  id="leave-type-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full border border-slate-200 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 font-medium transition-all"
                >
                  {availableLeaveOptions.map(opt => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.formFrom}
                  </label>
                  <input
                    id="leave-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 font-mono transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t.formTo}
                  </label>
                  <input
                    id="leave-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 font-mono transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t.formReason}
                </label>
                <textarea
                  id="leave-reason-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t.formReasonPlaceholder}
                  rows={3}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Policy Quick Reminder */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  Leave Policy Highlights
                </p>
                <p className="text-amber-700 leading-relaxed">
                  • <strong>Week Off (WO):</strong> 3/month (Women), 2/month (Men) — No salary deduction.<br />
                  • <strong>Regular Leave (CL/SL):</strong> Max 3 consecutive days. 1/month credited after 1 yr tenure.<br />
                  • <strong>Maternity Leave:</strong> Up to 90 days (Without Pay / Unpaid).<br />
                  • <strong>Anti-Spam:</strong> Re-applying for the same date requires cancelling your pending application first.<br />
                  • <strong>Loss of Pay (LOP):</strong> 1 day pay deduction. Unapproved Absent: 2 days pay penalty.
                </p>
              </div>

              <button
                id="submit-leave-btn"
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm tracking-wide shadow-md shadow-teal-600/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {t.btnSubmitLeave}
              </button>
            </form>
          </div>
        ) : (
          /* Manager Notification Banner */
          <div className="lg:col-span-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="bg-amber-100 text-amber-800 p-3 rounded-xl w-fit">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-amber-900 font-display">
                {language === 'te' ? 'మేనేజర్ నియంత్రణ ప్యానెల్' : 'Manager Control Panel'}
              </h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                {language === 'te'
                  ? 'మీరు ఉద్యోగుల సెలవు అభ్యర్థనలను ఇక్కడి నుండి ఒకే క్లిక్‌తో ఆమోదించవచ్చు లేదా తిరస్కరించవచ్చు. ఆమోదించిన సెలవులు వెంటనే ఉద్యోగి బ్యాలెన్స్ లో సర్దుబాటు చేయబడతాయి.'
                  : 'You have full authorization to manage leave applications. Approving a request instantly decreases the employee’s balance and logs it on their attendance calendar.'
                }
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-amber-200/50 flex items-center justify-between text-xs text-amber-600 font-semibold">
              <span>Security Clearance Level 1</span>
              <span className="underline">HR-Manual-v4.2</span>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: History (or Approval list in Manager Mode) */}
        <div className="lg:col-span-7 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 pb-2">
            <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
            <h3 className="text-lg font-bold font-display text-slate-800">
              {managerMode ? (language === 'te' ? 'ఆమోదం కొరకు అప్లికేషన్లు' : 'Requests Requiring Action') : t.historyTitle}
            </h3>
          </div>

          <div className="space-y-4">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                {t.noData}
              </div>
            ) : (
              leaveRequests.slice().reverse().map((req) => {
                const leaveTypeName =
                  req.type === 'casual' ? (language === 'te' ? 'క్యాజువల్ లీవ్ (Casual Leave)' : 'Casual Leave') :
                    req.type === 'sick' ? (language === 'te' ? 'సిక్ లీవ్ (Sick Leave)' : 'Sick Leave') :
                      req.type === 'weekoff' ? (language === 'te' ? 'వారం సెలవు (Week Off - Paid)' : 'Week Off (Paid, No Cut)') :
                        req.type === 'lop' ? (language === 'te' ? 'లాస్ ఆఫ్ పే (LOP Leave)' : 'Loss of Pay (LOP)') :
                          req.type === 'maternity' ? (language === 'te' ? 'ప్రసూతి సెలవు (వేతనంతో కూడినది / With Pay)' : 'Maternity Leave (With Pay)') :
                          req.type === 'maternity_unpaid' ? (language === 'te' ? 'ప్రసూతి సెలవు (వేతనం లేకుండా / Without Pay - LOP)' : 'Maternity Leave (Without Pay / LOP)') :
                            req.type === 'paternity' ? (t.leavePaternity || 'Paternity Leave') :
                              (language === 'te' ? 'నెలవారీ సెలవు' : 'Monthly Leave');
                const isPending = req.status === 'pending';

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-2xl border transition-all duration-300 ${isPending
                      ? 'border-amber-100 bg-amber-50/20'
                      : 'border-slate-100 bg-white hover:shadow-md'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                          ID: {req.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                          {leaveTypeName}
                        </h4>
                      </div>
                      <div className="self-start sm:self-center">
                        {getStatusTag(req.status)}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <p>
                        <span className="font-semibold text-slate-700">{t.historyHeaderDates}: </span>
                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {req.fromDate}
                        </span>
                        <span className="mx-2">→</span>
                        <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {req.toDate}
                        </span>
                      </p>
                      <p className="italic">
                        <span className="font-semibold text-slate-700 not-italic">{t.historyHeaderReason}: </span>
                        "{req.reason || 'No details provided'}"
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {t.historyHeaderSubmitted}: {req.submittedAt}
                      </p>
                    </div>

                    {/* Employee Action: Cancel/Delete Pending Request to re-apply */}
                    {!managerMode && isPending && onDeleteLeave && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {language === 'te' ? 'అడ్మిన్ ఆమోదం కొరకు పెండింగ్' : 'Awaiting Admin Approval'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(language === 'te'
                              ? 'మీరు ఈ సెలవు అభ్యర్థనను రద్దు/డిలీట్ చేయాలనుకుంటున్నారా? దీనివల్ల మీరు ఈ తేదీకి మళ్లీ దరఖాస్తు చేసుకోవచ్చు.'
                              : 'Are you sure you want to cancel this leave application? This will allow you to re-apply for this date.')) {
                              try {
                                await onDeleteLeave(req.id);
                              } catch (e: any) {
                                alert(e?.message || 'Failed to cancel request');
                              }
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'te' ? 'రద్దు చేయి (Cancel)' : 'Cancel Request'}</span>
                        </button>
                      </div>
                    )}

                    {/* Approver actions for Manager Mode */}
                    {managerMode && isPending && (
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-end gap-2.5">
                        <button
                          id={`reject-${req.id}`}
                          onClick={() => onRejectLeave(req.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t.btnReject}
                        </button>
                        <button
                          id={`approve-${req.id}`}
                          onClick={() => onApproveLeave(req.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t.btnApprove}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
