import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Clock, 
  Calendar, 
  Moon, 
  Landmark, 
  Receipt, 
  HeartHandshake,
  Users,
  LogOut,
  IndianRupee,
  MapPin,
  MessageSquare,
  Settings,
  CalendarDays
} from 'lucide-react';

import { Language } from './types';
import { translations } from './translations';

import { useEmployees } from './hooks/useEmployees';
import { useAuth } from './hooks/useAuth';
import { useLeaves } from './hooks/useLeaves';
import { useAttendance } from './hooks/useAttendance';
import { usePayroll } from './hooks/usePayroll';
import { useAdvances } from './hooks/useAdvances';
import { useLocationPins } from './hooks/useLocationPins';

import LoginScreen from './components/LoginScreen';
import SmsLogo from './components/SmsLogo';
import UserProfileModal from './components/UserProfileModal';

// --- LAZY LOADED MODULES ---
const DashboardSnapshot = React.lazy(() => import('./components/DashboardSnapshot'));
const CheckInModule = React.lazy(() => import('./components/CheckInModule'));
const AttendanceModule = React.lazy(() => import('./components/AttendanceModule'));
const LeaveModule = React.lazy(() => import('./components/LeaveModule'));
const PayrollModule = React.lazy(() => import('./components/PayrollModule'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const EmployeeDirectory = React.lazy(() => import('./components/EmployeeDirectory'));
const AdminAttendance = React.lazy(() => import('./components/AdminAttendance'));
const AdminLeaveApprovals = React.lazy(() => import('./components/AdminLeaveApprovals'));
const AdminPayroll = React.lazy(() => import('./components/AdminPayroll'));
const AdvanceRequestModule = React.lazy(() => import('./components/AdvanceRequestModule'));
const AdminAdvanceApprovals = React.lazy(() => import('./components/AdminAdvanceApprovals'));
const AdminOfficeLocations = React.lazy(() => import('./components/AdminOfficeLocations'));
const AdminSpecialEvents = React.lazy(() => import('./components/AdminSpecialEvents'));
const EmployeeSpecialEvents = React.lazy(() => import('./components/EmployeeSpecialEvents'));
const MessagingModule = React.lazy(() => import('./components/MessagingModule').then(m => ({ default: m.MessagingModule })));
const AdminSettings = React.lazy(() => import('./components/AdminSettings'));
const DutyRosterModule = React.lazy(() => import('./components/DutyRosterModule'));
const EmployeeRoster = React.lazy(() => import('./components/EmployeeRoster'));
const AdminMissedPunches = React.lazy(() => import('./components/AdminMissedPunches'));
const EmployeeMissedPunches = React.lazy(() => import('./components/EmployeeMissedPunches'));

export default function App() {
  // --- Persistent Bilingual State ---
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('hrms_lang');
    return (saved === 'te' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('hrms_lang', language);
  }, [language]);

  const t = translations[language];

  // --- Dynamic Tab Navigation State & Routing ---
  const [activeTab, setActiveTab] = useState<string>(() => {
    const path = window.location.pathname.substring(1);
    const pathToTab: Record<string, string> = {
      'dashboard': 'dashboard',
      'attendance': 'attendance',
      'leave': 'leave',
      'advance': 'advance',
      'payroll': 'payroll',
      'admin-dashboard': 'adminDashboard',
      'directory': 'directory',
      'attendance-overview': 'attendanceOverview',
      'leave-approvals': 'leaveApprovals',
      'advance-approvals': 'advanceApprovals',
      'run-payroll': 'adminPayroll',
      'office-locations': 'officeLocations',
      'special-events': 'specialEvents',
      'messages': 'messages',
      'admin-settings': 'adminSettings',
      'missed-punches-admin': 'adminMissedPunches',
      'missed-punches': 'employeeMissedPunches'
    };
    
    if (pathToTab[path]) return pathToTab[path];
    return localStorage.getItem('hrms_active_tab') || 'dashboard';
  });
  
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Sync activeTab to LocalStorage and URL
  useEffect(() => {
    localStorage.setItem('hrms_active_tab', activeTab);
    
    const tabToPath: Record<string, string> = {
      'dashboard': 'dashboard',
      'attendance': 'attendance',
      'leave': 'leave',
      'advance': 'advance',
      'payroll': 'payroll',
      'adminDashboard': 'admin-dashboard',
      'directory': 'directory',
      'attendanceOverview': 'attendance-overview',
      'leaveApprovals': 'leave-approvals',
      'advanceApprovals': 'advance-approvals',
      'adminPayroll': 'run-payroll',
      'officeLocations': 'office-locations',
      'specialEvents': 'special-events',
      'messages': 'messages',
      'adminSettings': 'admin-settings',
      'adminMissedPunches': 'missed-punches-admin',
      'employeeMissedPunches': 'missed-punches'
    };
    
    const newPath = '/' + (tabToPath[activeTab] || activeTab);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [activeTab]);

  // Handle Browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      const pathToTab: Record<string, string> = {
        'dashboard': 'dashboard',
        'attendance': 'attendance',
        'leave': 'leave',
        'payroll': 'payroll',
        'admin-dashboard': 'adminDashboard',
        'directory': 'directory',
        'team-attendance': 'attendanceOverview',
        'leave-approvals': 'leaveApprovals',
        'run-payroll': 'adminPayroll',
        'office-locations': 'officeLocations',
        'special-events': 'specialEvents',
        'messages': 'messages',
        'admin-settings': 'adminSettings',
        'missed-punches-admin': 'adminMissedPunches',
        'missed-punches': 'employeeMissedPunches'
      };
      
      if (pathToTab[path]) {
        setActiveTab(pathToTab[path]);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Hooks ---
  const { employees, isLoading, error, isLocalMode, loadData, addEmployee, updateEmployee, deleteEmployee, toggleStatus } = useEmployees();
  const { currentUser, currentUserId, login, logout } = useAuth(employees);
  
  const { applyLeave, approveLeave, rejectLeave, updateBalances } = useLeaves(isLocalMode, loadData);
  const { toggleCheckIn, updateAttendance, forceCloseSession } = useAttendance(isLocalMode, loadData);
  const { runBulkPayroll, updatePayslip, generateSinglePayslip } = usePayroll(isLocalMode, loadData);
  const { submitAdvance, approveAdvance, rejectAdvance } = useAdvances(isLocalMode, loadData);
  const { addPin } = useLocationPins(currentUser?.id, isLocalMode);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Auto Route / Tab Correction On Login Role Swap ---
  useEffect(() => {
    if (!currentUser) return;
    
    const adminTabs = ['adminDashboard', 'directory', 'attendanceOverview', 'leaveApprovals', 'advanceApprovals', 'adminPayroll', 'officeLocations', 'specialEvents', 'messages', 'adminSettings', 'dutyRoster', 'adminMissedPunches'];
    const employeeTabs = ['dashboard', 'attendance', 'leave', 'advance', 'payroll', 'events', 'messages', 'myRoster', 'employeeMissedPunches'];

    if (currentUser.role === 'admin' && !adminTabs.includes(activeTab)) {
      setActiveTab('adminDashboard');
    } else if (currentUser.role === 'employee' && !employeeTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUserId, currentUser, activeTab]);

  // --- LOGOUT HANDLER ---
  const handleLogOut = () => {
    logout();
    localStorage.removeItem('hrms_active_tab');
  };


  // Center spinner for initial database loading
  if (isLoading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    );
  }

  // Beautiful screen for DB setup instruction / errors
  if (error && employees.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
            !
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Supabase Sync Failed</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't connect or fetch tables. This usually happens if the schema tables haven't been created yet.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-left space-y-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600">Quick Solution Checklist:</span>
            <ol className="text-[10px] text-slate-500 space-y-1 list-decimal list-inside leading-normal font-medium">
              <li>Open your Supabase project's SQL Editor</li>
              <li>Copy and run the SQL table schema instructions</li>
              <li>Ensure tables like <code className="font-mono bg-slate-200/60 px-1 rounded text-slate-700">employees</code> exist</li>
            </ol>
          </div>

          <div className="pt-2">
            <button 
              onClick={loadData} 
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-teal-600/10 cursor-pointer transition-all"
            >
              Retry Syncing Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, force render the Login Screen
  if (!currentUserId || !currentUser) {
    return (
      <LoginScreen
        language={language}
        employees={employees}
        onLoginSuccess={(emp) => {
          login(emp.id);
          if (emp.role === 'admin') {
            setActiveTab('adminDashboard');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />
    );
  }

  // --- ACTIVE MODULE COMPONENT ROUTING ---
  const renderActiveModule = () => {
    switch (activeTab) {
      // --- EMPLOYEE MODULES ---
      case 'dashboard':
        return (
          <DashboardSnapshot
            language={language}
            currentUser={currentUser}
            isCheckedIn={currentUser.isCheckedIn}
            logs={currentUser.checkInLogs}
            attendanceRecords={currentUser.attendanceRecords}
            leaveBalance={currentUser.leaveBalance}
            payslips={currentUser.payslips}
            setActiveTab={setActiveTab}
            onToggleCheckIn={(photoData?: string, punchType?: import('./types').PunchType, punchNote?: string) => toggleCheckIn(currentUser.id, currentUser.isCheckedIn, photoData, punchType, punchNote)}
            pins={currentUser.locationPins || []}
            onAddPin={addPin}
          />
        );
      case 'attendance':
        return (
          <AttendanceModule
            language={language}
            attendanceRecords={currentUser.attendanceRecords}
          />
        );
      case 'employeeMissedPunches':
        return (
          <EmployeeMissedPunches
            language={language}
            currentUser={currentUser}
          />
        );
      case 'events':
        return (
          <EmployeeSpecialEvents
            language={language}
            employeeId={currentUser.id}
          />
        );
      case 'myRoster':
        return (
          <EmployeeRoster 
            language={language}
            employeeId={currentUser.id}
          />
        );
      case 'leave':
        return (
          <LeaveModule
            language={language}
            leaveBalance={currentUser.leaveBalance}
            monthlyQuota={currentUser.monthlyQuota!}
            leaveRequests={currentUser.leaveRequests}
            gender={currentUser.gender}
            onApplyLeave={(type, fromDate, toDate, reason) => applyLeave(currentUser.id, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })}
            onApproveLeave={approveLeave}
            onRejectLeave={rejectLeave}
          />
        );
      case 'advance':
        return (
          <AdvanceRequestModule
            language={language}
            advanceRequests={currentUser.advanceRequests || []}
            onSubmitAdvance={(amount, reason, repaymentMonths, type) => submitAdvance(currentUser.id, amount, reason, repaymentMonths, type)}
            isEligible={(currentUser.experience || 0) >= 1 || new Date(currentUser.joiningDate) <= new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
            employeeSalary={currentUser.basicSalary}
          />
        );
      case 'payroll':
        return (
          <PayrollModule
            language={language}
            payslips={currentUser.payslips}
            employeeName={currentUser.name}
            employeeId={currentUser.id}
            employeeEmail={currentUser.email}
            employeeDesignation={currentUser.designation}
            employeeJoiningDate={currentUser.joiningDate}
            employeeExperience={currentUser.experience}
            employeeBankDetails={currentUser.bankDetails}
          />
        );

      // --- ADMIN MODULES ---
      case 'adminDashboard':
        return (
          <AdminDashboard
            language={language}
            employees={employees}
            setActiveTab={setActiveTab}
          />
        );
      case 'directory':
        return (
          <EmployeeDirectory
            language={language}
            employees={employees}
            onAddEmployee={addEmployee}
            onUpdateEmployee={updateEmployee}
            onDeleteEmployee={deleteEmployee}
            onUpdatePayslip={updatePayslip}
            onApproveEmployeeLeave={(empId, reqId) => approveLeave(reqId)}
            onRejectEmployeeLeave={(empId, reqId) => rejectLeave(reqId)}
            onApplyEmployeeLeave={(empId, type, fromDate, toDate, reason) => applyLeave(empId, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })}
            onUpdateLeaveBalances={updateBalances}
          />
        );
      case 'attendanceOverview':
        return (
          <AdminAttendance
            language={language}
            employees={employees}
            onUpdateAttendance={updateAttendance}
            onForceCloseSession={forceCloseSession}
          />
        );
      case 'adminMissedPunches':
        return (
          <AdminMissedPunches
            language={language}
            employees={employees}
            adminId={currentUser.id}
          />
        );
      case 'leaveApprovals':
        return (
          <AdminLeaveApprovals
            language={language}
            employees={employees}
            onApproveLeave={(empId, reqId, note) => approveLeave(reqId, note)}
            onRejectLeave={(empId, reqId, note) => rejectLeave(reqId, note)}
          />
        );
      case 'advanceApprovals':
        return (
          <AdminAdvanceApprovals
            language={language}
            employees={employees}
            onApprove={approveAdvance}
            onReject={rejectAdvance}
          />
        );
      case 'adminPayroll':
        return (
          <AdminPayroll
            language={language}
            employees={employees}
            onRunBulkPayroll={(month) => runBulkPayroll(employees, month)}
            onGenerateSinglePayslip={generateSinglePayslip}
            onUpdatePayslip={updatePayslip}
            onUpdateEmployee={updateEmployee}
          />
        );
      case 'officeLocations':
        return (
          <AdminOfficeLocations language={language} />
        );
      case 'specialEvents':
        return (
          <AdminSpecialEvents language={language} employees={employees} />
        );
      case 'messages':
        return (
          <MessagingModule currentUser={currentUser} employees={employees} />
        );
      case 'adminSettings':
        return (
          <AdminSettings language={language} />
        );
      case 'dutyRoster':
        return (
          <DutyRosterModule language={language} employees={employees} />
        );

      default:
        return (
          <div className="py-12 text-center text-slate-500 font-medium">
            {t.noData}
          </div>
        );
    }
  };

  // Helper avatar label
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  return (
    <div id="app-workspace" className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans transition-colors duration-300 antialiased">
      
      {isLocalMode && error && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 sm:px-6 lg:px-8 text-amber-800 text-xs font-semibold flex items-center justify-between gap-4 no-print shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="leading-normal">
              {error}
            </p>
          </div>
          <button 
            onClick={() => loadData()} 
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all text-[10px] uppercase tracking-wide shrink-0 cursor-pointer shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 1. Header Navigation Bar (Hidden during Print mode) */}
      <header id="main-portal-header" className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 no-print">
        <div className="w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center">
            <SmsLogo textSize="text-base sm:text-lg font-black" subtitle={false} />
          </div>

          {/* Right Area Controls: Employee Info, Language Toggle, Logout */}
          <div className="flex items-center gap-4">
            
            {/* Simple Human Profile Card */}
            <button 
              onClick={() => setShowProfileModal(true)}
              className="hidden md:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 py-1.5 pl-2.5 pr-4 rounded-full border border-slate-100 transition-colors cursor-pointer"
            >
              <div className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black">
                {getAvatarInitials(currentUser.name)}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">{currentUser.name}</span>
                <span className="text-[9px] text-slate-400 font-medium block leading-none mt-0.5">{currentUser.id}</span>
              </div>
            </button>

            {/* Logout Icon for MD+ */}
            <button
              onClick={handleLogOut}
              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
              title={language === 'te' ? 'లాగ్ అవుట్' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Bilingual Switch Slider (EN ⇄ తె) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                id="toggle-lang-en"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all uppercase cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.english}
              </button>
              <button
                id="toggle-lang-te"
                onClick={() => setLanguage('te')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'te'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.telugu}
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* 2. Primary Layout Container */}
      <div id="portal-body-wrapper" className="flex-1 w-full mx-auto px-4 sm:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 print:p-0 print:m-0">
        
        {/* SIDE BAR NAVIGATION (Desktop view - Hidden during Print mode) */}
        <aside id="desktop-sidebar" className="lg:col-span-3 space-y-2 hidden lg:block no-print">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm sticky top-24">
            
            {/* Quick Profile Segment */}
            <div className="p-3 mb-4 bg-slate-50 rounded-xl border border-slate-100/50 flex items-center gap-3">
              <div className="bg-teal-50 text-teal-700 w-10 h-10 rounded-xl flex items-center justify-center font-black">
                {getAvatarInitials(currentUser.name)}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{currentUser.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-none mt-1.5 uppercase tracking-wide">
                  {currentUser.role === 'admin' ? (language === 'te' ? 'అడ్మిన్' : 'Supervisor / Admin') : currentUser.designation}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="space-y-1">
              
              {/* --- IF ADMIN --- */}
              {currentUser.role === 'admin' ? (
                <>
                  <button
                    id="nav-tab-admin-dashboard"
                    onClick={() => setActiveTab('adminDashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'adminDashboard'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'adminDashboard' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Home className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'అడ్మిన్ డాష్‌బోర్డ్' : 'Admin Dashboard'}</span>
                  </button>

                  <button
                    id="nav-tab-directory"
                    onClick={() => setActiveTab('directory')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'directory'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'directory' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Users className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'ఉద్యోగుల డైరెక్టరీ' : 'Employee Directory'}</span>
                  </button>

                  <button
                    id="nav-tab-attendance-overview"
                    onClick={() => setActiveTab('attendanceOverview')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'attendanceOverview'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'attendanceOverview' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'కంపెనీ హాజరు' : 'Team Attendance'}</span>
                  </button>

                  <button
                    id="nav-tab-admin-missed-punches"
                    onClick={() => setActiveTab('adminMissedPunches')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'adminMissedPunches'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'adminMissedPunches' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'మిస్ అయిన పంచ్ అవుట్స్' : 'Missed Punches'}</span>
                  </button>

                  <button
                    id="nav-tab-leave-approvals"
                    onClick={() => setActiveTab('leaveApprovals')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'leaveApprovals'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'leaveApprovals' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'సెలవుల ఆమోదం' : 'Leave Approvals'}</span>
                  </button>

                  <button
                    id="nav-tab-advance-approvals"
                    onClick={() => setActiveTab('advanceApprovals')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'advanceApprovals'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'advanceApprovals' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <IndianRupee className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'అడ్వాన్స్ ఆమోదాలు' : 'Advance Approvals'}</span>
                  </button>

                  <button
                    id="nav-tab-admin-payroll"
                    onClick={() => setActiveTab('adminPayroll')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'adminPayroll'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'adminPayroll' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Landmark className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'జీతాలు రన్ చేయండి' : 'Run Payroll'}</span>
                  </button>

                  <button
                    id="nav-tab-duty-roster"
                    onClick={() => setActiveTab('dutyRoster')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'dutyRoster'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'dutyRoster' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <CalendarDays className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'డ్యూటీ రోస్టర్' : 'Duty Roster'}</span>
                  </button>

                  <button
                    id="nav-tab-office-locations"
                    onClick={() => setActiveTab('officeLocations')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'officeLocations'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'officeLocations' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'ఆఫీస్ స్థానాలు' : 'Office Locations'}</span>
                  </button>

                  <button
                    id="nav-tab-special-events"
                    onClick={() => setActiveTab('specialEvents')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'specialEvents'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'specialEvents' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'ప్రత్యేక ఈవెంట్‌లు' : 'Special Events'}</span>
                  </button>

                  <button
                    id="nav-tab-messages"
                    onClick={() => setActiveTab('messages')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'messages'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'messages' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'సందేశాలు' : 'Messages'}</span>
                  </button>

                  <button
                    id="nav-tab-admin-settings"
                    onClick={() => setActiveTab('adminSettings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'adminSettings'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'adminSettings' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Settings className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'సెట్టింగ్‌లు' : 'Settings'}</span>
                  </button>
                </>
              ) : (
                /* --- IF EMPLOYEE --- */
                <>
                  <button
                    id="nav-tab-dashboard"
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'dashboard' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Home className="w-4 h-4 shrink-0" />
                    )}
                    <span>{t.dashboard}</span>
                  </button>

                  <button
                    id="nav-tab-attendance"
                    onClick={() => setActiveTab('attendance')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'attendance'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'attendance' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 shrink-0" />
                    )}
                    <span>{t.attendance}</span>
                  </button>

                  <button
                    id="nav-tab-employee-missed-punches"
                    onClick={() => setActiveTab('employeeMissedPunches')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'employeeMissedPunches'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'employeeMissedPunches' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'నా మిస్ అయిన పంచ్ అభ్యర్థనలు' : 'Missed Punches'}</span>
                  </button>

                  <button
                    id="nav-tab-leave"
                    onClick={() => setActiveTab('leave')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'leave'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'leave' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" />
                    )}
                    <span>{t.leave}</span>
                  </button>

                  <button
                    id="nav-tab-advance"
                    onClick={() => setActiveTab('advance')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'advance'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'advance' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <IndianRupee className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'అడ్వాన్స్ అప్లై' : 'Salary Advance'}</span>
                  </button>

                  <button
                    id="nav-tab-payroll"
                    onClick={() => setActiveTab('payroll')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'payroll'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'payroll' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Landmark className="w-4 h-4 shrink-0" />
                    )}
                    <span>{t.payroll}</span>
                  </button>

                  <button
                    id="nav-tab-events"
                    onClick={() => setActiveTab('events')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'events'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'events' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'ప్రత్యేక ఈవెంట్‌లు' : 'Special Events'}</span>
                  </button>

                  <button
                    id="nav-tab-my-roster"
                    onClick={() => setActiveTab('myRoster')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'myRoster'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'myRoster' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <CalendarDays className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'డ్యూటీ రోస్టర్' : 'Duty Roster'}</span>
                  </button>

                  <button
                    id="nav-tab-messages"
                    onClick={() => setActiveTab('messages')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                      activeTab === 'messages'
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {activeTab === 'messages' ? (
                      <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                    ) : (
                      <MessageSquare className="w-4 h-4 shrink-0" />
                    )}
                    <span>{language === 'te' ? 'సందేశాలు' : 'Messages'}</span>
                  </button>
                </>
              )}

            </nav>

            {/* Aesthetic corporate disclaimer */}
            <div className="mt-8 pt-4 border-t border-slate-50 text-[10px] text-slate-400 font-medium text-center leading-relaxed">
              <HeartHandshake className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
              Empowering workforce through modern technology.
            </div>

          </div>
        </aside>

        {/* MAIN PANEL CONTENT WINDOW */}
        <main id="portal-primary-content" className="lg:col-span-9 print:col-span-12">
          <React.Suspense fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Module...</p>
            </div>
          }>
            {renderActiveModule()}
          </React.Suspense>
        </main>

      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION PANEL (Visible only on Mobile - Hidden during Print mode) */}
      <nav id="mobile-navigation" className="print:hidden lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] flex items-center overflow-x-auto px-4 py-1 gap-2 z-40 no-print hide-scrollbar">
        
        {currentUser.role === 'admin' ? (
          /* --- ADMIN MOBILE BUTTONS --- */
          <>
            <button
              onClick={() => setActiveTab('adminDashboard')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'adminDashboard' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'directory' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Roster</span>
            </button>

            <button
              onClick={() => setActiveTab('attendanceOverview')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'attendanceOverview' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Attend</span>
            </button>

            <button
              onClick={() => setActiveTab('leaveApprovals')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'leaveApprovals' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Leaves</span>
            </button>
            
            <button
              onClick={() => setActiveTab('adminMissedPunches')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'adminMissedPunches' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Mispunch</span>
            </button>

            <button
              onClick={() => setActiveTab('advanceApprovals')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'advanceApprovals' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <IndianRupee className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Advance</span>
            </button>

            <button
              onClick={() => setActiveTab('adminPayroll')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'adminPayroll' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Payroll</span>
            </button>

            <button
              onClick={() => setActiveTab('officeLocations')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'officeLocations' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Offices</span>
            </button>

            <button
              onClick={() => setActiveTab('specialEvents')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'specialEvents' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Events</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'messages' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('dutyRoster')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dutyRoster' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Duty</span>
            </button>

            <button
              onClick={() => setActiveTab('adminSettings')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'adminSettings' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Settings</span>
            </button>
          </>
        ) : (
          /* --- EMPLOYEE MOBILE BUTTONS --- */
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">{t.dashboard.slice(0, 5)}</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Attend</span>
            </button>

            <button
              onClick={() => setActiveTab('leave')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'leave' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Leave</span>
            </button>

            <button
              onClick={() => setActiveTab('employeeMissedPunches')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'employeeMissedPunches' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Mispunch</span>
            </button>

            <button
              onClick={() => setActiveTab('advance')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'advance' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <IndianRupee className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Advance</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'payroll' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Salary</span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'events' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Events</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'messages' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('myRoster')}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] h-12 rounded-xl transition-all cursor-pointer ${
                activeTab === 'myRoster' ? 'text-teal-600 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1 leading-none">Duty</span>
            </button>
          </>
        )}

      </nav>

      {/* Spacing compensation on mobile so bottom content is not clipped by bottom navigation */}
      <div className="h-16 lg:hidden no-print" />

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal 
          currentUser={currentUser} 
          onClose={() => setShowProfileModal(false)}
          onUpdatePassword={async (newPassword) => {
            await updateEmployee(currentUser.id, { password: newPassword });
          }}
          language={language}
        />
      )}
    </div>
  );
}
