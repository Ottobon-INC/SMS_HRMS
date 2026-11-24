import React from 'react';
import { Employee, Language, Task, PunchType, LeaveType, AdvanceType, RepaymentTimeline, PinType, LeaveBalance, Payslip } from '../../types';

// Lazy Loaded Modules with automatic retry on network/refresh hiccup
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | any>
) {
  return React.lazy(async () => {
    try {
      const res = await componentImport();
      sessionStorage.removeItem('chunk_reload_lock');
      return res;
    } catch (error) {
      console.warn("Retrying lazy module load:", error);
      await new Promise(res => setTimeout(res, 300));
      try {
        const res = await componentImport();
        sessionStorage.removeItem('chunk_reload_lock');
        return res;
      } catch (secondError) {
        console.error("Failed to load chunk after retry:", secondError);
        const lock = sessionStorage.getItem('chunk_reload_lock');
        if (!lock) {
          sessionStorage.setItem('chunk_reload_lock', 'true');
          window.location.reload();
        }
        throw secondError;
      }
    }
  });
}

const DashboardSnapshot = lazyWithRetry(() => import('../DashboardSnapshot'));
const AttendanceModule = lazyWithRetry(() => import('../AttendanceModule'));
const EmployeeMissedPunches = lazyWithRetry(() => import('../EmployeeMissedPunches'));
const FieldDutyModule = lazyWithRetry(() => import('../FieldDutyModule'));
const EmployeeSpecialEvents = lazyWithRetry(() => import('../EmployeeSpecialEvents'));
const EmployeeRoster = lazyWithRetry(() => import('../EmployeeRoster'));
const LeaveModule = lazyWithRetry(() => import('../LeaveModule'));
const AdvanceRequestModule = lazyWithRetry(() => import('../AdvanceRequestModule'));
const PayrollModule = lazyWithRetry(() => import('../PayrollModule'));
const AdminDashboard = lazyWithRetry(() => import('../AdminDashboard'));
const EmployeeDirectory = lazyWithRetry(() => import('../EmployeeDirectory'));
const AdminAttendance = lazyWithRetry(() => import('../AdminAttendance'));
const AdminMissedPunches = lazyWithRetry(() => import('../AdminMissedPunches'));
const FieldOpsModule = lazyWithRetry(() => import('../FieldOpsModule'));
const AdminLeaveApprovals = lazyWithRetry(() => import('../AdminLeaveApprovals'));
const AdminAdvanceApprovals = lazyWithRetry(() => import('../AdminAdvanceApprovals'));
const AdminPayroll = lazyWithRetry(() => import('../AdminPayroll'));
const AdminOfficeLocations = lazyWithRetry(() => import('../AdminOfficeLocations'));
const AdminSpecialEvents = lazyWithRetry(() => import('../AdminSpecialEvents'));
const MessagingModule = lazyWithRetry(() => import('../MessagingModule').then(m => ({ default: m.MessagingModule })));
const AdminSettings = lazyWithRetry(() => import('../AdminSettings'));
const DutyRosterModule = lazyWithRetry(() => import('../DutyRosterModule'));
const TaskModule = lazyWithRetry(() => import('../TaskModule'));
const AdminTaskManager = lazyWithRetry(() => import('../AdminTaskManager'));

interface AppRouterProps {
  activeTab: string;
  language: Language;
  currentUser: Employee;
  employees: Employee[];
  isLocalMode: boolean;
  tasks: Task[];
  noDataText: string;
  setActiveTab: (tab: string) => void;
  // Actions
  onToggleCheckIn: (userId: string, isCheckedIn: boolean, photoData?: string, punchType?: PunchType, punchNote?: string, statusOverride?: any) => Promise<any>;
  onAddPin: (employeeId: string, label: string, pinType?: PinType, photoUrl?: string) => Promise<any>;
  onApplyLeave: (empId: string, req: any) => Promise<void>;
  onApproveLeave: (reqId: string, note?: string) => Promise<void>;
  onRejectLeave: (reqId: string, note?: string) => Promise<void>;
  onDeleteLeave?: (reqId: string, empId?: string) => Promise<void>;
  onSubmitAdvance: (empId: string, amount: number, reason: string, repaymentMonths?: RepaymentTimeline, type?: AdvanceType) => Promise<void>;
  onApproveAdvance: (advId: string) => Promise<void>;
  onRejectAdvance: (advId: string) => Promise<void>;
  onAddEmployee: (emp: any) => Promise<void>;
  onUpdateEmployee: (id: string, fields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onUpdateBalances: (empId: string, balances: LeaveBalance) => Promise<void>;
  onUpdateAttendance: (employeeId: string, date: string, status: any, checkInTime?: string, checkOutTime?: string, sessionNumber?: number) => Promise<void>;
  onForceCloseSession: (employeeId: string, date: string, sessionNumber?: number) => Promise<void>;
  onRunBulkPayroll: (month: string) => Promise<void>;
  onGenerateSinglePayslip: (...args: any[]) => Promise<void>;
  onUpdatePayslip: (empId: string, payslip: Payslip) => Promise<void>;
  onCreateTask: (task: any) => Promise<void>;
  onUpdateTask: (id: string, updates: any) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTaskStatus: (id: string, status: any) => Promise<void>;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  activeTab,
  language,
  currentUser,
  employees,
  isLocalMode,
  tasks,
  noDataText,
  setActiveTab,
  onToggleCheckIn,
  onAddPin,
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onDeleteLeave,
  onSubmitAdvance,
  onApproveAdvance,
  onRejectAdvance,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateBalances,
  onUpdateAttendance,
  onForceCloseSession,
  onRunBulkPayroll,
  onGenerateSinglePayslip,
  onUpdatePayslip,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskStatus
}) => {
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
          onToggleCheckIn={(photoData?: string, punchType?: PunchType, punchNote?: string, statusOverride?: any) =>
            onToggleCheckIn(currentUser.id, currentUser.isCheckedIn, photoData, punchType, punchNote, statusOverride)
          }
          pins={currentUser.locationPins || []}
          onAddPin={onAddPin}
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
    case 'fieldDuty':
      return (
        <FieldDutyModule
          language={language}
          employeeId={currentUser.id}
          isLocalMode={isLocalMode}
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
          onApplyLeave={(type, fromDate, toDate, reason) =>
            onApplyLeave(currentUser.id, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })
          }
          onApproveLeave={onApproveLeave}
          onRejectLeave={onRejectLeave}
          onDeleteLeave={(reqId) => onDeleteLeave ? onDeleteLeave(reqId, currentUser.id) : undefined}
        />
      );
    case 'advance':
      return (
        <AdvanceRequestModule
          language={language}
          advanceRequests={currentUser.advanceRequests || []}
          onSubmitAdvance={(amount, reason, repaymentMonths, type) =>
            onSubmitAdvance(currentUser.id, amount, reason, repaymentMonths, type)
          }
          isEligible={
            (currentUser.experience || 0) >= 1 ||
            new Date(currentUser.joiningDate) <= new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
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
          attendanceRecords={currentUser.attendanceRecords || []}
          leaveRequests={currentUser.leaveRequests || []}
          missedPunchRequests={currentUser.missedPunchRequests || []}
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
          onAddEmployee={onAddEmployee}
          onUpdateEmployee={onUpdateEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onUpdatePayslip={onUpdatePayslip}
          onApproveEmployeeLeave={(_empId, reqId) => onApproveLeave(reqId)}
          onRejectEmployeeLeave={(_empId, reqId) => onRejectLeave(reqId)}
          onApplyEmployeeLeave={(empId, type, fromDate, toDate, reason) =>
            onApplyLeave(empId, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })
          }
          onUpdateLeaveBalances={onUpdateBalances}
        />
      );
    case 'attendanceOverview':
      return (
        <AdminAttendance
          language={language}
          employees={employees}
          onUpdateAttendance={onUpdateAttendance}
          onForceCloseSession={onForceCloseSession}
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
    case 'fieldOps':
      return (
        <FieldOpsModule
          language={language}
          isLocalMode={isLocalMode}
          employees={employees}
          adminId={currentUser.id}
        />
      );
    case 'leaveApprovals':
      return (
        <AdminLeaveApprovals
          language={language}
          employees={employees}
          onApproveLeave={(_empId, reqId, note) => onApproveLeave(reqId, note)}
          onRejectLeave={(_empId, reqId, note) => onRejectLeave(reqId, note)}
        />
      );
    case 'advanceApprovals':
      return (
        <AdminAdvanceApprovals
          language={language}
          employees={employees}
          onApprove={onApproveAdvance}
          onReject={onRejectAdvance}
        />
      );
    case 'adminPayroll':
      return (
        <AdminPayroll
          language={language}
          employees={employees}
          onRunBulkPayroll={onRunBulkPayroll}
          onGenerateSinglePayslip={onGenerateSinglePayslip}
          onUpdatePayslip={onUpdatePayslip}
          onUpdateEmployee={onUpdateEmployee}
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
    case 'tasks':
      return (
        <TaskModule
          language={language}
          currentUser={currentUser}
          employees={employees}
          tasks={tasks}
          onUpdateStatus={onUpdateTaskStatus}
        />
      );
    case 'adminTasks':
      return (
        <AdminTaskManager
          language={language}
          currentUser={currentUser}
          employees={employees}
          tasks={tasks}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onUpdateStatus={onUpdateTaskStatus}
        />
      );

    default:
      return (
        <div className="py-12 text-center text-slate-500 font-medium">
          {noDataText}
        </div>
      );
  }
};

export default AppRouter;
