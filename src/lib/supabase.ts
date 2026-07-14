import { createClient } from '@supabase/supabase-js';
import { Employee, LeaveRequest, AttendanceRecord, CheckInLog, Payslip, Invoice, LeaveBalance, LeaveType, LeaveStatus, AttendanceStatus } from '../types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || "https://rkvsmpzghtjusqpfzybt.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "sb_publishable_q-KLHu3f52HTWZ_5K8SEvA_ah2wVGvW";


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to convert DB employee and relations into frontend Employee object
export async function fetchAllEmployeesData(): Promise<Employee[]> {
  // 1. Fetch all basic employees
  const { data: emps, error: empError } = await supabase
    .from('HRMS_employees')
    .select('*')
    .order('id', { ascending: true });

  if (empError) throw empError;
  if (!emps) return [];

  // 2. Fetch all other related tables
  const { data: att, error: attError } = await supabase.from('HRMS_attendance').select('*');
  const { data: leaves, error: leavesError } = await supabase.from('HRMS_leave_requests').select('*');
  const { data: balances, error: balError } = await supabase.from('HRMS_leave_balances').select('*');
  const { data: payroll, error: payError } = await supabase.from('HRMS_payroll').select('*');

  if (attError) console.error('Error fetching attendance:', attError);
  if (leavesError) console.error('Error fetching leave_requests:', leavesError);
  if (balError) console.error('Error fetching leave_balances:', balError);
  if (payError) console.error('Error fetching payroll:', payError);

  const attendanceList = att || [];
  const leavesList = leaves || [];
  const balancesList = balances || [];
  const payrollList = payroll || [];

  return emps.map(emp => {
    // Map leave balances
    const empBalances = balancesList.filter(b => b.employee_id === emp.id);
    const leaveBalance: LeaveBalance = {
      sick: { allowed: 6, taken: 0 },
      casual: { allowed: 8, taken: 0 },
      earned: { allowed: 15, taken: 0 },
      unpaid: { allowed: 30, taken: 0 }
    };
    empBalances.forEach(b => {
      const type = b.leave_type as LeaveType;
      if (leaveBalance[type]) {
        leaveBalance[type] = {
          allowed: b.total_allotted,
          taken: b.used
        };
      }
    });

    // Map leave requests
    const empLeaves: LeaveRequest[] = leavesList
      .filter(l => l.employee_id === emp.id)
      .map(l => ({
        id: l.id,
        type: l.leave_type as LeaveType,
        fromDate: l.from_date,
        toDate: l.to_date,
        reason: l.reason,
        status: (l.status as string).toLowerCase() as LeaveStatus,
        submittedAt: l.submitted_at || l.from_date
      }));

    // Map attendance records and check-in logs
    const empAtt = attendanceList.filter(a => a.employee_id === emp.id);
    const attendanceRecords: AttendanceRecord[] = empAtt.map(a => ({
      date: a.date,
      status: (a.status || 'present').toLowerCase() as AttendanceStatus,
      note: a.check_in_time ? `Checked In: ${a.check_in_time}` : undefined
    }));

    const checkInLogs: CheckInLog[] = empAtt
      .filter(a => a.check_in_time)
      .map(a => {
        let totalHours: number | null = null;
        if (a.check_in_time && a.check_out_time) {
          try {
            const [h1, m1, s1] = a.check_in_time.split(':').map(Number);
            const [h2, m2, s2] = a.check_out_time.split(':').map(Number);
            const diffMs = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
            totalHours = diffMs > 0 ? parseFloat((diffMs / 3600).toFixed(2)) : 0;
          } catch (e) {
            totalHours = null;
          }
        }
        return {
          id: a.id,
          date: a.date,
          checkInTime: a.check_in_time,
          checkOutTime: a.check_out_time,
          totalHours
        };
      });

    // Determine check-in status for today (using local/current date)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = empAtt.find(a => a.date === todayStr);
    const isCheckedIn = !!(todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time);

    // Map payslips
    const empPayslips: Payslip[] = payrollList
      .filter(p => p.employee_id === emp.id)
      .map(p => ({
        id: p.id,
        month: p.month,
        basicPay: Number(p.basic_pay),
        allowances: Array.isArray(p.allowances) ? p.allowances : [],
        deductions: Array.isArray(p.deductions) ? p.deductions : []
      }));

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      designation: emp.designation,
      joiningDate: emp.joining_date,
      basicSalary: Number(emp.basic_pay),
      role: emp.role as 'employee' | 'admin',
      password: emp.password,
      status: (emp.status || 'active') as 'active' | 'inactive',
      phone: emp.phone,
      isCheckedIn,
      leaveBalance,
      leaveRequests: empLeaves,
      attendanceRecords,
      checkInLogs,
      payslips: empPayslips
    };
  });
}

// Fetch Invoices
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('HRMS_invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    issueDate: inv.created_at ? inv.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: inv.due_date || new Date().toISOString().split('T')[0],
    senderName: 'SMS Diagnostics',
    senderDetails: '#18-1-30/9, Opp. KGH OP Gate, Aditya Complex, Vishakapatnam-02\nPhone: 9059331954 / 08912751954\nEmail: info@smslabs.in / ops@dlabsfield.in\nWebsite: www.smslabs.in',
    clientName: inv.client_name,
    clientDetails: inv.client_details,
    items: Array.isArray(inv.items) ? inv.items : [],
    taxPercent: inv.tax_percent !== undefined ? inv.tax_percent : 18
  }));
}

// Save Invoice
export async function saveInvoiceToSupabase(invoice: Omit<Invoice, 'id'> & { id?: string }, adminId: string): Promise<Invoice> {
  const payload = {
    invoice_number: invoice.invoiceNumber,
    client_name: invoice.clientName,
    client_details: invoice.clientDetails,
    items: invoice.items,
    total: invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    payable_amount: invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * (1 + (invoice.taxPercent / 100)),
    created_by: adminId,
    due_date: invoice.dueDate,
    tax_percent: invoice.taxPercent
  };

  if (invoice.id && invoice.id !== 'new' && !invoice.id.startsWith('temp-')) {
    const { data, error } = await supabase
      .from('HRMS_invoices')
      .update(payload)
      .eq('id', invoice.id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...invoice,
      id: data.id
    };
  } else {
    const { data, error } = await supabase
      .from('HRMS_invoices')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return {
      ...invoice,
      id: data.id,
      issueDate: data.created_at ? data.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    };
  }
}

// Delete Invoice
export async function deleteInvoiceFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Clock-In
export async function clockInEmployee(empId: string): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  // Check if check-in already exists for today
  const { data: existing } = await supabase
    .from('HRMS_attendance')
    .select('id')
    .eq('employee_id', empId)
    .eq('date', todayStr)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('HRMS_attendance')
      .update({
        check_in_time: timeStr,
        status: 'Present'
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_attendance')
      .insert([{
        employee_id: empId,
        date: todayStr,
        status: 'Present',
        check_in_time: timeStr
      }]);
    if (error) throw error;
  }
}

// Clock-Out
export async function clockOutEmployee(empId: string): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  const { data: existing, error: fetchErr } = await supabase
    .from('HRMS_attendance')
    .select('id')
    .eq('employee_id', empId)
    .eq('date', todayStr)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    const { error } = await supabase
      .from('HRMS_attendance')
      .update({
        check_out_time: timeStr
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // If they checked out without checking in, create a record
    const { error } = await supabase
      .from('HRMS_attendance')
      .insert([{
        employee_id: empId,
        date: todayStr,
        status: 'Present',
        check_out_time: timeStr
      }]);
    if (error) throw error;
  }
}

// Submit Leave Request
export async function submitLeaveRequest(empId: string, leave: Omit<LeaveRequest, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('HRMS_leave_requests')
    .insert([{
      employee_id: empId,
      leave_type: leave.type,
      from_date: leave.fromDate,
      to_date: leave.toDate,
      reason: leave.reason,
      status: 'Pending'
    }]);

  if (error) throw error;
}

// Approve/Reject Leave Request
export async function updateLeaveRequestStatus(requestId: string, status: 'Approved' | 'Rejected', adminNote?: string): Promise<void> {
  // First, get the request details to see the type and employee_id to adjust balances if Approved
  const { data: request, error: fetchErr } = await supabase
    .from('HRMS_leave_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from('HRMS_leave_requests')
    .update({
      status: status,
      admin_note: adminNote || ''
    })
    .eq('id', requestId);

  if (error) throw error;

  // If approved, update the leave balances used count
  if (status === 'Approved' && request) {
    const from = new Date(request.from_date);
    const to = new Date(request.to_date);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;

    // Get current balance
    const { data: balance, error: balErr } = await supabase
      .from('HRMS_leave_balances')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('leave_type', request.leave_type)
      .maybeSingle();

    if (balance) {
      await supabase
        .from('HRMS_leave_balances')
        .update({
          used: Number(balance.used || 0) + diffDays
        })
        .eq('id', balance.id);
    } else {
      await supabase
        .from('HRMS_leave_balances')
        .insert([{
          employee_id: request.employee_id,
          leave_type: request.leave_type,
          total_allotted: request.leave_type === 'sick' ? 6 : request.leave_type === 'casual' ? 8 : request.leave_type === 'earned' ? 15 : 30,
          used: diffDays
        }]);
    }

    // Also insert leave days into attendance records!
    let current = new Date(from);
    const end = new Date(to);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      // Check if attendance record exists
      const { data: att } = await supabase
        .from('HRMS_attendance')
        .select('id')
        .eq('employee_id', request.employee_id)
        .eq('date', dateStr)
        .maybeSingle();

      if (att) {
        await supabase
          .from('HRMS_attendance')
          .update({ status: 'Leave' })
          .eq('id', att.id);
      } else {
        await supabase
          .from('HRMS_attendance')
          .insert([{
            employee_id: request.employee_id,
            date: dateStr,
            status: 'Leave'
          }]);
      }
      current.setDate(current.getDate() + 1);
    }
  }
}

// Generate single payroll / payslip
export async function savePayslipToSupabase(empId: string, payslip: Payslip): Promise<void> {
  const netPay = payslip.basicPay + 
    payslip.allowances.reduce((sum, a) => sum + a.amount, 0) - 
    payslip.deductions.reduce((sum, d) => sum + d.amount, 0);

  // Check if payroll already exists for this employee and month
  const { data: existing } = await supabase
    .from('HRMS_payroll')
    .select('id')
    .eq('employee_id', empId)
    .eq('month', payslip.month)
    .maybeSingle();

  const payload = {
    employee_id: empId,
    month: payslip.month,
    basic_pay: payslip.basicPay,
    allowances: payslip.allowances,
    deductions: payslip.deductions,
    net_pay: netPay
  };

  if (existing) {
    const { error } = await supabase
      .from('HRMS_payroll')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_payroll')
      .insert([payload]);
    if (error) throw error;
  }
}

// Bulk generate payroll for a month
export async function runBulkPayrollForMonth(employees: Employee[], month: string): Promise<void> {
  for (const emp of employees) {
    // Generate simple standard payslip
    const basic = emp.basicSalary;
    const allowances = [
      { nameKey: 'hra', amount: Math.round(basic * 0.4) },
      { nameKey: 'medicalAllow', amount: 3000 },
      { nameKey: 'conveyanceAllow', amount: 4000 }
    ];
    const deductions = [
      { nameKey: 'providentFund', amount: Math.round(basic * 0.12) },
      { nameKey: 'professionalTax', amount: 200 },
      { nameKey: 'incomeTax', amount: Math.round(basic * 0.07) }
    ];

    const payslip: Payslip = {
      id: `PS-${emp.id}-${month}`,
      month,
      basicPay: basic,
      allowances,
      deductions
    };

    await savePayslipToSupabase(emp.id, payslip);
  }
}

// Create new employee
export async function createEmployeeInSupabase(emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .insert([{
      id: emp.id,
      name: emp.name,
      email: emp.email,
      password: emp.password || 'password',
      role: emp.role,
      designation: emp.designation,
      joining_date: emp.joiningDate,
      basic_pay: emp.basicSalary
    }]);

  if (error) throw error;

  // Pre-populate leave balances
  const initialBalances = [
    { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: 0 },
    { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: 0 },
    { employee_id: emp.id, leave_type: 'earned', total_allotted: 15, used: 0 },
    { employee_id: emp.id, leave_type: 'unpaid', total_allotted: 30, used: 0 }
  ];

  await supabase.from('HRMS_leave_balances').insert(initialBalances);
}

// Update existing employee fields
export async function updateEmployeeInSupabase(id: string, fields: Partial<Employee>): Promise<void> {
  const updatePayload: any = {};
  if (fields.name !== undefined) updatePayload.name = fields.name;
  if (fields.email !== undefined) updatePayload.email = fields.email;
  if (fields.designation !== undefined) updatePayload.designation = fields.designation;
  if (fields.joiningDate !== undefined) updatePayload.joining_date = fields.joiningDate;
  if (fields.basicSalary !== undefined) updatePayload.basic_pay = fields.basicSalary;
  if (fields.role !== undefined) updatePayload.role = fields.role;
  if (fields.password !== undefined) updatePayload.password = fields.password;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from('HRMS_employees')
      .update(updatePayload)
      .eq('id', id);
    if (error) throw error;
  }
}

// Database Seeding Script (can be called if tables are empty to populate the platform instantly!)
export async function seedInitialDatabase() {
  // 1. Core Employees
  const employeesToSeed: any[] = [];

  // Check if employees exist
  const { count } = await supabase
    .from('HRMS_employees')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    // Insert employees
    const { error: empErr } = await supabase.from('HRMS_employees').insert(employeesToSeed);
    if (empErr) console.error('Error seeding employees:', empErr);

    // Seed leave balances
    const leaveBalancesToSeed: any[] = [];
    employeesToSeed.forEach(emp => {
      leaveBalancesToSeed.push(
        { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: emp.id === 'EMP-2026-089' ? 2 : emp.id === 'EMP-2026-112' ? 1 : 0 },
        { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: emp.id === 'EMP-2026-089' ? 3 : emp.id === 'EMP-2026-112' ? 1 : emp.id === 'EMP-2026-145' ? 2 : 0 },
        { employee_id: emp.id, leave_type: 'earned', total_allotted: 15, used: emp.id === 'EMP-2026-089' ? 4 : emp.id === 'EMP-2026-112' ? 2 : 0 },
        { employee_id: emp.id, leave_type: 'unpaid', total_allotted: 30, used: emp.id === 'EMP-2026-145' ? 1 : 0 }
      );
    });
    await supabase.from('HRMS_leave_balances').insert(leaveBalancesToSeed);

    // Seed leave requests
    const leaveRequestsToSeed = [
      {
        employee_id: 'EMP-2026-089',
        leave_type: 'sick',
        from_date: '2026-06-05',
        to_date: '2026-06-06',
        reason: 'Suffering from viral fever and cold.',
        status: 'Approved'
      },
      {
        employee_id: 'EMP-2026-089',
        leave_type: 'casual',
        from_date: '2026-06-22',
        to_date: '2026-06-23',
        reason: 'Attending family function in hometown.',
        status: 'Approved'
      },
      {
        employee_id: 'EMP-2026-089',
        leave_type: 'earned',
        from_date: '2026-07-20',
        to_date: '2026-07-24',
        reason: 'Planned vacation with family.',
        status: 'Pending'
      },
      {
        employee_id: 'EMP-2026-112',
        leave_type: 'sick',
        from_date: '2026-06-12',
        to_date: '2026-06-12',
        reason: 'Severe migraine headache.',
        status: 'Approved'
      }
    ];
    await supabase.from('HRMS_leave_requests').insert(leaveRequestsToSeed);

    // Seed attendance
    const attendanceToSeed = [
      { employee_id: 'EMP-2026-089', date: '2026-07-13', status: 'Present', check_in_time: '09:05:22', check_out_time: '18:12:45' },
      { employee_id: 'EMP-2026-112', date: '2026-07-13', status: 'Present', check_in_time: '08:58:34' }
    ];
    await supabase.from('HRMS_attendance').insert(attendanceToSeed);

    // Seed payroll
    const payrollToSeed = [
      {
        employee_id: 'EMP-2026-089',
        month: '2026-06',
        basic_pay: 45000,
        allowances: [
          { nameKey: 'hra', amount: 18000 },
          { nameKey: 'medicalAllow', amount: 3000 },
          { nameKey: 'conveyanceAllow', amount: 4000 }
        ],
        deductions: [
          { nameKey: 'providentFund', amount: 5400 },
          { nameKey: 'professionalTax', amount: 200 },
          { nameKey: 'incomeTax', amount: 3200 }
        ],
        net_pay: 58200
      }
    ];
    await supabase.from('HRMS_payroll').insert(payrollToSeed);

    // Seed invoices
    const invoicesToSeed = [
      {
        invoice_number: 'INV-2026-042',
        client_name: 'Apollo Corporate Health Services',
        client_details: 'Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days',
        items: [
          { id: '1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 },
          { id: '2', description: 'On-site Medical Officer Charge - Contract Staffing', quantity: 22, rate: 3500 },
          { id: '3', description: 'Administrative Support & Payroll Management Fee', quantity: 1, rate: 15000 }
        ],
        total: 212000,
        payable_amount: 250160,
        tax_percent: 18,
        due_date: '2026-07-25'
      }
    ];
    await supabase.from('HRMS_invoices').insert(invoicesToSeed);
  }
}
