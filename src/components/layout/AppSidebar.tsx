import React from 'react';
import {
  Home,
  Users,
  Calendar,
  Clock,
  Moon,
  IndianRupee,
  Landmark,
  CalendarDays,
  MapPin,
  MessageSquare,
  CheckSquare,
  Settings,
  HeartHandshake
} from 'lucide-react';
import { Employee, Language } from '../../types';

interface AppSidebarProps {
  currentUser: Employee;
  language: Language;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  dashboardLabel: string;
  attendanceLabel: string;
  leaveLabel: string;
  payrollLabel: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  language,
  activeTab,
  onSelectTab,
  dashboardLabel,
  attendanceLabel,
  leaveLabel,
  payrollLabel
}) => {
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const isAdmin = currentUser.role === 'admin';

  return (
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
              {isAdmin ? (language === 'te' ? 'అడ్మిన్' : 'Supervisor / Admin') : currentUser.designation}
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {isAdmin ? (
            /* --- ADMIN MENU ITEMS --- */
            <>
              <button
                id="nav-tab-admin-dashboard"
                onClick={() => onSelectTab('adminDashboard')}
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
                onClick={() => onSelectTab('directory')}
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
                onClick={() => onSelectTab('attendanceOverview')}
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
                onClick={() => onSelectTab('adminMissedPunches')}
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
                onClick={() => onSelectTab('leaveApprovals')}
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
                onClick={() => onSelectTab('advanceApprovals')}
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
                onClick={() => onSelectTab('adminPayroll')}
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
                onClick={() => onSelectTab('dutyRoster')}
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
                onClick={() => onSelectTab('officeLocations')}
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
                onClick={() => onSelectTab('specialEvents')}
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
                onClick={() => onSelectTab('messages')}
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
                id="nav-tab-field-ops"
                onClick={() => onSelectTab('fieldOps')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'fieldOps'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'fieldOps' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>{language === 'te' ? 'ఫీల్డ్ ఆపరేషన్స్' : 'Field Ops'}</span>
              </button>

              <button
                id="nav-tab-admin-tasks"
                onClick={() => onSelectTab('adminTasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminTasks'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminTasks' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                )}
                <span>{language === 'te' ? 'పని కేటాయింపు' : 'Work Assignment'}</span>
              </button>

              <button
                id="nav-tab-admin-settings"
                onClick={() => onSelectTab('adminSettings')}
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
            /* --- EMPLOYEE MENU ITEMS --- */
            <>
              <button
                id="nav-tab-dashboard"
                onClick={() => onSelectTab('dashboard')}
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
                <span>{dashboardLabel}</span>
              </button>

              <button
                id="nav-tab-field-duty"
                onClick={() => onSelectTab('fieldDuty')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'fieldDuty'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'fieldDuty' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>{language === 'te' ? 'ఫీల్డ్ డ్యూటీ' : 'Field Duty'}</span>
              </button>

              <button
                id="nav-tab-attendance"
                onClick={() => onSelectTab('attendance')}
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
                <span>{attendanceLabel}</span>
              </button>

              <button
                id="nav-tab-employee-missed-punches"
                onClick={() => onSelectTab('employeeMissedPunches')}
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
                onClick={() => onSelectTab('leave')}
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
                <span>{leaveLabel}</span>
              </button>

              <button
                id="nav-tab-advance"
                onClick={() => onSelectTab('advance')}
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
                onClick={() => onSelectTab('payroll')}
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
                <span>{payrollLabel}</span>
              </button>

              <button
                id="nav-tab-events"
                onClick={() => onSelectTab('events')}
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
                onClick={() => onSelectTab('myRoster')}
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
                id="nav-tab-tasks"
                onClick={() => onSelectTab('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'tasks' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                )}
                <span>{language === 'te' ? 'పని కేటాయింపు' : 'Work Assignment'}</span>
              </button>

              <button
                id="nav-tab-messages"
                onClick={() => onSelectTab('messages')}
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
  );
};

export default AppSidebar;
