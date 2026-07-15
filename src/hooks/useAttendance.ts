import { AttendanceStatus } from '../types';
import * as attendanceService from '../lib/services/attendance-service';

export function useAttendance(isLocalMode: boolean, loadData: () => Promise<void>) {
  const toggleCheckIn = async (empId: string, isCurrentlyCheckedIn: boolean) => {
    if (isLocalMode) {
      alert("Attendance can only be recorded in online mode.");
      return;
    }
    
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

      await attendanceService.clockInEmployee(empId, locationStr, latLngStr);
    }
    
    await loadData();
  };

  const updateAttendance = async (empId: string, date: string, status: AttendanceStatus, checkIn?: string, checkOut?: string) => {
    if (isLocalMode) {
      alert("Attendance can only be edited in online mode.");
      return;
    }
    
    await attendanceService.updateAttendanceRecord(empId, date, status, checkIn, checkOut);
    await loadData();
  };

  return {
    toggleCheckIn,
    updateAttendance
  };
}
