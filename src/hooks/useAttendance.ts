import { AttendanceStatus, PunchType } from '../types';
import * as attendanceService from '../lib/services/attendance-service';
import * as leaveService from '../lib/services/leave-service';
import { checkGeofence, resolveAllowedLocations } from '../lib/geofence';
import { supabase } from '../lib/supabase-client';
import { DB_TABLES } from '../core/database.tables';

/** Helper: get GPS position with a configurable timeout and accuracy mode */
function getPosition(enableHighAccuracy: boolean, timeout: number, maximumAge: number = 180000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout,
      maximumAge, // Allow cached GPS up to 3 minutes for instant indoor check-ins
      enableHighAccuracy,
    });
  });
}

export function useAttendance(isLocalMode: boolean, loadData: () => Promise<void>) {
  const toggleCheckIn = async (empId: string, isCurrentlyCheckedIn: boolean, photoData?: string, punchType: PunchType = 'in_office', punchNote?: string) => {

    if (isLocalMode) {
      alert("Attendance can only be recorded in online mode.");
      return;
    }
    
    try {
      let locationStr: string | undefined = undefined;
      let latLngStr: string | undefined = undefined;
      let latitude: number | null = null;
      let longitude: number | null = null;

      // STEP 1: GPS Position Acquisition
      try {
        let position: GeolocationPosition | null = null;
        try {
          // Fast-first: try network/cached location first (6s timeout, 3-minute cache)
          position = await getPosition(false, 6000, 180000);
        } catch {
          // High-accuracy fallback: give 20 seconds for satellite fix indoors
          position = await getPosition(true, 20000, 60000);
        }

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        latLngStr = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      } catch (gpsErr: any) {
        console.warn("Could not get GPS position:", gpsErr);

        if (punchType === 'out_of_office' || isCurrentlyCheckedIn) {
          locationStr = isCurrentlyCheckedIn
            ? "Punch-out - Location Unknown (GPS Unavailable)"
            : "Out of Office - Location Unknown (GPS Unavailable)";
          latLngStr = "0,0";
        } else {
          let errMsg = "Could not get your GPS location. Please ensure location services are enabled on your device.";
          if (gpsErr?.code === 1) {
            errMsg = "Location access denied in your browser.\n\nPlease tap the lock icon 🔒 next to the website address in Chrome, set Location to 'Allow', and reload.";
          } else if (gpsErr?.code === 2) {
            errMsg = "Location is turned off or unavailable on this device.\n\nPlease turn on Location in your phone's quick settings and ensure Chrome has location permission in Android Settings.";
          } else if (gpsErr?.code === 3) {
            errMsg = "GPS satellite signal timed out.\n\nPlease move closer to a window, door, or open area and try again.";
          }
          return { success: false, error: errMsg };
        }
      }

      // STEP 2: Reverse Geocoding (Optional text address)
      if (latitude !== null && longitude !== null) {
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
        } catch {
          locationStr = "Location details unavailable";
        }
      }

      // STEP 3: Geofence Verification (Decoupled from GPS error handling!)
      if (!isCurrentlyCheckedIn && punchType !== 'out_of_office') {
        if (latitude === null || longitude === null) {
          return { success: false, error: "GPS coordinates are required for in-office check-in." };
        }

        try {
          const today = new Date().toISOString().split('T')[0];
          const allowedLocations = await resolveAllowedLocations(empId, today);
          const geoCheck = checkGeofence(latitude, longitude, allowedLocations);
          if (!geoCheck.allowed) {
            return { success: false, geoError: geoCheck };
          }
          locationStr = geoCheck.matchedLocation || locationStr;
        } catch (geoErr: any) {
          console.error("Geofence verification error:", geoErr);
          return {
            success: false,
            error: `Unable to verify office location: ${geoErr.message || 'Server connection error'}. Please try again.`
          };
        }
      } else if (punchType === 'out_of_office') {
        locationStr = `Out of Office - ${locationStr || 'Location Unknown'}`;
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
            .from(DB_TABLES.MISSED_PUNCH_REQUESTS)
            .select('id')
            .eq('employee_id', empId)
            .eq('missed_date', missedDate)
            .eq('status', 'pending')
            .maybeSingle();
            
          if (!existing) {
            // No request yet — prompt employee to submit one
            return { success: false, error: `missed_punchout:${missedDate}` };
          }
          // If existing pending request found, allow punch in for today while admin reviews
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
      .from(DB_TABLES.ATTENDANCE)
      .select('id')
      .eq('employee_id', empId)
      .eq('date', date)
      .is('check_out_time', null);
      
    if (fetchErr || !activeSessions || activeSessions.length === 0) return;
    
    for (const session of activeSessions) {
      await supabase
        .from(DB_TABLES.ATTENDANCE)
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
