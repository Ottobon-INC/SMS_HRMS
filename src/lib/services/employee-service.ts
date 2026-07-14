import { supabase } from '../supabase-client';
import { Employee, LeaveBalance, LeaveType, LeaveStatus, AttendanceRecord, AttendanceStatus, CheckInLog, Payslip } from '../../types';

export async function fetchAllEmployeesData(): Promise<Employee[]> {
  const { data: emps, error: empError } = await supabase
    .from('HRMS_employees')
    .select('*')
    .order('id', { ascending: true });

  if (empError) throw empError;
  if (!emps) return [];

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
        leaveBalance[type] = { allowed: b.total_allotted, taken: b.used };
      }
    });

    // Map leave requests
    const empLeaves = leavesList
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

    // Determine check-in status for today
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

export async function createEmployee(emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>): Promise<void> {
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
      basic_pay: emp.basicSalary,
      status: emp.status || 'active',
      phone: emp.phone || null
    }]);

  if (error) {
    console.error("First insert failed:", error);
    // Fallback if the remote DB has not been migrated with status and phone columns
    const fallbackData = {
      id: emp.id,
      name: emp.name || 'Unknown',
      email: emp.email,
      password: emp.password || 'password',
      role: emp.role || 'employee',
      designation: emp.designation || 'Employee',
      joining_date: emp.joiningDate || new Date().toISOString().split('T')[0],
      basic_pay: Number(emp.basicSalary) || 0
    };
    const { error: retryError } = await supabase
      .from('HRMS_employees')
      .insert([fallbackData]);
    if (retryError) {
      console.error("Retry insert failed:", retryError);
      throw retryError;
    }
  }

  const initialBalances = [
    { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: 0 },
    { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: 0 },
    { employee_id: emp.id, leave_type: 'earned', total_allotted: 15, used: 0 },
    { employee_id: emp.id, leave_type: 'unpaid', total_allotted: 30, used: 0 }
  ];
  await supabase.from('HRMS_leave_balances').insert(initialBalances);
}

export async function updateEmployee(id: string, fields: Partial<Employee>): Promise<void> {
  const updatePayload: any = {};
  if (fields.name !== undefined) updatePayload.name = fields.name;
  if (fields.email !== undefined) updatePayload.email = fields.email;
  if (fields.designation !== undefined) updatePayload.designation = fields.designation;
  if (fields.joiningDate !== undefined) updatePayload.joining_date = fields.joiningDate;
  if (fields.basicSalary !== undefined) updatePayload.basic_pay = fields.basicSalary;
  if (fields.role !== undefined) updatePayload.role = fields.role;
  if (fields.password !== undefined) updatePayload.password = fields.password;
  if (fields.status !== undefined) updatePayload.status = fields.status;
  if (fields.phone !== undefined) updatePayload.phone = fields.phone;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from('HRMS_employees')
      .update(updatePayload)
      .eq('id', id);
    if (error) {
      // Fallback: strip new columns and retry
      delete updatePayload.status;
      delete updatePayload.phone;
      if (Object.keys(updatePayload).length > 0) {
        const { error: retryError } = await supabase
          .from('HRMS_employees')
          .update(updatePayload)
          .eq('id', id);
        if (retryError) throw retryError;
      }
    }
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function toggleEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .update({ status })
    .eq('id', id);
  if (error) {
    console.warn("Status toggle failed, likely because 'status' column is missing from remote DB.");
  }
}

export async function seedInitialDatabase() {
  const employeesToSeed: any[] = [];

  const { count } = await supabase
    .from('HRMS_employees')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    const { error: empErr } = await supabase.from('HRMS_employees').insert(employeesToSeed);
    if (empErr) console.error('Error seeding employees:', empErr);

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

    const leaveRequestsToSeed = [
      { employee_id: 'EMP-2026-089', leave_type: 'sick', from_date: '2026-06-05', to_date: '2026-06-06', reason: 'Suffering from viral fever and cold.', status: 'Approved' },
      { employee_id: 'EMP-2026-089', leave_type: 'casual', from_date: '2026-06-22', to_date: '2026-06-23', reason: 'Attending family function in hometown.', status: 'Approved' },
      { employee_id: 'EMP-2026-089', leave_type: 'earned', from_date: '2026-07-20', to_date: '2026-07-24', reason: 'Planned vacation with family.', status: 'Pending' },
      { employee_id: 'EMP-2026-112', leave_type: 'sick', from_date: '2026-06-12', to_date: '2026-06-12', reason: 'Severe migraine headache.', status: 'Approved' }
    ];
    await supabase.from('HRMS_leave_requests').insert(leaveRequestsToSeed);

    const attendanceToSeed = [
      { employee_id: 'EMP-2026-089', date: '2026-07-13', status: 'Present', check_in_time: '09:05:22', check_out_time: '18:12:45' },
      { employee_id: 'EMP-2026-112', date: '2026-07-13', status: 'Present', check_in_time: '08:58:34' }
    ];
    await supabase.from('HRMS_attendance').insert(attendanceToSeed);

    const payrollToSeed = [{
      employee_id: 'EMP-2026-089', month: '2026-06', basic_pay: 45000,
      allowances: [{ nameKey: 'hra', amount: 18000 }, { nameKey: 'medicalAllow', amount: 3000 }, { nameKey: 'conveyanceAllow', amount: 4000 }],
      deductions: [{ nameKey: 'providentFund', amount: 5400 }, { nameKey: 'professionalTax', amount: 200 }, { nameKey: 'incomeTax', amount: 3200 }],
      net_pay: 58200
    }];
    await supabase.from('HRMS_payroll').insert(payrollToSeed);

    const invoicesToSeed = [{
      invoice_number: 'INV-2026-042', client_name: 'Apollo Corporate Health Services',
      client_details: 'Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days',
      items: [
        { id: '1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 },
        { id: '2', description: 'On-site Medical Officer Charge - Contract Staffing', quantity: 22, rate: 3500 },
        { id: '3', description: 'Administrative Support & Payroll Management Fee', quantity: 1, rate: 15000 }
      ],
      total: 212000, payable_amount: 250160, tax_percent: 18, due_date: '2026-07-25'
    }];
    await supabase.from('HRMS_invoices').insert(invoicesToSeed);
  }
}
