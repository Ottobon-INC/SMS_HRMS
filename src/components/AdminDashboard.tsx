import React from 'react';
import { ArrowRight, Users, CheckCircle, Clock, Landmark, AlertCircle } from 'lucide-react';
import { Language, Employee, LeaveRequest } from '../types';
import { translations } from '../translations';

interface AdminDashboardProps {
  language: Language;
  employees: Employee[];
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboard({ language, employees, setActiveTab }: AdminDashboardProps) {
  const t = translations[language];

  // Calculate snapshot metrics
  const totalEmployees = employees.length;
  
  // Checking active today
  const checkedInToday = employees.filter(emp => emp.isCheckedIn).length;
  
  const inactiveEmployees = employees.filter(emp => emp.status === 'inactive').length;
  
  // Pending leaves across everyone
  const pendingRequests: { req: LeaveRequest; empName: string; empId: string }[] = [];
  employees.forEach(emp => {
    emp.leaveRequests.forEach(req => {
      if (req.status === 'pending') {
        pendingRequests.push({ req, empName: emp.name, empId: emp.id });
      }
    });
  });
  const pendingCount = pendingRequests.length;

  // Calculate payroll total (based on basic salary + rough HRA estimation)
  const totalPayroll = employees.reduce((sum, emp) => {
    if (emp.role === 'admin') return sum; // Admins might not have active payroll listed
    // Total gross = basic salary + estimated allowances (HRA ~40% basic + Medical ~3000 + Conveyance ~4000)
    const gross = emp.basicSalary + (emp.basicSalary * 0.4) + 3000 + 4000;
    const deductions = (emp.basicSalary * 0.12) + 200 + 3000; // rough standard deduction
    return sum + (gross - deductions);
  }, 0);

  const formattedPayroll = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(totalPayroll);

  const localizedText = {
    en: {
      title: "Admin Management Dashboard",
      subtitle: "SMS Diagnostics Headquarters Overview",
      summaryCardTitle: "Admin Quick Snapshot",
      quickActionTitle: "Quick Management Actions",
      recentLeavesTitle: "Recent Pending Leaves Requiring Decision",
      allCheckedIn: "View who is active in the directory.",
      actionApprove: "Go to Leave Approvals",
      actionDirectory: "View Directory",
      actionAttendance: "View Company Attendance",
      actionPayroll: "Generate Salaries",
      activeLabel: "Checked In",
      onLeaveLabel: "On Leave",
      absentLabel: "Absent",
    },
    te: {
      title: "అడ్మిన్ మేనేజ్‌మెంట్ డాష్‌బోర్డ్",
      subtitle: "వైబ్రంట్ కంపెనీ హెడ్‌క్వార్టర్స్ అవలోకనం",
      summaryCardTitle: "అడ్మిన్ త్వరిత సారాంశం",
      quickActionTitle: "త్వరిత మేనేజ్‌మెంట్ పనులు",
      recentLeavesTitle: "ఆమోదం కొరకు ఎదురుచూస్తున్న లీవ్ అప్లికేషన్లు",
      allCheckedIn: "ఉద్యోగుల వివరాలు ఇక్కడ చూడండి.",
      actionApprove: "లీవ్ అప్రూవల్స్ కి వెళ్ళండి",
      actionDirectory: "ఉద్యోగుల లిస్ట్ చూడండి",
      actionAttendance: "హాజరు పట్టిక చూడండి",
      actionPayroll: "జీతాలు రన్ చేయండి",
      activeLabel: "హాజరయ్యారు",
      onLeaveLabel: "సెలవులో ఉన్నారు",
      absentLabel: "రాలేదు",
      inactiveEmployees: "ఇన్యాక్టివ్ ఉద్యోగులు",
    }
  }[language];

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fadeIn">
      
      {/* 1. Header Hero Panel */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 md:p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 text-center md:text-left z-10">
          <span className="px-3 py-1 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">
            {language === 'te' ? 'అడ్మిన్ మోడ్' : 'Administrator Control Panel'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
            {localizedText.title}
          </h2>
          <p className="text-xs text-slate-400">
            {localizedText.subtitle}
          </p>
        </div>

        <div className="flex gap-3 shrink-0 z-10">
          <button
            onClick={() => setActiveTab('directory')}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer active:scale-95 shadow-md shadow-teal-600/10"
          >
            {localizedText.actionDirectory}
          </button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-50/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Numeric Snapshot Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        
        {/* Card 1: Total Employees */}
        <div 
          onClick={() => setActiveTab('directory')}
          className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalEmployees}</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{totalEmployees.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'మంది' : 'active'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'కంపెనీలో మొత్తం స్టాఫ్' : 'Total staff onboarded'}
          </p>
        </div>

        {/* Card 2: Checked-In Today */}
        <div 
          onClick={() => setActiveTab('attendanceOverview')}
          className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.checkedInToday}</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{checkedInToday.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">/ {totalEmployees}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {localizedText.allCheckedIn}
          </p>
        </div>

        {/* Card 3: Pending Leaves */}
        <div 
          onClick={() => setActiveTab('leaveApprovals')}
          className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.pendingLeaves}</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{pendingCount.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'అభ్యర్థనలు' : 'pending'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'ఆమోదం కొరకు వెయిటింగ్' : 'Requires quick manager attention'}
          </p>
        </div>

        {/* Card 4: This Month's Payroll Total */}
        <div 
          onClick={() => setActiveTab('adminPayroll')}
          className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.monthlyPayrollTotal}</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl sm:text-2xl font-black font-sans text-slate-800">{formattedPayroll}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'అంచనా వేయబడిన నికర వ్యయం' : 'Estimated net disbursement'}
          </p>
        </div>

        {/* Card 5: Inactive Employees */}
        <div 
          onClick={() => setActiveTab('directory')}
          className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{localizedText.inactiveEmployees || 'Inactive'}</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{inactiveEmployees.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'మంది' : 'inactive'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'పనిలో లేని ఉద్యోగులు' : 'Currently inactive staff'}
          </p>
        </div>

      </div>

      {/* 3. Bottom Columns: Quick Action Panels and Recent Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (lg:col-span-4): Quick Action Panel */}
        <div className="lg:col-span-4 bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6">
              {localizedText.quickActionTitle}
            </h3>

            <div className="space-y-3">
              {/* Directory */}
              <button 
                onClick={() => setActiveTab('directory')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionDirectory}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              
              {/* Attendance */}
              <button 
                onClick={() => setActiveTab('attendanceOverview')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionAttendance}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Leave Approvals */}
              <button 
                onClick={() => setActiveTab('leaveApprovals')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionApprove}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Payroll */}
              <button 
                onClick={() => setActiveTab('adminPayroll')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionPayroll}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-900 leading-normal text-xs font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>
              {language === 'te'
                ? "అడ్మిన్ పనులన్నీ నేరుగా ఉద్యోగుల వ్యూ లో అప్డేట్ అవుతాయి."
                : "All administrator updates instantly sync and reflect on employee mobile and desktop portals."
              }
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-8): Recent Pending Leaves List */}
        <div className="lg:col-span-8 bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-800">
              {localizedText.recentLeavesTitle}
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full">
              {pendingCount} {language === 'te' ? 'పెండింగ్' : 'Pending'}
            </span>
          </div>

          {pendingCount === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              {language === 'te' 
                ? 'ఆమోదం కొరకు ఎలాంటి లీవ్ రిక్వెస్ట్లు లేవు.' 
                : 'Excellent! No pending leave requests to process.'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map(({ req, empName, empId }) => (
                <div key={req.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{empName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({empId})</span>
                    </div>
                    <p className="text-[11px] font-bold text-teal-700">
                      {req.type.toUpperCase()} LEAVE • {req.fromDate} to {req.toDate}
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      "{req.reason}"
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('leaveApprovals')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{language === 'te' ? 'నిర్ణయం తీసుకోండి' : 'Process Request'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {pendingCount > 3 && (
                <button
                  onClick={() => setActiveTab('leaveApprovals')}
                  className="w-full text-center py-2.5 border border-dashed border-slate-200 hover:border-teal-500 rounded-xl text-xs font-bold text-slate-500 hover:text-teal-600 transition-all"
                >
                  {language === 'te' ? `మిగిలిన ${pendingCount - 3} రిక్వెస్ట్లను చూడండి` : `View Remaining ${pendingCount - 3} Requests`}
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
