import { supabase } from '../supabase-client';
import { AttendanceStatus, PunchType } from '../../types';

export async function checkMissedPunchOut(empId: string): Promise<string | null> {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Look for any session for this employee where check_out_time is null, and date is strictly less than today
  const { data, error } = await supabase
    .from('HRMS_attendance')
    .select('date')
    .eq('employee_id', empId)
    .is('check_out_time', null)
    .lt('date', todayStr)
    .order('date', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking missed punch-out:", error);
    return null; // Fail gracefully
  }

  if (data && data.length > 0) {
    return data[0].date;
  }

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

  // Find max session number for today
  const { data: existingSessions, error: sessionErr } = await supabase
    .from('HRMS_attendance')
    .select('session_number')
    .eq('employee_id', empId)
    .eq('date', todayStr);

  if (sessionErr) throw sessionErr;

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
    .from('HRMS_attendance')
    .insert([payload]);

  if (error && (error.code === '42703' || error.code === 'PGRST204') && photoUrl) {
    console.warn("check_in_photo_url column missing, falling back to without photo");
    delete payload.check_in_photo_url;
    const retry = await supabase.from('HRMS_attendance').insert([payload]);
    if (retry.error) throw retry.error;
  } else if (error) {
    throw error;
  }
}

export async function clockOutEmployee(
  empId: string, 
  photoUrl?: string,
  location?: string,
  latLng?: string
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  // Find the most recent active session
  const { data: existingSessions, error: fetchErr } = await supabase
    .from('HRMS_attendance')
    .select('id, session_number, check_out_time')
    .eq('employee_id', empId)
    .eq('date', todayStr)
    .order('session_number', { ascending: false });

  if (fetchErr) throw fetchErr;

  const activeSession = existingSessions?.find(s => s.check_out_time === null);

  if (activeSession) {
    const payload: any = { 
      check_out_time: timeStr
    };
    if (photoUrl) payload.check_out_photo_url = photoUrl;
    if (location) payload.check_out_location = location;
    if (latLng) payload.check_out_lat_lng = latLng;
    
    const { error } = await supabase
      .from('HRMS_attendance')
      .update(payload)
      .eq('id', activeSession.id);
    if (error) throw error;
  } else {
    // If no active session found to clock out, just return or create a new session if needed.
    // For now, if somehow missing, we just create a new row.
    const { data: allSessions } = await supabase
      .from('HRMS_attendance')
      .select('session_number')
      .eq('employee_id', empId)
      .eq('date', todayStr);
      
    let nextSession = 1;
    if (allSessions && allSessions.length > 0) {
      nextSession = Math.max(...allSessions.map((s: any) => s.session_number || 1)) + 1;
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
      .from('HRMS_attendance')
      .insert([payload]);
    if (error) throw error;
  }
}

export async function updateAttendanceRecord(
  empId: string,
  date: string,
  status: AttendanceStatus,
  checkIn?: string,
  checkOut?: string
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('HRMS_attendance')
    .select('id')
    .eq('employee_id', empId)
    .eq('date', date)
    .order('session_number', { ascending: true })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const firstSession = existing && existing.length > 0 ? existing[0] : null;

  // Title case for database consistency (Present, Absent, Leave, etc.)
  const dbStatus = status.charAt(0).toUpperCase() + status.slice(1);

  if (firstSession) {
    const { error } = await supabase
      .from('HRMS_attendance')
      .update({ 
        status: dbStatus, 
        check_in_time: checkIn || null, 
        check_out_time: checkOut || null 
      })
      .eq('id', firstSession.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_attendance')
      .insert([{ 
        employee_id: empId, 
        date: date, 
        status: dbStatus, 
        check_in_time: checkIn || null, 
        check_out_time: checkOut || null,
        session_number: 1
      }]);
    if (error) throw error;
  }
}
