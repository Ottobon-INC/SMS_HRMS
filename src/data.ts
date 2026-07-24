import { AttendanceRecord, LeaveBalance, LeaveRequest, Payslip, Invoice } from './types';

export const initialLeaveBalance: LeaveBalance = {
  sick: { allowed: 6, taken: 2 },
  casual: { allowed: 8, taken: 3 }
};

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'LV-1001',
    type: 'sick',
    fromDate: '2026-06-05',
    toDate: '2026-06-06',
    reason: 'Suffering from viral fever and cold.',
    status: 'approved',
    submittedAt: '2026-06-04'
  },
  {
    id: 'LV-1002',
    type: 'casual',
    fromDate: '2026-06-22',
    toDate: '2026-06-23',
    reason: 'Attending family function in hometown.',
    status: 'approved',
    submittedAt: '2026-06-18'
  },
  {
    id: 'LV-1003',
    type: 'monthly',
    fromDate: '2026-07-20',
    toDate: '2026-07-24',
    reason: 'Planned vacation with family.',
    status: 'pending',
    submittedAt: '2026-07-10'
  },
  {
    id: 'LV-1004',
    type: 'casual',
    fromDate: '2026-07-02',
    toDate: '2026-07-02',
    reason: 'Personal urgent bank work.',
    status: 'rejected',
    submittedAt: '2026-07-01'
  }
];

// Current local time: 2026-07-13.
// Generate calendar records for June and July 2026.
export const generateMockAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  
  // June 2026 (30 days)
  for (let d = 1; d <= 30; d++) {
    const dateStr = `2026-06-${d < 10 ? '0' + d : d}`;
    const dayOfWeek = new Date(2026, 5, d).getDay(); // June is index 5
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      records.push({ date: dateStr, status: 'holiday', note: 'Weekend' });
    } else if (d === 5 || d === 6) {
      records.push({ date: dateStr, status: 'leave', note: 'Sick Leave Approved' });
    } else if (d === 22 || d === 23) {
      records.push({ date: dateStr, status: 'leave', note: 'Casual Leave Approved' });
    } else if (d === 15) {
      records.push({ date: dateStr, status: 'half-day', note: 'Left early for doctor checkup' });
    } else if (d === 18) {
      records.push({ date: dateStr, status: 'absent', note: 'No show / Forgot check-in' });
    } else {
      records.push({ date: dateStr, status: 'present' });
    }
  }

  // July 2026 (up to July 13th)
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2026-07-${d < 10 ? '0' + d : d}`;
    const dayOfWeek = new Date(2026, 6, d).getDay(); // July is index 6
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      records.push({ date: dateStr, status: 'holiday', note: 'Weekend' });
    } else if (d < 13) {
      // Past days in July
      if (d === 2) {
        records.push({ date: dateStr, status: 'absent', note: 'Leave request rejected' });
      } else {
        records.push({ date: dateStr, status: 'present' });
      }
    } else if (d === 13) {
      // Today (Let's make it present by default or empty so check-in triggers it!)
      records.push({ date: dateStr, status: 'present', note: 'Checked in today' });
    } else {
      // Future days - blank or default to present for display or handled in component
    }
  }

  return records;
};

export const initialPayslips: Payslip[] = [
  {
    id: 'PS-2026-06',
    month: '2026-06',
    basicPay: 45000,
    allowances: [
      { nameKey: 'hra', amount: 18000 },
      { nameKey: 'medicalAllow', amount: 3000 },
      { nameKey: 'conveyanceAllow', amount: 4000 }
    ],
    deductions: [
      { nameKey: 'providentFund', amount: 5400 },
      { nameKey: 'professionalTax', amount: 200 },
      { nameKey: 'incomeTax', amount: 3200 }
    ]
  },
  {
    id: 'PS-2026-05',
    month: '2026-05',
    basicPay: 45000,
    allowances: [
      { nameKey: 'hra', amount: 18000 },
      { nameKey: 'medicalAllow', amount: 3000 },
      { nameKey: 'conveyanceAllow', amount: 4000 }
    ],
    deductions: [
      { nameKey: 'providentFund', amount: 5400 },
      { nameKey: 'professionalTax', amount: 200 },
      { nameKey: 'incomeTax', amount: 2900 }
    ]
  },
  {
    id: 'PS-2026-04',
    month: '2026-04',
    basicPay: 45000,
    allowances: [
      { nameKey: 'hra', amount: 18000 },
      { nameKey: 'medicalAllow', amount: 3000 },
      { nameKey: 'conveyanceAllow', amount: 4000 }
    ],
    deductions: [
      { nameKey: 'providentFund', amount: 5400 },
      { nameKey: 'professionalTax', amount: 200 },
      { nameKey: 'incomeTax', amount: 3000 }
    ]
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'INV-2026-001',
    invoiceNumber: 'INV-2026-042',
    issueDate: '2026-07-10',
    dueDate: '2026-07-25',
    senderName: 'SMS Diagnostics',
    senderDetails: '#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in',
    clientName: 'Apollo Corporate Health Services',
    clientDetails: 'Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days',
    items: [
      { id: '1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 },
      { id: '2', description: 'On-site Medical Officer Charge - Contract Staffing', quantity: 22, rate: 3500 },
      { id: '3', description: 'Administrative Support & Payroll Management Fee', quantity: 1, rate: 15000 }
    ],
    taxPercent: 18
  },
  {
    id: 'INV-2026-002',
    invoiceNumber: 'INV-2026-043',
    issueDate: '2026-07-12',
    dueDate: '2026-07-27',
    senderName: 'SMS Diagnostics',
    senderDetails: '#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in',
    clientName: 'Vibrant Tech Solutions Ltd',
    clientDetails: 'Tower B, Tech Hub, Madhurawada, Visakhapatnam - 530041\nAttn: HR & Finance Department\nPayment Term: Net 15 Days',
    items: [
      { id: '1', description: 'Corporate Employee Annual Wellness Medical Contract', quantity: 150, rate: 850 },
      { id: '2', description: 'Industrial Hygiene Advisory & Consulting Service', quantity: 1, rate: 25000 }
    ],
    taxPercent: 18
  }
];

export const initialEmployees = [
  {
    id: 'EMP-2026-089',
    name: 'Ravi Kumar',
    email: 'ravi@vibrant.com',
    password: 'password',
    designation: 'Developer',
    joiningDate: '2025-03-10',
    basicSalary: 45000,
    role: 'employee',
    isCheckedIn: false,
    leaveBalance: { ...initialLeaveBalance },
    leaveRequests: [ ...initialLeaveRequests ],
    attendanceRecords: generateMockAttendance(),
    checkInLogs: [
      {
        id: 'CI-1001',
        date: '2026-07-10',
        checkInTime: '09:05:12',
        checkOutTime: '18:12:45',
        totalHours: 9.13
      }
    ],
    payslips: [ ...initialPayslips ]
  },
  {
    id: 'EMP-2026-112',
    name: 'Ananya Reddy',
    email: 'ananya@vibrant.com',
    password: 'password',
    designation: 'UX Designer',
    joiningDate: '2025-06-15',
    basicSalary: 50000,
    role: 'employee',
    isCheckedIn: true,
    leaveBalance: {
      sick: { allowed: 6, taken: 1 },
      casual: { allowed: 8, taken: 1 },
      earned: { allowed: 15, taken: 2 },
      unpaid: { allowed: 30, taken: 0 }
    },
    leaveRequests: [
      {
        id: 'LV-2001',
        type: 'sick',
        fromDate: '2026-06-12',
        toDate: '2026-06-12',
        reason: 'Severe migraine headache.',
        status: 'approved',
        submittedAt: '2026-06-12'
      },
      {
        id: 'LV-2002',
        type: 'earned',
        fromDate: '2026-07-27',
        toDate: '2026-07-29',
        reason: 'Family shifting to new apartment.',
        status: 'pending',
        submittedAt: '2026-07-12'
      }
    ],
    attendanceRecords: generateMockAttendance().map(r => {
      if (r.date === '2026-06-05' || r.date === '2026-06-06') {
        return { ...r, status: 'present', note: undefined };
      }
      if (r.date === '2026-06-12') {
        return { ...r, status: 'leave', note: 'Sick Leave Approved' };
      }
      return r;
    }),
    checkInLogs: [
      {
        id: 'CI-2001',
        date: '2026-07-13',
        checkInTime: '08:58:34',
        checkOutTime: null,
        totalHours: null
      }
    ],
    payslips: initialPayslips.map(ps => ({
      ...ps,
      basicPay: 50000,
      allowances: ps.allowances.map(a => a.nameKey === 'hra' ? { ...a, amount: 20000 } : a)
    }))
  },
  {
    id: 'EMP-2026-145',
    name: 'Srinivas Rao',
    email: 'srinivas@vibrant.com',
    password: 'password',
    designation: 'QA Engineer',
    joiningDate: '2026-01-20',
    basicSalary: 40000,
    role: 'employee',
    isCheckedIn: false,
    leaveBalance: {
      sick: { allowed: 6, taken: 0 },
      casual: { allowed: 8, taken: 2 },
      earned: { allowed: 15, taken: 0 },
      unpaid: { allowed: 30, taken: 1 }
    },
    leaveRequests: [
      {
        id: 'LV-3001',
        type: 'casual',
        fromDate: '2026-07-06',
        toDate: '2026-07-07',
        reason: 'Urgent medical appointment for parents.',
        status: 'approved',
        submittedAt: '2026-07-04'
      }
    ],
    attendanceRecords: generateMockAttendance().map(r => {
      if (r.date === '2026-06-05' || r.date === '2026-06-06' || r.date === '2026-06-22' || r.date === '2026-06-23') {
        return { ...r, status: 'present', note: undefined };
      }
      if (r.date === '2026-07-06' || r.date === '2026-07-07') {
        return { ...r, status: 'leave', note: 'Casual Leave Approved' };
      }
      return r;
    }),
    checkInLogs: [],
    payslips: initialPayslips.map(ps => ({
      ...ps,
      basicPay: 40000,
      allowances: ps.allowances.map(a => a.nameKey === 'hra' ? { ...a, amount: 16000 } : a)
    }))
  },
  {
    id: 'ADM-2026-001',
    name: 'Ramesh Rao',
    email: 'ramesh@vibrant.com',
    password: 'password',
    designation: 'Supervisor',
    joiningDate: '2024-01-01',
    basicSalary: 75000,
    role: 'admin',
    isCheckedIn: false,
    leaveBalance: {
      sick: { allowed: 10, taken: 0 },
      casual: { allowed: 10, taken: 0 },
      earned: { allowed: 20, taken: 0 },
      unpaid: { allowed: 30, taken: 0 }
    },
    leaveRequests: [],
    attendanceRecords: generateMockAttendance().map(r => ({ ...r, status: 'present' })),
    checkInLogs: [],
    payslips: []
  }
];

