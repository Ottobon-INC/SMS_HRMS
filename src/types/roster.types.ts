export interface ShiftTemplate {
  id?: string;
  label: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  colorClass: string;
  isActive?: boolean;
  isOvernight?: boolean;
  displayOrder?: number;
}

export interface DutyRosterShift {
  id: string;
  employeeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  shiftLabel?: string;
  notes?: string;
  isPublished: boolean;
  isOvernight?: boolean;
}
