import { AttendanceStatus, PunchType } from '../../types';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hrms_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function autoExpireMissedPunches(empId: string): Promise<void> {
  try {
    await fetch('/api/hrms/attendance/auto-expire-missed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ empId })
    });
  } catch (err) {
    console.error("Error auto-expiring missed punches:", err);
  }
}

export async function checkMissedPunchOut(empId: string): Promise<{ missedDate: string; hasPending: boolean } | null> {
  try {
    const res = await fetch(`/api/hrms/attendance/missed-punchout?empId=${encodeURIComponent(empId)}`, {
      headers: {
        ...getAuthHeader()
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.missedDate) {
        return { missedDate: data.missedDate, hasPending: !!data.hasPending };
      }
    }
  } catch (err) {
    console.error("Error checking missed punch-out:", err);
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
  const res = await fetch('/api/hrms/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, location, latLng, photoUrl, punchType, punchNote })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Failed to record clock-in');
  }
}

export async function clockOutEmployee(
  empId: string, 
  photoUrl?: string,
  location?: string,
  latLng?: string
): Promise<void> {
  const res = await fetch('/api/hrms/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, photoUrl, location, latLng })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Failed to record clock-out');
  }
}

export async function updateAttendanceRecord(
  empId: string,
  date: string,
  status: AttendanceStatus,
  checkIn?: string,
  checkOut?: string
): Promise<void> {
  const res = await fetch('/api/hrms/attendance/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ empId, date, status, checkIn, checkOut })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Failed to update attendance record');
  }
}
