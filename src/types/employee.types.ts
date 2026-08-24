import { LeaveBalance, LeaveRequest, MonthlyLeaveQuota } from './leave.types';
import { AttendanceRecord, CheckInLog } from './attendance.types';
import { Payslip } from './payroll.types';
import { AdvanceRequest } from './advance.types';
import { LocationPin } from './location.types';
import { DutyRosterShift } from './roster.types';

export interface BankDetails {
  accountNumber: string;
  bankName: string;
  ifsc: string;
  accountType?: 'savings' | 'current';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
  joiningDate: string;
  basicSalary: number;
  role: 'employee' | 'admin';
  password?: string;
  status: 'active' | 'inactive';
  phone?: string;
  isCheckedIn: boolean;
  leaveBalance: LeaveBalance;
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  checkInLogs: CheckInLog[];
  payslips: Payslip[];
  advanceRequests: AdvanceRequest[];
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  experience?: number;
  monthlyQuota?: MonthlyLeaveQuota;
  locationPins?: LocationPin[];
  shifts?: DutyRosterShift[];
  bankDetails?: BankDetails;
}
