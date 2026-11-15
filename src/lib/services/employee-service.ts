import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { Employee, LeaveBalance, LeaveType, LeaveStatus, AttendanceRecord, AttendanceStatus, CheckInLog, Payslip, MonthlyLeaveQuota } from '../../types';

export async function fetchAllEmployeesData(): Promise<Employee[]> {
  let emps: any[] = [];
  let attendanceList: any[] = [];
  let leavesList: any[] = [];
  let balancesList: any[] = [];
  let payrollList: any[] = [];
  let advancesList: any[] = [];
  let pinsList: any[] = [];
  let quotaList: any[] = [];
  let missedPunchesList: any[] = [];

  const token = typeof window !== 'undefined' ? localStorage.getItem('hrms_auth_token') : null;
  let fetchedFromDirectory = false;

  if (token) {
    try {
      const res = await fetch('/api/hrms/directory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hrms_auth_token');
          window.dispatchEvent(new CustomEvent('hrms:unauthorized'));
        }
        return [];
      }
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (Array.isArray(json.employees) && json.employees.length > 0) {
          emps = json.employees;
          attendanceList = json.sms_hrms_attendance || [];
          leavesList = json.sms_hrms_leave_requests || [];
          balancesList = json.sms_hrms_leave_balances || [];
          payrollList = json.sms_hrms_payroll || [];
          advancesList = json.sms_hrms_advance_requests || [];
          pinsList = json.sms_hrms_location_pins || [];
          quotaList = json.sms_hrms_monthly_leave_quota || [];
          fetchedFromDirectory = true;
        }
      }
    } catch {
      // directory request failed, fallback to Supabase
    }
  }

  if (!fetchedFromDirectory) {
    const sanitizeCached = (raw: any[]): Employee[] => {
      return (raw || []).map((e: any) => ({
        ...e,
        payslips: e.payslips || [],
        leaveRequests: e.leaveRequests || [],
        attendanceRecords: e.attendanceRecords || [],
        checkInLogs: e.checkInLogs || [],
        locationPins: e.locationPins || [],
        advanceRequests: e.advanceRequests || []
      }));
    };

    if (!token) {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('hrms_local_employees') : null;
      if (cached) {
        try {
          return sanitizeCached(JSON.parse(cached));
        } catch {}
      }
      return [];
    }

    const { data: dbEmps, error: empError } = await supabase
      .from(DB_TABLES.EMPLOYEES)
      .select('*')
      .order('id', { ascending: true });

    if (empError) {
      console.warn('Supabase directory fetch noticed:', empError.message);
      const cached = typeof window !== 'undefined' ? localStorage.getItem('hrms_local_employees') : null;
      if (cached) {
        try {
          return sanitizeCached(JSON.parse(cached));
        } catch {}
      }
      return [];
    }
    if (!dbEmps) return [];
    emps = dbEmps;

    const { data: att } = await supabase.from(DB_TABLES.ATTENDANCE).select('*');
    const { data: leaves } = await supabase.from(DB_TABLES.LEAVE_REQUESTS).select('*');
    const { data: balances } = await supabase.from(DB_TABLES.LEAVE_BALANCES).select('*');
    const { data: payroll } = await supabase.from(DB_TABLES.PAYROLL).select('*');
    const { data: advances } = await supabase.from(DB_TABLES.ADVANCE_REQUESTS).select('*');
    const { data: pins } = await supabase.from(DB_TABLES.LOCATION_PINS).select('*');
    const { data: quotas } = await supabase.from(DB_TABLES.MONTHLY_LEAVE_QUOTA).select('*');
    const { data: missedPunches } = await supabase.from(DB_TABLES.MISSED_PUNCH_REQUESTS).select('*');

    attendanceList = att || [];
    leavesList = leaves || [];
    balancesList = balances || [];
    payrollList = payroll || [];
    advancesList = advances || [];
    pinsList = pins || [];
    quotaList = quotas || [];
    missedPunchesList = missedPunches || [];
  }

  const currentMonth = new Date().toISOString().substring(0, 7);

  return emps.map(emp => {
    // Determine 1-year tenure eligibility
    const joinDate = emp.joining_date ? new Date(emp.joining_date) : null;
    const now = new Date();
    let hasOneYearTenure = false;
    if (joinDate && !isNaN(joinDate.getTime())) {
      const oneYearAfterJoin = new Date(joinDate);
      oneYearAfterJoin.setFullYear(oneYearAfterJoin.getFullYear() + 1);
      hasOneYearTenure = now >= oneYearAfterJoin;
    }

    // Tally approved leaves for current month and cumulative parental leaves
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    let currentMonthSickTaken = 0;
    let currentMonthCasualTaken = 0;
    let currentMonthLopTaken = 0;
    let totalMaternityTaken = 0;
    let totalPaternityTaken = 0;

    leavesList
      .filter(l => l.employee_id === emp.id && (l.status || '').toLowerCase() === 'approved')
      .forEach(l => {
        const from = new Date(l.from_date);
        const to = new Date(l.to_date);
        const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24)) + 1;
        const type = (l.leave_type || '').toLowerCase();

        if (l.from_date && l.from_date.startsWith(currentMonthPrefix)) {
          if (type === 'sick') currentMonthSickTaken += diffDays;
          else if (type === 'casual' || type === 'monthly') currentMonthCasualTaken += diffDays;
          else if (type === 'lop') currentMonthLopTaken += diffDays;
        }
        if (type === 'maternity') totalMaternityTaken += diffDays;
        if (type === 'paternity') totalPaternityTaken += diffDays;
      });

    // Map leave balances (1 CL and 1 SL per month only after 1 year of tenure)
    const empBalances = balancesList.filter(b => b.employee_id === emp.id);
    const leaveBalance: LeaveBalance = {
      sick: { allowed: hasOneYearTenure ? 1 : 0, taken: currentMonthSickTaken },
      casual: { allowed: hasOneYearTenure ? 1 : 0, taken: currentMonthCasualTaken },
      lop: { taken: currentMonthLopTaken }
    };
    if (emp.gender === 'female') {
      leaveBalance.maternity = { allowed: 90, taken: totalMaternityTaken };
    } else if (emp.gender === 'male') {
      leaveBalance.paternity = { allowed: 15, taken: totalPaternityTaken };
    }
    empBalances.forEach(b => {
      const type = b.leave_type as LeaveType;
      if (type === 'maternity' && leaveBalance.maternity) {
        leaveBalance.maternity.allowed = b.total_allotted || 90;
      } else if (type === 'paternity' && leaveBalance.paternity) {
        leaveBalance.paternity.allowed = b.total_allotted || 15;
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
      note: a.check_in_time ? `Checked In: ${a.check_in_time}` : undefined,
      photoUrl: a.check_in_photo_url || undefined
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
          totalHours,
          checkInLocation: a.check_in_location || undefined,
          checkInLatLng: a.check_in_lat_lng || undefined,
          photoUrl: a.check_in_photo_url || undefined,
          checkOutLocation: a.check_out_location || undefined,
          checkOutLatLng: a.check_out_lat_lng || undefined,
          checkOutPhotoUrl: a.check_out_photo_url || undefined,
          punchType: (a.punch_type || 'in_office') as import('../../types').PunchType,
          punchNote: a.punch_note || undefined,
          sessionNumber: a.session_number || 1
        };

      });

    const locationPins = pinsList
      .filter(p => p.employee_id === emp.id)
      .map(p => ({
        id: p.id,
        date: p.date,
        pinnedAt: p.pinned_at,
        label: p.label || undefined,
        latitude: p.latitude ? Number(p.latitude) : undefined,
        longitude: p.longitude ? Number(p.longitude) : undefined,
        locationName: p.location_name || undefined,
        photoUrl: p.photo_url || undefined,
        pinType: (p.pin_type || 'other') as import('../../types').PinType
      }));

    // Determine check-in status for today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = empAtt.find(a => a.date === todayStr);
    const isCheckedIn = !!(todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time);

    // Map payslips sorted reverse-chronologically (latest month first)
    const empPayslips: Payslip[] = payrollList
      .filter(p => p.employee_id === emp.id)
      .map(p => ({
        id: p.id,
        month: p.month,
        basicPay: Number(p.basic_pay),
        allowances: Array.isArray(p.allowances) ? p.allowances : [],
        deductions: Array.isArray(p.deductions) ? p.deductions : [],
        advanceMoneyTaken: p.advance_money_taken,
        advanceMoneyAmount: Number(p.advance_money_amount),
        workingDays: p.working_days ? Number(p.working_days) : undefined,
        daysPresent: p.days_present ? Number(p.days_present) : undefined,
        leavesTaken: p.leaves_taken ? Number(p.leaves_taken) : undefined
      }))
      .sort((a, b) => (b.month || '').localeCompare(a.month || ''));

    // Map monthly quota
    const empQuota = quotaList.find(q => q.employee_id === emp.id && q.month === currentMonth);
    let monthlyQuota: MonthlyLeaveQuota | undefined = undefined;
    if (empQuota) {
      monthlyQuota = {
        id: empQuota.id,
        month: empQuota.month,
        allotted: empQuota.allotted,
        used: empQuota.used,
        remaining: empQuota.allotted - empQuota.used
      };
    } else {
      // Create an empty virtual one for the UI if not fetched/initialized yet
      monthlyQuota = {
        id: 'virtual',
        month: currentMonth,
        allotted: 3,
        used: 0,
        remaining: 3
      };
    }

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
      gender: emp.gender as 'male' | 'female' | 'other' | undefined,
      experience: Number(emp.experience) || 0,
      bankDetails: emp.bank_details as any,
      isCheckedIn,
      leaveBalance,
      monthlyQuota,
      leaveRequests: empLeaves,
      attendanceRecords,
      checkInLogs,
      payslips: empPayslips,
      locationPins,
      advanceRequests: advancesList
        .filter(a => a.employee_id === emp.id)
        .map(a => {
          return {
            id: a.id,
            advanceType: (a.advance_type || 'salary') as 'salary' | 'medical',
            amount: Number(a.amount),
            reason: a.reason,
            status: a.status as any,
            submittedAt: a.submitted_at,
            approvedAt: a.approved_at,
            deductedInMonth: a.deducted_in_month,
            repaymentMonths: a.repayment_months as (2 | 3 | 5) | undefined,
            monthlyInstallment: a.monthly_installment ? Number(a.monthly_installment) : undefined,
            installmentsRemaining: a.installments_remaining ?? undefined
          };
        }),
      missedPunchRequests: missedPunchesList
        .filter(m => m.employee_id === emp.id)
        .map(m => ({
          id: m.id,
          employeeId: m.employee_id,
          employeeName: emp.name,
          missedDate: m.missed_date,
          punchType: (m.punch_type || 'out') as 'in' | 'out',
          reason: m.reason,
          status: m.status as any,
          adminNote: m.admin_note,
          resolvedAt: m.resolved_at,
          resolvedBy: m.resolved_by,
          createdAt: m.created_at
        }))
    };

  });
}

export async function createEmployee(emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.EMPLOYEES)
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
      phone: emp.phone || null,
      gender: emp.gender || null,
      experience: emp.experience || 0,
      bank_details: emp.bankDetails || null
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
      basic_pay: Number(emp.basicSalary) || 0,
      gender: emp.gender || null,
      experience: emp.experience || 0
    };
    const { error: retryError } = await supabase
      .from(DB_TABLES.EMPLOYEES)
      .insert([fallbackData]);
    if (retryError) {
      console.error("Retry insert failed:", retryError);
      throw retryError;
    }
  }

  const initialBalances: any[] = [
    { employee_id: emp.id, leave_type: 'sick', total_allotted: 1, used: 0 },
    { employee_id: emp.id, leave_type: 'casual', total_allotted: 1, used: 0 }
  ];
  if (emp.gender === 'female') {
    initialBalances.push({ employee_id: emp.id, leave_type: 'maternity', total_allotted: 90, used: 0 });
  } else if (emp.gender === 'male') {
    initialBalances.push({ employee_id: emp.id, leave_type: 'paternity', total_allotted: 15, used: 0 });
  }
  await supabase.from(DB_TABLES.LEAVE_BALANCES).insert(initialBalances);
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
  if (fields.gender !== undefined) updatePayload.gender = fields.gender;
  if (fields.experience !== undefined) updatePayload.experience = fields.experience;
  if (fields.bankDetails !== undefined) updatePayload.bank_details = fields.bankDetails;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from(DB_TABLES.EMPLOYEES)
      .update(updatePayload)
      .eq('id', id);
    if (error) {
      // Fallback: strip new columns and retry
      delete updatePayload.status;
      delete updatePayload.phone;
      delete updatePayload.gender;
      delete updatePayload.experience;
      delete updatePayload.bank_details;
      if (Object.keys(updatePayload).length > 0) {
        const { error: retryError } = await supabase
          .from(DB_TABLES.EMPLOYEES)
          .update(updatePayload)
          .eq('id', id);
        if (retryError) throw retryError;
      }
    }
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.EMPLOYEES)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function toggleEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.EMPLOYEES)
    .update({ status })
    .eq('id', id);
  if (error) {
    console.warn("Status toggle failed, likely because 'status' column is missing from remote DB.");
  }
}

export async function seedInitialDatabase() {
  // Remote database schema and tables are already provisioned on backend.
  // Avoid client-side PostgREST writes under RLS.
  return;
}
