import { supabase } from '../../core/supabase';
import { DB_TABLES } from '../../core/database.tables';
import { AttendanceStatus, PunchType } from '../../types';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hrms_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function autoExpireMissedPunches(empId: string): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoffTime = yesterday.toISOString();

  try {
    const { data: expiredRequests, error: fetchErr } = await supabase
      .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
      .select('id, missed_date')
      .eq('employee_id', empId)
      .eq('punch_type', 'out')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime);

    if (!fetchErr && expiredRequests && expiredRequests.length > 0) {
      for (const req of expiredRequests) {
        // Update attendance record to Half-day
        const { data: att } = await supabase
          .from(DB_TABLES.ATTENDANCE)
          .select('id')
          .eq('employee_id', empId)
          .eq('date', req.missed_date)
          .limit(1);

        if (att && att.length > 0) {
          await supabase
            .from(DB_TABLES.ATTENDANCE)
            .update({ status: 'Half-day', check_out_time: '18:00:00', punch_note: 'Auto-closed by system (Missed punch)' })
            .eq('id', att[0].id);
        }

        // Update request status to rejected
        await supabase
          .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
          .update({
            status: 'rejected',
            admin_note: 'Auto-expired: 24-hr window passed. Marked as half-day.',
            resolved_at: new Date().toISOString()
          })
          .eq('id', req.id);
      }
      return;
    }
  } catch (err) {
    console.warn("Direct auto-expire check notice:", err);
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

export async function checkMissedPunchOut(empId: string): Promise<{ missedDate: string; hasPending: boolean } | null> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // 1. Look for unclosed sessions older than today
    const { data: openSessions, error: openErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('date')
      .eq('employee_id', empId)
      .is('check_out_time', null)
      .lt('date', todayStr)
      .order('date', { ascending: false });

    if (!openErr && openSessions && openSessions.length > 0) {
      for (const session of openSessions) {
        // Check if there is an approved missed punch request
        const { data: approvedReq } = await supabase
          .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
          .select('id')
          .eq('employee_id', empId)
          .eq('missed_date', session.date)
          .eq('status', 'approved')
          .maybeSingle();

        if (approvedReq) {
          // Auto-close session if request was approved
          await supabase
            .from(DB_TABLES.ATTENDANCE)
            .update({ check_out_time: '18:00:00', punch_note: 'Auto-closed by system (Previously Approved)' })
            .eq('employee_id', empId)
            .eq('date', session.date)
            .is('check_out_time', null);
          continue;
        }

        // Check if there is a pending missed punch request
        const { data: pendingReq } = await supabase
          .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
          .select('id')
          .eq('employee_id', empId)
          .eq('missed_date', session.date)
          .eq('status', 'pending')
          .maybeSingle();

        return { missedDate: session.date, hasPending: !!pendingReq };
      }
    }
    return null;
  } catch (err) {
    console.warn("Direct check missed punch-out notice:", err);
  }

  // REST API fallback
  try {
    const res = await fetch(`/api/hrms/attendance/missed-punchout?empId=${encodeURIComponent(empId)}`, {
      headers: { ...getAuthHeader() }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.missedDate) {
        return { missedDate: data.missedDate, hasPending: !!data.hasPending };
      }
    }
  } catch {}

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
  latLng?: string
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    const { data: existingSessions, error: fetchErr } = await supabase
      .from(DB_TABLES.ATTENDANCE)
      .select('id, session_number, check_out_time')
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
          status: 'Present', 
          check_out_time: timeStr,
          session_number: nextSession
        };
        if (photoUrl) payload.check_out_photo_url = photoUrl;
        if (location) payload.check_out_location = location;
        if (latLng) payload.check_out_lat_lng = latLng;
        
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
    body: JSON.stringify({ empId, photoUrl, location, latLng })
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
