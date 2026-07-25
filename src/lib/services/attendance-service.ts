import { supabase } from '../supabase-client';
import { AttendanceStatus, PunchType } from '../../types';

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

  const { data: existing } = await supabase
    .from('HRMS_attendance')
    .select('id')
    .eq('employee_id', empId)
    .eq('date', todayStr)
    .maybeSingle();

  if (existing) {
    const payload: any = {
      check_in_time: timeStr, 
      status: 'Present',
      check_in_location: location || null,
      check_in_lat_lng: latLng || null,
      punch_type: punchType,
      punch_note: punchNote || null
    };
    if (photoUrl) payload.check_in_photo_url = photoUrl;

    const { error } = await supabase
      .from('HRMS_attendance')
      .update(payload)
      .eq('id', existing.id);
    
    // Fallback if column doesn't exist
    if (error && (error.code === '42703' || error.code === 'PGRST204') && photoUrl) {
      console.warn("check_in_photo_url column missing, falling back to without photo");
      delete payload.check_in_photo_url;
      const retry = await supabase.from('HRMS_attendance').update(payload).eq('id', existing.id);
      if (retry.error) throw retry.error;
    } else if (error) {
      throw error;
    }
  } else {
    const payload: any = {
      employee_id: empId, 
      date: todayStr, 
      status: 'Present', 
      check_in_time: timeStr,
      check_in_location: location || null,
      check_in_lat_lng: latLng || null,
      punch_type: punchType,
      punch_note: punchNote || null
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
}

export async function clockOutEmployee(
  empId: string, 
  photoUrl?: string,
  location?: string,
  latLng?: string
): Promise<void> {
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
    const payload: any = { 
      check_out_time: timeStr
    };
    if (photoUrl) payload.check_out_photo_url = photoUrl;
    if (location) payload.check_out_location = location;
    if (latLng) payload.check_out_lat_lng = latLng;
    
    const { error } = await supabase
      .from('HRMS_attendance')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const payload: any = { 
      employee_id: empId, 
      date: todayStr, 
      status: 'Present', 
      check_out_time: timeStr
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
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  // Title case for database consistency (Present, Absent, Leave, etc.)
  const dbStatus = status.charAt(0).toUpperCase() + status.slice(1);

  if (existing) {
    const { error } = await supabase
      .from('HRMS_attendance')
      .update({ 
        status: dbStatus, 
        check_in_time: checkIn || null, 
        check_out_time: checkOut || null 
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_attendance')
      .insert([{ 
        employee_id: empId, 
        date: date, 
        status: dbStatus, 
        check_in_time: checkIn || null, 
        check_out_time: checkOut || null 
      }]);
    if (error) throw error;
  }
}
