import { AttendanceRecord, LeaveRequest, MissedPunchRequest } from '../../types';

export function calculateMissedPunchPenaltyHalfDays(missedPunchCount: number): number {
  if (missedPunchCount < 3) return 0;
  if (missedPunchCount <= 5) return 1;
  if (missedPunchCount === 6) return 2;
  return 2 + (missedPunchCount - 6);
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
        const leave = approvedLeaveDates.get(record.date);
        if (leave) {
          if (leave.type === 'lop') {
            rawLopDays += 0.5;
          } else if (leave.type === 'maternity' || leave.type === 'paternity') {
            specialPaidLeaves += 0.5;
          } else {
            rawPaidLeaveDays += 0.5;
          }
        } else {
          // Unapproved half-day absence: 0.5 day absent penalty
          absentDays += 0.5;
        }
      } else if (st === 'leave') {
        const leave = approvedLeaveDates.get(record.date);
        if (leave) {
          if (leave.type === 'lop') {
            rawLopDays += 1;
          } else if (leave.type === 'maternity' || leave.type === 'paternity') {
            specialPaidLeaves += 1;
          } else {
            rawPaidLeaveDays += 1;
          }
        } else {
          // Leave record in attendance: counts towards monthly leave pool
          rawPaidLeaveDays += 1;
        }
      } else if (st === 'absent') {
        absentDays += 1;
      }
    }
  });

  // Step 2: Add approved leave requests not already in attendanceRecords
  approvedLeaveDates.forEach((req, dStr) => {
    if (!processedDays.has(dStr)) {
      if (req.type === 'lop') {
        rawLopDays += 1;
      } else if (req.type === 'maternity' || req.type === 'paternity') {
        specialPaidLeaves += 1;
      } else {
        rawPaidLeaveDays += 1;
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
