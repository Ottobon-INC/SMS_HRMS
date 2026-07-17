import { AttendanceStatus } from '../types';
import * as attendanceService from '../lib/services/attendance-service';
import * as leaveService from '../lib/services/leave-service';

export function useAttendance(isLocalMode: boolean, loadData: () => Promise<void>) {
  const toggleCheckIn = async (empId: string, isCurrentlyCheckedIn: boolean, photoData?: string) => {
    if (isLocalMode) {
      alert("Attendance can only be recorded in online mode.");
      return;
    }
    
    try {
      if (isCurrentlyCheckedIn) {
        await attendanceService.clockOutEmployee(empId);
      } else {
        let locationStr: string | undefined = undefined;
        let latLngStr: string | undefined = undefined;

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          const { latitude, longitude } = position.coords;
          latLngStr = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

          // Reverse geocoding (OpenStreetMap Nominatim)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
            const state = data.address.state || '';
            const suburb = data.address.suburb || data.address.neighbourhood || '';
            locationStr = [suburb, city, state].filter(Boolean).join(', ');
          }
        } catch (err) {
          console.warn("Could not get location:", err);
        }

        await attendanceService.clockInEmployee(empId, locationStr, latLngStr, photoData);
      }
      
      await loadData();
    } catch (err: any) {
      console.error("Check-in error:", err);
      alert("Failed to record attendance. Please try again.");
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

  return {
    toggleCheckIn,
    updateAttendance
  };
}
