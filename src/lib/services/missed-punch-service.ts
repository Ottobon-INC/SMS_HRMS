import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { MissedPunchRequest, MissedPunchStatus } from '../../types';

/** Employee submits a missed punch request */
export async function submitMissedPunchRequest(
  empId: string,
  missedDate: string,
  punchType: 'in' | 'out',
  reason?: string
): Promise<void> {
  // Prevent duplicate: if a pending request already exists for that date and type, skip
  const { data: existing } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .select('id')
    .eq('employee_id', empId)
    .eq('missed_date', missedDate)
    .eq('punch_type', punchType)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return; // Already requested, don't duplicate

  const { error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .insert([{
      employee_id: empId,
      missed_date: missedDate,
      punch_type: punchType,
      reason: reason || null,
      status: 'pending'
    }]);

  if (error) throw error;

  // If applying for Missed Punch-In on today's date, ensure an active session is started immediately
  const todayStr = new Date().toLocaleDateString('en-CA');
  if (punchType === 'in' && missedDate === todayStr) {
    try {
      const { data: existingAtt } = await supabase
        .from(DB_TABLES.ATTENDANCE)
        .select('id')
        .eq('employee_id', empId)
        .eq('date', todayStr)
        .maybeSingle();

      if (!existingAtt) {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
        await supabase
          .from(DB_TABLES.ATTENDANCE)
          .insert([{
            employee_id: empId,
            date: todayStr,
            status: 'Present',
            check_in_time: currentTime,
            check_out_time: null,
            punch_note: `[Missed Punch-In: ${reason || 'Late arrival'}]`,
            session_number: 1
          }]);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hrms:attendance-updated'));
      }
    } catch (e) {
      console.warn('Could not auto-start attendance session on missed punch submit:', e);
    }
  }
}

/** Admin fetches all pending (or all) missed punch requests */
export async function fetchMissedPunchRequests(
  statusFilter?: MissedPunchStatus
): Promise<MissedPunchRequest[]> {
  let query = supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .select(`
      id,
      employee_id,
      missed_date,
      punch_type,
      reason,
      status,
      admin_note,
      resolved_at,
      resolved_by,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_id, // We will map the real name in the UI
    missedDate: r.missed_date,
    punchType: (r.punch_type || 'out') as 'in' | 'out',
    reason: r.reason,
    status: r.status as MissedPunchStatus,
    adminNote: r.admin_note,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at
  }));
}

/** Employee fetches their own missed punch requests */
export async function fetchEmployeeMissedPunches(
  empId: string
): Promise<MissedPunchRequest[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .select(`
      id,
      employee_id,
      missed_date,
      punch_type,
      reason,
      status,
      admin_note,
      resolved_at,
      resolved_by,
      created_at
    `)
    .eq('employee_id', empId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_id,
    missedDate: r.missed_date,
    punchType: (r.punch_type || 'out') as 'in' | 'out',
    reason: r.reason,
    status: r.status as MissedPunchStatus,
    adminNote: r.admin_note,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at
  }));
}

/** Admin approves request → auto-closes or confirms the attendance session */
export async function approveMissedPunchRequest(
  requestId: string,
  empId: string,
  missedDate: string,
  punchType: 'in' | 'out',
  adminId: string,
  options?: {
    correctionTime?: string;     // optional manual override
    checkInTime?: string;        // optional manual override
    adminNote?: string;
    createdAt?: string;          // request creation timestamp (for exact applied time)
    scheduledShift?: {
      shiftStart?: string;
      shiftEnd?: string;
      shiftLabel?: string;
    };
  }
): Promise<void> {
  // 1. Resolve scheduled shift (from options or Duty Roster lookup)
  let shiftStart = options?.scheduledShift?.shiftStart || '09:00';
  let shiftEnd = options?.scheduledShift?.shiftEnd || '18:00';
  let shiftLabel = options?.scheduledShift?.shiftLabel || 'General Shift';

  if (!options?.scheduledShift) {
    try {
      const { data: rosterShift } = await supabase
        .from(DB_TABLES.DUTY_ROSTER)
        .select('shift_start, shift_end, shift_label')
        .eq('employee_id', empId)
        .eq('shift_date', missedDate)
        .maybeSingle();

      if (rosterShift) {
        if (rosterShift.shift_start) shiftStart = rosterShift.shift_start.slice(0, 5);
        if (rosterShift.shift_end) shiftEnd = rosterShift.shift_end.slice(0, 5);
        if (rosterShift.shift_label) shiftLabel = rosterShift.shift_label;
      }
    } catch (e) {
      console.warn('Could not fetch duty roster for missed punch approval:', e);
    }
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const isToday = missedDate === todayStr;

  // 2. Determine exact applied/arrival time from request's createdAt timestamp
  let appliedTimeStr: string;
  if (options?.checkInTime) {
    appliedTimeStr = options.checkInTime.length === 5 ? `${options.checkInTime}:00` : options.checkInTime;
  } else if (options?.createdAt) {
    const d = new Date(options.createdAt);
    appliedTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  } else {
    try {
      const { data: reqData } = await supabase
        .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
        .select('created_at')
        .eq('id', requestId)
        .maybeSingle();
      if (reqData?.created_at) {
        const d = new Date(reqData.created_at);
        appliedTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      } else {
        appliedTimeStr = shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart;
      }
    } catch {
      appliedTimeStr = shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart;
    }
  }
  if (appliedTimeStr.length === 5) appliedTimeStr = `${appliedTimeStr}:00`;

  if (punchType === 'out') {
    // Punch-Out: Close the open session using scheduled shiftEnd (e.g. 18:00:00)
    const finalOutTime = options?.correctionTime 
      ? (options.correctionTime.length === 5 ? `${options.correctionTime}:00` : options.correctionTime)
      : (shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd);

    const { data: openSessions, error: fetchErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id, check_in_time')
      .eq('employee_id', empId)
      .eq('date', missedDate)
      .is('check_out_time', null);

    if (fetchErr) throw fetchErr;

    if (openSessions && openSessions.length > 0) {
      for (const session of openSessions) {
        const { error: updateErr } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .update({
            check_out_time: finalOutTime,
            punch_note: options?.adminNote || `Closed by Admin — Missed Punch-Out Approved (${shiftLabel})`
          })
          .eq('id', session.id);
        if (updateErr) throw updateErr;
      }
    }
  } else if (punchType === 'in') {
    // Punch-In: Confirm attendance session
    const { data: existingSessions, error: fetchErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id, check_in_time, check_out_time')
      .eq('employee_id', empId)
      .eq('date', missedDate)
      .order('session_number', { ascending: true })
      .limit(1);

    if (fetchErr) throw fetchErr;

    const formattedShiftEnd = shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd;

    if (existingSessions && existingSessions.length > 0) {
      const activeSession = existingSessions[0];
      const updatePayload: any = {
        status: 'Present',
        punch_note: options?.adminNote || `Missed Punch-In Approved by Admin (${shiftLabel})`
      };
      // Keep existing punch-in time if recorded when employee applied, else use derived appliedTimeStr
      if (!activeSession.check_in_time) {
        updatePayload.check_in_time = appliedTimeStr;
      }
      // CRITICAL: If today, leave check_out_time null so their live duty timer continues!
      // If a past date and check_out_time is null, close with scheduled shiftEnd
      if (!isToday && !activeSession.check_out_time) {
        updatePayload.check_out_time = formattedShiftEnd;
      }

      const { error: updateErr } = await supabase
        .from(DB_TABLES.ATTENDANCE)
        .update(updatePayload)
        .eq('id', activeSession.id);
      if (updateErr) throw updateErr;
    } else {
      // No record yet (e.g. past date or offline application)
      const { error: insertErr } = await supabase
        .from(DB_TABLES.ATTENDANCE)
        .insert([{
          employee_id: empId,
          date: missedDate,
          status: 'Present',
          check_in_time: appliedTimeStr,
          check_out_time: isToday ? null : formattedShiftEnd,
          punch_note: options?.adminNote || `Missed Punch-In Approved by Admin (${shiftLabel})`,
          session_number: 1
        }]);
      if (insertErr) throw insertErr;
    }
  }

  // 3. Update request status in database
  const { error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .update({
      status: 'approved',
      admin_note: options?.adminNote || 'Approved by Admin',
      resolved_at: new Date().toISOString(),
      resolved_by: adminId
    })
    .eq('id', requestId);

  if (error) throw error;
}

/** Admin rejects request (employee must explain further or live with it) */
export async function rejectMissedPunchRequest(
  requestId: string,
  adminId: string,
  adminNote?: string
): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .update({
      status: 'rejected',
      admin_note: adminNote || null,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId
    })
    .eq('id', requestId);

  if (error) throw error;
}

/** Count pending requests — used for admin badge */
export async function countPendingMissedPunches(): Promise<number> {
  const { count, error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
}

/**
 * Calculates penalty half-day cuts based on monthly approved missed punch count.
 * Rule:
 * - 1st & 2nd: Grace (0 cut)
 * - 3rd time onwards: 1 half-day cut for EVERY missed punch (3rd = 1 cut, 4th = 2 cuts, 5th = 3 cuts, etc., no buffer)
 */
export function calculateMissedPunchPenaltyHalfDays(missedPunchCount: number): number {
  if (missedPunchCount < 3) return 0;
  return missedPunchCount - 2;
}

/** Fetch monthly approved missed punches for payroll deduction calculation */
export async function getMonthlyApprovedMissedPunches(
  empId: string,
  month: string // YYYY-MM
): Promise<MissedPunchRequest[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
    .select('*')
    .eq('employee_id', empId)
    .eq('status', 'approved')
    .like('missed_date', `${month}%`);

  if (error) {
    console.warn('Error fetching monthly missed punches:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_id,
    missedDate: r.missed_date,
    punchType: (r.punch_type || 'out') as 'in' | 'out',
    reason: r.reason,
    status: r.status as MissedPunchStatus,
    adminNote: r.admin_note,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at
  }));
}

