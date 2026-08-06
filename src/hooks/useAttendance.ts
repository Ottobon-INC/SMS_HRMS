import { AttendanceStatus, PunchType } from '../types';
import * as attendanceService from '../lib/services/attendance-service';
import * as leaveService from '../lib/services/leave-service';
import { checkGeofence, resolveAllowedLocations } from '../lib/geofence';
import { supabase } from '../lib/supabase-client';

export function useAttendance(isLocalMode: boolean, loadData: () => Promise<void>) {
  const toggleCheckIn = async (empId: string, isCurrentlyCheckedIn: boolean, photoData?: string, punchType: PunchType = 'in_office', punchNote?: string) => {

    if (isLocalMode) {
      alert("Attendance can only be recorded in online mode.");
      return;
    }
    
    try {
        let locationStr: string | undefined = undefined;
        let latLngStr: string | undefined = undefined;

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 20000, // 20 seconds
              maximumAge: 30000, // Accept up to 30-second old cached location
              enableHighAccuracy: true // Require accurate GPS for geofencing
            });
          });
          const { latitude, longitude } = position.coords;
          latLngStr = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

          // Reverse geocoding with strict 3-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            if (response.ok) {
              const data = await response.json();
              const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
              const state = data.address.state || '';
              const suburb = data.address.suburb || data.address.neighbourhood || '';
              locationStr = [suburb, city, state].filter(Boolean).join(', ');
            }
          } catch (e) {
            console.warn("Reverse geocoding timed out or failed:", e);
            locationStr = "Location details unavailable";
          }
          
          let geoCheck: any;
          if (punchType === 'out_of_office') {
            geoCheck = { allowed: true, matchedLocation: `Out of Office - ${locationStr || 'Location Unknown'}`, distance: 0 };
          } else {
            const today = new Date().toISOString().split('T')[0];
            const allowedLocations = await resolveAllowedLocations(empId, today);
            geoCheck = checkGeofence(latitude, longitude, allowedLocations);
          }
          
          if (!geoCheck.allowed) {
            return { success: false, geoError: geoCheck };
          }
          
          locationStr = geoCheck.matchedLocation || locationStr;
        } catch (err: any) {
          console.warn("Could not get location:", err);
          let errMsg = "Could not get your GPS location. Please enable location services and ensure Chrome has location permission.";
          if (err?.code === 1) errMsg = "Location permission denied. Please allow location access in your browser settings.";
          if (err?.code === 2) errMsg = "Location position unavailable. Please ensure your device GPS is turned on.";
          if (err?.code === 3) errMsg = "Location request timed out. Please try again in an open area.";
          return { success: false, error: errMsg };
        }

      if (isCurrentlyCheckedIn) {
        await attendanceService.clockOutEmployee(empId, photoData, locationStr, latLngStr);
        await loadData();
        return { success: true };
      } else {
        // 1. Run auto-expire for missed punch-outs older than 24 hours
        await attendanceService.autoExpireMissedPunches(empId);

        // 2. Check for missed punch-out from previous days before allowing punch in
        const missedDate = await attendanceService.checkMissedPunchOut(empId);
        if (missedDate) {
          // Check if a PENDING request already exists for this date
          const { data: existing } = await supabase
            .from('HRMS_missed_punch_requests')
            .select('id')
            .eq('employee_id', empId)
            .eq('missed_date', missedDate)
            .eq('status', 'pending')
            .maybeSingle();
            
          if (existing) {
            // Already submitted — tell employee to wait for admin approval
            return { success: false, error: `pending_request:${missedDate}` };
          }
          // No request yet — prompt employee to submit one
          return { success: false, error: `missed_punchout:${missedDate}` };
        }
        await attendanceService.clockInEmployee(empId, locationStr, latLngStr, photoData, punchType, punchNote);
      }
      
      await loadData();
      return { success: true };
    } catch (err: any) {
      console.error("Check-in error:", err);
      return { success: false, error: "Failed to record attendance. Please try again." };
    }
  };

  const updateAttendance = async (empId: string, date: string, status: AttendanceStatus, checkIn?: string, checkOut?: string) => {
    if (isLocalMode) {
      alert("Attendance can only be edited in online mode.");
      return;
    }
    
    await attendanceService.updateAttendanceRecord(empId, date, status, checkIn, checkOut);
    
    // Apply leave penalty if marked absent
    if (status === 'absent') {
      try {
        await leaveService.deductPenaltyLeave(empId, 'casual', 2); // Deduct 2 days from casual leave
      } catch (err) {
        console.warn("Could not deduct leave penalty:", err);
      }
    }
    
    await loadData();
  };

  const forceCloseSession = async (empId: string, date: string, time?: string) => {
    if (isLocalMode) {
      alert("Attendance can only be edited in online mode.");
      return;
    }
    
    const timeStr = time || '18:00:00'; // Default to 6 PM if not provided
    
    // Find active session for that date
    const { data: activeSessions, error: fetchErr } = await supabase
      .from('HRMS_attendance')
      .select('id')
      .eq('employee_id', empId)
      .eq('date', date)
      .is('check_out_time', null);
      
    if (fetchErr || !activeSessions || activeSessions.length === 0) return;
    
    for (const session of activeSessions) {
      await supabase
        .from('HRMS_attendance')
        .update({ check_out_time: timeStr, punch_note: 'Forced close by Admin' })
        .eq('id', session.id);
    }
    
    await loadData();
  };

  return {
    toggleCheckIn,
    updateAttendance,
    forceCloseSession
  };
}
