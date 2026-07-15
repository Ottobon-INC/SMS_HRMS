import { supabase } from '../supabase-client';
import { AttendanceStatus } from '../../types';

export async function clockInEmployee(
  empId: string, 
  location?: string, 
  latLng?: string
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
    const { error } = await supabase
      .from('HRMS_attendance')
      .update({ 
        check_in_time: timeStr, 
        status: 'Present',
        check_in_location: location || null,
        check_in_lat_lng: latLng || null
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
        check_in_time: timeStr,
        check_in_location: location || null,
        check_in_lat_lng: latLng || null
      }]);
    if (error) throw error;
  }
}

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
      .update({ check_out_time: timeStr })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('HRMS_attendance')
      .insert([{ employee_id: empId, date: todayStr, status: 'Present', check_out_time: timeStr }]);
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
