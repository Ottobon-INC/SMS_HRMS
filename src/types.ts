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

export interface BankDetails {
  accountNumber: string;
  bankName: string;
  ifsc: string;
  accountType?: 'savings' | 'current';
}

export type Language = 'en' | 'te';
export type PunchType = 'in_office' | 'out_of_office';
export type PinType = 'field_visit' | 'medical_camp' | 'client_site' | 'delivery' | 'other';
export type RepaymentTimeline = 2 | 3 | 5;

export interface LocationPin {
  id: string;
  date: string;           // YYYY-MM-DD
  pinnedAt: string;       // HH:MM:SS
  label?: string;         // user-typed note
  latitude?: number;
  longitude?: number;
  locationName?: string;  // reverse geocoded
  photoUrl?: string;
  pinType: PinType;
}

export interface DutyRosterShift {
  id: string;
  employeeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  shiftLabel?: string;
  notes?: string;
  isPublished: boolean;
}

export interface CheckInLog {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  checkOutTime: string | null; // HH:MM:SS
  totalHours: number | null; // Decimal hours
  checkInLocation?: string; // e.g. "Visakhapatnam, AP"
  checkInLatLng?: string; // e.g. "17.7,83.3"
  photoUrl?: string; // base64 photo data
  checkOutLocation?: string;
  checkOutLatLng?: string;
  checkOutPhotoUrl?: string; // check-out photo
  punchType?: PunchType; // 'in_office' | 'out_of_office'
  punchNote?: string;
  sessionNumber?: number;
}


export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday';

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  photoUrl?: string;
  punchNote?: string;
}

export type LeaveType = 'sick' | 'casual' | 'maternity' | 'paternity' | 'monthly';
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
export type AdvanceType = 'salary' | 'medical';

export interface AdvanceRequest {
  id: string;
  advanceType?: AdvanceType;
  amount: number;
  reason: string;
  status: AdvanceStatus;
  submittedAt: string; // ISO date string
  approvedAt?: string;
  deductedInMonth?: string; // YYYY-MM
  repaymentMonths?: RepaymentTimeline; // 2 | 3 | 5
  monthlyInstallment?: number; // amount / repaymentMonths
  installmentsRemaining?: number; // countdown: starts at repaymentMonths, decrements each payroll
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
  workingDays?: number;
  daysPresent?: number;
  leavesTaken?: number;
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

export interface MonthlyLeaveQuota {
  id: string;
  month: string;       // "2026-07"
  allotted: number;    // always 3
  used: number;
  remaining: number;   // computed: allotted - used
}

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface SpecialLocationEvent {
  id: string;
  name: string;
  eventType: 'medical_camp' | 'client_site' | 'training' | 'other';
  latitude: number;
  longitude: number;
  radius_meters: number;
  fromDate: string;
  toDate: string;
}
