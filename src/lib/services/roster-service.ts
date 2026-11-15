import { supabase } from '../supabase-client';
import { DB_TABLES } from '../../core/database.tables';
import { DutyRosterShift, ShiftTemplate } from '../../types';
import { PREDEFINED_SHIFTS } from '../../core/constants';

const SHIFTS_LOCAL_KEY = 'sms_hrms_shift_templates_custom';

/**
 * Fetch all configured shift templates.
 * Checks LocalStorage -> Supabase dlabs.sms_hrms_shift_templates -> PREDEFINED_SHIFTS fallback
 */
export async function fetchShiftTemplates(): Promise<ShiftTemplate[]> {
  // 1. Check LocalStorage first for instant availability
  let localTemplates: ShiftTemplate[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SHIFTS_LOCAL_KEY);
      if (stored) {
        localTemplates = JSON.parse(stored);
      }
    } catch {}
  }

  // 2. Try Supabase
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.SHIFT_TEMPLATES)
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: ShiftTemplate[] = data.map((row: any) => ({
        id: row.id,
        label: row.label,
        start: row.start_time?.slice(0, 5) || '09:00',
        end: row.end_time?.slice(0, 5) || '17:00',
        colorClass: row.color_class,
        isActive: row.is_active,
        isOvernight: row.end_time <= row.start_time && row.label !== 'Off',
        displayOrder: row.display_order
      }));

      // Cache locally
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SHIFTS_LOCAL_KEY, JSON.stringify(mapped));
        } catch {}
      }
      return mapped;
    }
  } catch {}

  // 3. Fallback: Use LocalStorage cache or default predefined shifts
  if (localTemplates.length > 0) {
    return localTemplates;
  }

  return PREDEFINED_SHIFTS;
}

/**
 * Save or update a shift template.
 * Saves to LocalStorage and Supabase.
 */
export async function saveShiftTemplate(template: ShiftTemplate): Promise<void> {
  const isOvernight = template.end <= template.start && template.label !== 'Off';
  const cleanTemplate: ShiftTemplate = {
    ...template,
    isOvernight,
    isActive: true
  };

  // 1. Update LocalStorage immediately
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SHIFTS_LOCAL_KEY);
      let list: ShiftTemplate[] = stored ? JSON.parse(stored) : [...PREDEFINED_SHIFTS];
      const existingIdx = list.findIndex(s => s.label === cleanTemplate.label);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...cleanTemplate };
      } else {
        list.push({ ...cleanTemplate, displayOrder: list.length + 1 });
      }
      localStorage.setItem(SHIFTS_LOCAL_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('hrms:shifts-updated'));
    } catch {}
  }

  // 2. Persist to Supabase
  try {
    await supabase
      .from(DB_TABLES.SHIFT_TEMPLATES)
      .upsert({
        label: cleanTemplate.label,
        start_time: cleanTemplate.start,
        end_time: cleanTemplate.end,
        color_class: cleanTemplate.colorClass,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'label' });
  } catch (err) {
    console.warn('Supabase shift template save notice:', err);
  }
}

/**
 * Delete / deactivate a shift template by label
 */
export async function deleteShiftTemplate(label: string): Promise<void> {
  // 1. Update LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SHIFTS_LOCAL_KEY);
      if (stored) {
        let list: ShiftTemplate[] = JSON.parse(stored);
        list = list.filter(s => s.label !== label);
        localStorage.setItem(SHIFTS_LOCAL_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('hrms:shifts-updated'));
      }
    } catch {}
  }

  // 2. Soft-deactivate in Supabase
  try {
    await supabase
      .from(DB_TABLES.SHIFT_TEMPLATES)
      .update({ is_active: false })
      .eq('label', label);
  } catch (err) {
    console.warn('Supabase shift template deactivate notice:', err);
  }
}

/**
 * Propagate timing changes to upcoming duty roster entries with the same label
 */
export async function propagateShiftTimingChanges(label: string, newStart: string, newEnd: string): Promise<number> {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.DUTY_ROSTER)
      .update({
        shift_start: newStart,
        shift_end: newEnd
      })
      .eq('shift_label', label)
      .gte('shift_date', todayStr)
      .select('id');

    if (!error && data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hrms:roster-updated'));
      }
      return data.length;
    }
  } catch (err) {
    console.warn('Propagate timing notice:', err);
  }
  return 0;
}

/**
 * Fetch duty roster entries for a given week
 */
export async function fetchRoster(weekStartDate: string): Promise<DutyRosterShift[]> {
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekEndDateStr = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from(DB_TABLES.DUTY_ROSTER)
    .select('*')
    .gte('shift_date', weekStartDate)
    .lte('shift_date', weekEndDateStr);

  if (error) {
    console.error("Failed to fetch duty roster:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    employeeId: row.employee_id,
    shiftDate: row.shift_date,
    shiftStart: row.shift_start?.slice(0, 5) || row.shift_start,
    shiftEnd: row.shift_end?.slice(0, 5) || row.shift_end,
    shiftLabel: row.shift_label,
    notes: row.notes,
    isPublished: row.is_published,
    isOvernight: row.shift_end <= row.shift_start && row.shift_label !== 'Off'
  }));
}

/**
 * Upsert a shift entry for an employee on a specific date.
 * Defaults isPublished to true so the employee immediately sees their timing!
 */
export async function upsertShiftEntry(shift: Omit<DutyRosterShift, 'id'>): Promise<void> {
  const isPublished = shift.isPublished ?? true;
  const isOvernight = shift.shiftEnd <= shift.shiftStart && shift.shiftLabel !== 'Off';

  const { error } = await supabase
    .from(DB_TABLES.DUTY_ROSTER)
    .upsert({
      employee_id: shift.employeeId,
      shift_date: shift.shiftDate,
      shift_start: shift.shiftStart,
      shift_end: shift.shiftEnd,
      shift_label: shift.shiftLabel,
      notes: shift.notes,
      is_published: isPublished,
      created_at: new Date().toISOString()
    }, { onConflict: 'employee_id, shift_date' });

  if (error) {
    throw error;
  }

  // Broadcast change for immediate cross-tab and in-component synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hrms:roster-updated', {
      detail: { employeeId: shift.employeeId, shiftDate: shift.shiftDate, shift }
    }));
  }
}

/**
 * Delete a specific shift entry by ID or employee + date
 */
export async function deleteShiftEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.DUTY_ROSTER)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hrms:roster-updated'));
  }
}

/**
 * Delete shift entry for a specific employee and date (clear cell / revert to standard hours)
 */
export async function deleteShiftForCell(employeeId: string, shiftDate: string): Promise<void> {
  const { error } = await supabase
    .from(DB_TABLES.DUTY_ROSTER)
    .delete()
    .eq('employee_id', employeeId)
    .eq('shift_date', shiftDate);

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hrms:roster-updated', {
      detail: { employeeId, shiftDate, cleared: true }
    }));
  }
}

/**
 * Publish all shifts in a given week
 */
export async function publishRoster(weekStartDate: string): Promise<void> {
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekEndDateStr = endDate.toISOString().split('T')[0];

  const { error } = await supabase
    .from(DB_TABLES.DUTY_ROSTER)
    .update({ is_published: true })
    .gte('shift_date', weekStartDate)
    .lte('shift_date', weekEndDateStr);

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hrms:roster-updated'));
  }
}
