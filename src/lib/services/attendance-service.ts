import { supabase } from '../../core/supabase';
import { DB_TABLES } from '../../core/database.tables';
import { AttendanceStatus, PunchType } from '../../types';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hrms_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function autoPunchOutExpiredSessions(empId: string): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Find unclosed sessions older than today (or exceeding the 24-hr shift cycle)
    const { data: openSessions, error: openErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id, date, status, check_in_time, check_out_time, punch_note')
      .eq('employee_id', empId)
      .is('check_out_time', null)
      .lt('date', todayStr)
      .order('date', { ascending: true });

    if (!openErr && openSessions && openSessions.length > 0) {
      for (const session of openSessions) {
        const sessionDate = session.date;
        const monthStr = sessionDate.slice(0, 7);

        // Count previous auto punch-outs in this month for this employee
        const { data: monthRecords } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .select('id, punch_note, status')
          .eq('employee_id', empId)
          .like('date', `${monthStr}%`);

        let priorAutoPunches = 0;
        if (monthRecords) {
          priorAutoPunches = monthRecords.filter(r => 
            r.id !== session.id &&
            r.punch_note && r.punch_note.includes('Auto Punch-Out')
          ).length;
        }

        // Count approved missed punch requests for the month
        const { data: approvedReqs } = await supabase
          .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
          .select('id')
          .eq('employee_id', empId)
          .eq('status', 'approved')
          .like('missed_date', `${monthStr}%`);

        const priorApproved = approvedReqs ? approvedReqs.length : 0;
        const totalPriorMissed = priorAutoPunches + priorApproved;
        const thisMissedNumber = totalPriorMissed + 1;

        // Policy Rule: 1st & 2nd are grace (₹0 / Present). From 3rd time onwards, every single missed punch is Half-Day cut!
        const isHalfDayCut = thisMissedNumber >= 3;
        const newStatus = isHalfDayCut ? 'Half-day' : (session.status || 'Present');
        const autoNote = `Auto Punch-Out (24-hr cycle elapsed) - Missed #${thisMissedNumber}${isHalfDayCut ? ' (Half-Day deduction)' : ' (Grace)'}`;
        const finalNote = session.punch_note ? `${session.punch_note} | ${autoNote}` : autoNote;

        // Calculate 8-hour shift completion from punch-in time if available
        let autoOutTime = '18:00:00';
        if (session.check_in_time) {
          const [inH, inM, inS] = session.check_in_time.split(':').map(Number);
          const endH = Math.min(23, inH + 8);
          autoOutTime = `${String(endH).padStart(2, '0')}:${String(inM || 0).padStart(2, '0')}:${String(inS || 0).padStart(2, '0')}`;
        }

        await supabase
          .from(DB_TABLES.ATTENDANCE)
          .update({
            check_out_time: autoOutTime,
            status: newStatus,
            punch_note: finalNote
          })
          .eq('id', session.id);

        // Auto-resolve any pending request for this date
        await supabase
          .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
          .update({
            status: 'rejected',
            admin_note: `Auto-resolved: 24-hr cycle elapsed. Missed #${thisMissedNumber}: ${newStatus}.`,
            resolved_at: new Date().toISOString()
          })
          .eq('employee_id', empId)
          .eq('missed_date', sessionDate)
          .eq('status', 'pending');
      }
    }
  } catch (err) {
    console.warn("Direct autoPunchOutExpiredSessions notice:", err);
  }

  // REST API fallback
  try {
    await fetch('/api/hrms/attendance/auto-expire-missed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ empId })
    });
  } catch {}
}

export async function autoExpireMissedPunches(empId: string): Promise<void> {
  await autoPunchOutExpiredSessions(empId);
}

export async function checkMissedPunchOut(empId: string): Promise<{ missedDate: string; hasPending: boolean } | null> {
  // Automatically close any expired sessions in the background; never block punch-in
  await autoPunchOutExpiredSessions(empId);
  return null;
}

export async function clockInEmployee(
  empId: string, 
  location?: string, 
  latLng?: string,
  photoUrl?: string,
  punchType: PunchType = 'in_office',
  punchNote?: string
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    // Check if employee is inactive
    const { data: empCheck } = await supabase
      .from(DB_TABLES.EMPLOYEES)
      .select('status')
      .eq('id', empId)
      .single();
    if (empCheck && empCheck.status === 'inactive') {
      throw new Error("Account has been deactivated. Punch in is disabled.");
    }

    // Find max session number for today
    const { data: existingSessions } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('session_number')
      .eq('employee_id', empId)
      .eq('date', todayStr);

    let nextSessionNumber = 1;
    if (existingSessions && existingSessions.length > 0) {
      const maxSession = Math.max(...existingSessions.map((s: any) => s.session_number || 1));
      nextSessionNumber = maxSession + 1;
    }

    const payload: any = {
      employee_id: empId, 
      date: todayStr, 
      status: 'Present', 
      check_in_time: timeStr,
      check_in_location: location || null,
      check_in_lat_lng: latLng || null,
      punch_type: punchType,
      punch_note: punchNote || null,
      session_number: nextSessionNumber
    };
    if (photoUrl) payload.check_in_photo_url = photoUrl;

    const { error } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .insert([payload]);

    if (!error) return;

    if ((error.code === '42703' || error.code === 'PGRST204') && photoUrl) {
      delete payload.check_in_photo_url;
      const retry = await supabase.from(DB_TABLES.ATTENDANCE).insert([payload]);
      if (!retry.error) return;
    }
  } catch (directErr) {
    console.warn("Direct clock-in failed, trying REST fallback:", directErr);
  }

  // REST API fallback
  const res = await fetch('/api/hrms/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, location, latLng, photoUrl, punchType, punchNote })
  }).catch(() => null);

  if (res && res.ok) return;

  throw new Error('Failed to record clock-in');
}

export async function clockOutEmployee(
  empId: string, 
  photoUrl?: string,
  location?: string,
  latLng?: string,
  punchNote?: string,
  status?: AttendanceStatus
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    const { data: existingSessions, error: fetchErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id, session_number, check_out_time, punch_note')
      .eq('employee_id', empId)
      .eq('date', todayStr)
      .order('session_number', { ascending: false });

    if (!fetchErr) {
      const activeSession = existingSessions?.find(s => s.check_out_time === null);

      if (activeSession) {
        const payload: any = { 
          check_out_time: timeStr
        };
        if (photoUrl) payload.check_out_photo_url = photoUrl;
        if (location) payload.check_out_location = location;
        if (latLng) payload.check_out_lat_lng = latLng;
        if (punchNote) payload.punch_note = activeSession.punch_note ? `${activeSession.punch_note} | ${punchNote}` : punchNote;
        if (status) payload.status = status;
        
        const { error } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .update(payload)
          .eq('id', activeSession.id);
        if (!error) return;
      } else {
        let nextSession = 1;
        if (existingSessions && existingSessions.length > 0) {
          nextSession = Math.max(...existingSessions.map((s: any) => s.session_number || 1)) + 1;
        }
      
        const payload: any = { 
          employee_id: empId, 
          date: todayStr, 
          status: status || 'present', 
          check_out_time: timeStr,
          session_number: nextSession
        };
        if (photoUrl) payload.check_out_photo_url = photoUrl;
        if (location) payload.check_out_location = location;
        if (latLng) payload.check_out_lat_lng = latLng;
        if (punchNote) payload.punch_note = punchNote;
        
        const { error } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .insert([payload]);
        if (!error) return;
      }
    }
  } catch (directErr) {
    console.warn("Direct clock-out failed, trying REST fallback:", directErr);
  }

  // REST API fallback
  const res = await fetch('/api/hrms/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, photoUrl, location, latLng, punchNote, status })
  }).catch(() => null);

  if (res && res.ok) return;

  throw new Error('Failed to record clock-out');
}

export async function updateAttendanceRecord(
  empId: string,
  date: string,
  status: AttendanceStatus,
  checkIn?: string,
  checkOut?: string
): Promise<void> {
  // Title case for database consistency (Present, Absent, Leave, etc.)
  const dbStatus = status.charAt(0).toUpperCase() + status.slice(1);

  // 1. Primary: Direct Supabase update/insert (fast, direct, no proxy dependency)
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id')
      .eq('employee_id', empId)
      .eq('date', date)
      .order('session_number', { ascending: true })
      .limit(1);

    if (!fetchErr) {
      const firstSession = existing && existing.length > 0 ? existing[0] : null;

      if (firstSession) {
        const updatePayload: any = { 
          status: dbStatus 
        };
        if (checkIn !== undefined) updatePayload.check_in_time = checkIn || null;
        if (checkOut !== undefined) updatePayload.check_out_time = checkOut || null;

        const { error: updErr } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .update(updatePayload)
          .eq('id', firstSession.id);

        if (!updErr) return;
        console.warn("Direct Supabase update notice:", updErr);
      } else {
        const insertPayload: any = { 
          employee_id: empId, 
          date: date, 
          status: dbStatus, 
          check_in_time: checkIn || null, 
          check_out_time: checkOut || null,
          session_number: 1
        };

        const { error: insErr } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .insert([insertPayload]);

        if (!insErr) return;
        console.warn("Direct Supabase insert notice:", insErr);
      }
    }
  } catch (directErr) {
    console.warn("Direct Supabase update failed, attempting REST fallback:", directErr);
  }

  // 2. Secondary fallback: REST API endpoint
  const res = await fetch('/api/hrms/attendance/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, date, status, checkIn, checkOut })
  }).catch(() => null);

  if (res && res.ok) return;

  throw new Error('Failed to update attendance record');
}

export async function forceCloseAttendanceSession(
  empId: string, 
  date: string, 
  time?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .update({
        check_out_time: time ,
        punch_note: 'Force closed by admin'
      })
      .eq('employee_id', empId)
      .eq('date', date)
      .is('check_out_time', null);

    if (!error) return;
  } catch (err) {
    console.warn("Direct force-close failed, trying REST fallback:", err);
  }

  // REST API fallback
  try {
    await fetch('/api/hrms/attendance/force-close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ empId, date, time })
    });
  } catch {}
}
