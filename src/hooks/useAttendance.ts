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
      await attendanceService.clockInEmployee(empId);
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
