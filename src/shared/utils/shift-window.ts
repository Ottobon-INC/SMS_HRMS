import { DutyRosterShift } from '../../types';

export interface ShiftWindowStatus {
  allowed: boolean;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  windowStartStr: string;
  windowEndStr: string;
  cutoffTime?: string;
  isEarly: boolean;
  isLate: boolean;
  message?: string;
}

/**
 * Checks if current time is within the allowed punch-in window for the employee's shift.
 * Rules:
 * 1. If assigned an active Duty Roster shift:
 *    Window is [shiftStart - 30 minutes, shiftStart + 30 minutes].
 *    Example: Shift starts at 08:00 AM -> Window is 07:30 AM to 08:30 AM.
 *    After 08:30 AM -> Direct punch-in is locked; employee must submit a Missed Punch Request.
 * 2. Standard Shift Windows (fallback if no custom roster shift):
 *    - Morning Shift: Starts 06:00 AM, allowed window 06:00 AM - 10:30 AM.
 *    - Afternoon Shift: Starts 01:00 PM (13:00), allowed window 01:00 PM - 01:30 PM.
 *    - Night Shift: Starts 08:00 PM (20:00), allowed window 08:00 PM - 08:30 PM.
 */
export function getShiftPunchInWindow(
  todayShift: DutyRosterShift | null,
  now: Date = new Date()
): ShiftWindowStatus {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  if (todayShift && todayShift.shiftLabel !== 'Off') {
    const shiftLabel = todayShift.shiftLabel || 'Assigned Shift';
    const shiftStart = todayShift.shiftStart || '08:00';
    const shiftEnd = todayShift.shiftEnd || '16:00';

    const [startH, startM] = shiftStart.split(':').map(Number);
    const shiftStartMinutes = startH * 60 + startM;

    // Morning shift has grace up to 10:30 AM if labeled morning or starts between 6 and 8
    const isMorningShift = shiftLabel.toLowerCase().includes('morning') || (startH >= 6 && startH <= 8);
    const windowStartMinutes = Math.max(0, shiftStartMinutes - 30); // 30 mins early arrival buffer
    const windowEndMinutes = isMorningShift 
      ? Math.max(shiftStartMinutes + 30, 10 * 60 + 30) // morning allows up to 10:30 AM
      : shiftStartMinutes + 30; // standard 30 mins from start

    const windowStartStr = formatMins(windowStartMinutes);
    const windowEndStr = formatMins(windowEndMinutes);

    if (currentMinutes < windowStartMinutes) {
      return {
        allowed: false,
        shiftLabel,
        shiftStart,
        shiftEnd,
        windowStartStr,
        windowEndStr,
        isEarly: true,
        isLate: false,
        message: `Shift starts at ${shiftStart}. Punch-in opens at ${windowStartStr} (30 mins before).`
      };
    }

    if (currentMinutes > windowEndMinutes) {
      return {
        allowed: false,
        shiftLabel,
        shiftStart,
        shiftEnd,
        windowStartStr,
        windowEndStr,
        isEarly: false,
        isLate: true,
        message: `Punch-in window closed at ${windowEndStr}. You must apply for a Missed Punch Request.`
      };
    }

    return {
      allowed: true,
      shiftLabel,
      shiftStart,
      shiftEnd,
      windowStartStr,
      windowEndStr,
      isEarly: false,
      isLate: false
    };
  }

  // Fallback when no shift in roster:
  // Morning: 06:00 - 10:30 AM
  // Afternoon: 13:00 - 13:30 PM (1:00 - 1:30 PM)
  // Night: 20:00 - 20:30 PM (8:00 - 8:30 PM)
  if (currentMinutes >= 6 * 60 && currentMinutes <= 10 * 60 + 30) {
    return {
      allowed: true,
      shiftLabel: 'Morning Shift',
      shiftStart: '06:00',
      shiftEnd: '14:00',
      windowStartStr: '06:00 AM',
      windowEndStr: '10:30 AM',
      isEarly: false,
      isLate: false
    };
  } else if (currentMinutes >= 13 * 60 && currentMinutes <= 13 * 60 + 30) {
    return {
      allowed: true,
      shiftLabel: 'Afternoon Shift',
      shiftStart: '13:00',
      shiftEnd: '21:00',
      windowStartStr: '01:00 PM',
      windowEndStr: '01:30 PM',
      isEarly: false,
      isLate: false
    };
  } else if (currentMinutes >= 20 * 60 && currentMinutes <= 20 * 60 + 30) {
    return {
      allowed: true,
      shiftLabel: 'Night Shift',
      shiftStart: '20:00',
      shiftEnd: '04:00',
      windowStartStr: '08:00 PM',
      windowEndStr: '08:30 PM',
      isEarly: false,
      isLate: false
    };
  } else {
    // Current time is past cutoff
    let cutoffStr = '10:30 AM';
    if (currentMinutes > 10 * 60 + 30 && currentMinutes < 13 * 60) {
      cutoffStr = '10:30 AM (Morning Shift)';
    } else if (currentMinutes > 13 * 60 + 30 && currentMinutes < 20 * 60) {
      cutoffStr = '01:30 PM (Afternoon Shift)';
    } else {
      cutoffStr = '08:30 PM (Night Shift)';
    }

    return {
      allowed: false,
      shiftLabel: 'Shift Closed',
      shiftStart: '--:--',
      shiftEnd: '--:--',
      windowStartStr: '--:--',
      windowEndStr: cutoffStr,
      isEarly: false,
      isLate: true,
      message: `Direct punch-in is closed (Cutoff: ${cutoffStr}). Please submit a Missed Punch Request.`
    };
  }
}
