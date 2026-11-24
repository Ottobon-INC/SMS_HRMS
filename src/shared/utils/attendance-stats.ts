import { AttendanceRecord, LeaveRequest, MissedPunchRequest } from '../../types';

export function calculateMissedPunchPenaltyHalfDays(missedPunchCount: number): number {
  if (missedPunchCount < 3) return 0;
  return missedPunchCount - 2;
}

export function computeAttendanceStats(
  month: string, 
  attendanceRecords: AttendanceRecord[], 
  leaveRequests: LeaveRequest[],
  joiningDate?: string,
  missedPunchRequests?: MissedPunchRequest[]
) {
  // month is YYYY-MM
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;

  // 7-day working week, so workingDays = days in month
  const workingDays = new Date(year, m + 1, 0).getDate();

  let daysPresent = 0;
  let rawPaidLeaveDays = 0;
  let rawLopDays = 0;
  let specialPaidLeaves = 0; // Statutory paid leaves: Maternity (up to 90d) / Paternity (up to 15d)
  let absentDays = 0;
  let halfDays = 0;

  const processedDays = new Set<string>();

  // Determine tenure: Does employee have >= 1 year of service in this payroll month?
  // Company Rule: 1 Casual Leave (CL) + 1 Sick Leave (SL) per month credited only after completion of 1 year of service from joining date.
  // Employees with < 1 year tenure (probation) have 0 paid leave quota (all leaves are LOP).
  let hasOneYearTenure = false;
  if (joiningDate) {
    const join = new Date(joiningDate);
    if (!isNaN(join.getTime())) {
      const oneYearAfter = new Date(join);
      oneYearAfter.setFullYear(oneYearAfter.getFullYear() + 1);
      const monthEnd = new Date(year, m + 1, 0);
      hasOneYearTenure = oneYearAfter <= monthEnd;
    }
  }

  // Monthly regular paid quota: 2 days (1 CL + 1 SL) if >= 1 year tenure, else 0 days
  const monthlyPaidQuota = hasOneYearTenure ? 2 : 0;

  // Map approved leave requests by date
  const approvedLeaveDates = new Map<string, LeaveRequest>();
  (leaveRequests || []).forEach(req => {
    if ((req.status || '').toLowerCase() === 'approved') {
      const [sy, sm, sd] = req.fromDate.split('-').map(Number);
      const [ey, em, ed] = req.toDate.split('-').map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      while (cur <= end) {
        const y = cur.getFullYear();
        const mon = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${mon}-${d}`;
        if (dStr.startsWith(month)) {
          approvedLeaveDates.set(dStr, req);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  // Step 1: Count attendance records within the month
  (attendanceRecords || []).forEach(record => {
    if (record.date && record.date.startsWith(month)) {
      processedDays.add(record.date);
      const st = (record.status || '').toLowerCase();
      if (st === 'present') {
        daysPresent += 1;
      } else if (st === 'half-day') {
        daysPresent += 0.5;
        halfDays += 1;
        // Half-day is NEVER counted under Absent. The unworked 0.5 day is under LOP,
        // or paid leave only if covered by an approved paid leave request with tenure >= 1 year.
        const leave = approvedLeaveDates.get(record.date);
        if (leave) {
          if (leave.type === 'lop' || leave.type === 'maternity_unpaid') {
            // LOP or Maternity (Without Pay) -> 0.5 day salary cut
            rawLopDays += 0.5;
          } else if (leave.type === 'maternity' || leave.type === 'paternity') {
            // Maternity (With Pay - 90d) & Paternity (15d) are statutory paid leaves
            specialPaidLeaves += 0.5;
          } else if ((leave.type === 'casual' || leave.type === 'sick' || leave.type === 'monthly') && hasOneYearTenure) {
            rawPaidLeaveDays += 0.5;
          } else {
            rawLopDays += 0.5;
          }
        } else {
          // Unworked 0.5 day without approved paid leave: counts under LOP (0.5 day pay cut)
          rawLopDays += 0.5;
        }
      } else if (st === 'leave') {
        // Leave record in attendance: counts as Paid Leave ONLY if an approved paid leave request exists
        // (Casual/Sick with >= 1 year tenure). If no approved paid leave request, it is LOP (Loss of Pay).
        const leave = approvedLeaveDates.get(record.date);
        if (leave) {
          if (leave.type === 'lop' || leave.type === 'maternity_unpaid') {
            // LOP or Maternity (Without Pay) -> 1 day salary cut
            rawLopDays += 1;
          } else if (leave.type === 'maternity' || leave.type === 'paternity' || leave.type === 'weekoff') {
            // Maternity (With Pay - 90d), Paternity (15d), and Week Off are paid
            specialPaidLeaves += 1;
          } else if ((leave.type === 'casual' || leave.type === 'sick' || leave.type === 'monthly') && hasOneYearTenure) {
            rawPaidLeaveDays += 1;
          } else {
            rawLopDays += 1;
          }
        } else {
          // No approved paid leave request: counts as LOP (Loss of Pay, 1 day cut)
          rawLopDays += 1;
        }
      } else if (st === 'absent') {
        absentDays += 1;
      } else if (st === 'weekoff') {
        // Week off is a paid rest day (3/mo for women, 2/mo for men) — No salary deduction!
        specialPaidLeaves += 1;
      }
    }
  });

  // Step 2: Add approved leave requests not already in attendanceRecords
  approvedLeaveDates.forEach((req, dStr) => {
    if (!processedDays.has(dStr)) {
      if (req.type === 'lop' || req.type === 'maternity_unpaid') {
        rawLopDays += 1;
      } else if (req.type === 'maternity' || req.type === 'paternity' || req.type === 'weekoff') {
        specialPaidLeaves += 1;
      } else if ((req.type === 'casual' || req.type === 'sick' || req.type === 'monthly') && hasOneYearTenure) {
        rawPaidLeaveDays += 1;
      } else {
        rawLopDays += 1;
      }
      processedDays.add(dStr);
    }
  });

  // Step 3: Enforce Paid Leave Quota
  // Regular paid leaves are capped at monthlyPaidQuota (2 days if >= 1 yr, 0 if < 1 yr).
  // Any leaves taken beyond the quota automatically convert to LOP (Loss of Pay).
  const allowedPaid = Math.min(rawPaidLeaveDays, monthlyPaidQuota);
  const excessToLop = Math.max(0, rawPaidLeaveDays - allowedPaid);

  const paidLeaves = allowedPaid + specialPaidLeaves;
  const lopDays = rawLopDays + excessToLop;

  if (daysPresent < 0) daysPresent = 0;
  const leavesTaken = paidLeaves + lopDays;
  const hasData = processedDays.size > 0 || approvedLeaveDates.size > 0;

  // Step 4: Calculate Missed Punch Penalty Cuts
  const approvedMissedPunchCount = (missedPunchRequests || []).filter(
    m => (m.status || '').toLowerCase() === 'approved' && m.missedDate && m.missedDate.startsWith(month)
  ).length;
  const missedPunchPenaltyHalfDays = calculateMissedPunchPenaltyHalfDays(approvedMissedPunchCount);

  return { 
    workingDays, 
    daysPresent, 
    leavesTaken, 
    paidLeaves, 
    lopDays, 
    absentDays, 
    halfDays, 
    hasData,
    missedPunchCount: approvedMissedPunchCount,
    missedPunchPenaltyHalfDays
  };
}
