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
  experience?: number;
}

export type Language = 'en' | 'te';

export interface CheckInLog {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  checkOutTime: string | null; // HH:MM:SS
  totalHours: number | null; // Decimal hours
  checkInLocation?: string; // e.g. "Visakhapatnam, AP"
  checkInLatLng?: string; // e.g. "17.7,83.3"
  photoUrl?: string; // base64 photo data
}

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  photoUrl?: string;
}

export type LeaveType = 'sick' | 'casual' | 'maternity' | 'paternity';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
}

export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'deducted';

export interface AdvanceRequest {
  id: string;
  amount: number;
  reason: string;
  status: AdvanceStatus;
  submittedAt: string; // ISO date string
  approvedAt?: string;
  deductedInMonth?: string; // YYYY-MM
}

export interface LeaveBalance {
  sick: { allowed: number; taken: number };
  casual: { allowed: number; taken: number };
  maternity?: { allowed: number; taken: number };
  paternity?: { allowed: number; taken: number };
}

export interface Allowance {
  nameKey: string; // translation key or plain string
  amount: number;
}

export interface Deduction {
  nameKey: string; // translation key or plain string
  amount: number;
}

export interface Payslip {
  id: string;
  month: string; // YYYY-MM (e.g. 2026-06)
  basicPay: number;
  allowances: Allowance[];
  deductions: Deduction[];
  advanceMoneyTaken?: boolean;
  advanceMoneyAmount?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  senderName: string;
  senderDetails: string;
  clientName: string;
  clientDetails: string;
  items: InvoiceItem[];
  taxPercent: number;
}
