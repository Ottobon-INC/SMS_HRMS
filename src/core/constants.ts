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

// Available Color Themes for Custom Shifts
export const SHIFT_COLOR_PALETTES = [
  { name: 'Emerald', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: 'Teal', class: 'bg-teal-100 text-teal-800 border-teal-200' },
  { name: 'Cyan', class: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { name: 'Sky / Blue', class: 'bg-sky-100 text-sky-800 border-sky-200' },
  { name: 'Indigo / Purple', class: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-800 border-orange-200' },
  { name: 'Rose', class: 'bg-rose-100 text-rose-800 border-rose-200' },
  { name: 'Slate / Off', class: 'bg-slate-100 text-slate-800 border-slate-200' }
];

// Default Standard Shift Timings (Fallback)
export const PREDEFINED_SHIFTS: ShiftTemplate[] = [
  { label: 'Morning Shift', start: '08:00', end: '16:00', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', isActive: true, displayOrder: 1 },
  { label: 'General Shift 1', start: '09:00', end: '17:00', colorClass: 'bg-teal-100 text-teal-800 border-teal-200', isActive: true, displayOrder: 2 },
  { label: 'General Shift 2', start: '10:00', end: '18:00', colorClass: 'bg-cyan-100 text-cyan-800 border-cyan-200', isActive: true, displayOrder: 3 },
  { label: 'Afternoon Shift', start: '13:00', end: '20:00', colorClass: 'bg-orange-100 text-orange-800 border-orange-200', isActive: true, displayOrder: 4 },
  { label: 'Night Shift', start: '20:00', end: '08:00', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', isActive: true, isOvernight: true, displayOrder: 5 },
  { label: 'Off', start: '00:00', end: '00:00', colorClass: 'bg-slate-100 text-slate-800 border-slate-200', isActive: true, displayOrder: 6 }
];

export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
