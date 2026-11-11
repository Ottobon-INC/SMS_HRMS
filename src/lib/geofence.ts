import { supabase } from './supabase-client';
import { DB_TABLES } from '../core/database.tables';
import { OfficeLocation, SpecialLocationEvent } from '../types';

/** Haversine formula — returns distance in metres between two GPS points */
export function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoCheckResult {
  allowed: boolean;
  matchedLocation?: string;    // e.g., "Main Office - Vizag"
  distance?: number;           // metres from nearest office
  nearestOfficeName?: string;  // for error message
}

/** Check if employee GPS is within any allowed location's radius */
export function checkGeofence(
  userLat: number, userLng: number,
  allowedLocations: OfficeLocation[],
  accuracyMeters?: number
): GeoCheckResult {
  if (allowedLocations.length === 0) {
    return { allowed: false, nearestOfficeName: "No configured locations" };
  }

  let minDistance = Infinity;
  let nearestOffice = allowedLocations[0];
  let matchedOffice: OfficeLocation | undefined = undefined;

  for (const loc of allowedLocations) {
    const dist = getDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestOffice = loc;
    }
    // Effective radius: use configured radius (minimum 100m for clinical buildings)
    // plus device accuracy tolerance for indoor attenuation (capped at 50m)
    const baseRadius = Math.max(loc.radius_meters || 100, 100);
    const accuracyBuffer = (accuracyMeters && accuracyMeters > 0) ? Math.min(accuracyMeters, 50) : 0;
    if (dist <= (baseRadius + accuracyBuffer)) {
      matchedOffice = loc;
      break;
    }
  }

  if (matchedOffice) {
    return { allowed: true, matchedLocation: matchedOffice.name, distance: Math.round(minDistance) };
  } else {
    return { 
      allowed: false, 
      distance: Math.round(minDistance), 
      nearestOfficeName: nearestOffice.name 
    };
  }
}

/** Fetches all geo-fence locations this employee can check in from today */
export async function resolveAllowedLocations(
  employeeId: string,
  today: string // YYYY-MM-DD
): Promise<OfficeLocation[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hrms_auth_token') : null;
  if (token) {
    try {
      const res = await fetch(`/api/hrms/allowed-locations?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(today)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (Array.isArray(json.locations)) {
          return json.locations.map((m: any) => ({
            id: m.id,
            name: m.name,
            latitude: Number(m.latitude),
            longitude: Number(m.longitude),
            radius_meters: Number(m.radius_meters),
            is_active: m.is_active !== false
          }));
        }
      }
    } catch (apiErr) {
      console.warn("API allowed-locations fetch notice:", apiErr);
    }
  }

  // 1. Fetch permanent active office locations
  const { data: offices } = await supabase
    .from(DB_TABLES.OFFICE_LOCATIONS)
    .select('*')
    .eq('is_active', true);
    
  const officeLocations: OfficeLocation[] = (offices || []).map(o => ({
    id: o.id,
    name: o.name,
    latitude: parseFloat(o.latitude),
    longitude: parseFloat(o.longitude),
    radius_meters: o.radius_meters,
    is_active: o.is_active
  }));

  // 2. Fetch special events active today for this employee
  const { data: assignees } = await supabase
    .from(DB_TABLES.SPECIAL_EVENT_ASSIGNEES)
    .select('event_id')
    .eq('employee_id', employeeId);
    
  let specialEventsLocations: OfficeLocation[] = [];
  
  if (assignees && assignees.length > 0) {
    const eventIds = assignees.map(a => a.event_id);
    
    const { data: events } = await supabase
      .from(DB_TABLES.SPECIAL_LOCATION_EVENTS)
      .select('*')
      .in('id', eventIds)
      .lte('from_date', today)
      .gte('to_date', today);
      
    specialEventsLocations = (events || []).map(e => ({
      id: e.id,
      name: e.name, // e.g. "Medical Camp - Gajuwaka"
      latitude: parseFloat(e.latitude),
      longitude: parseFloat(e.longitude),
      radius_meters: e.radius_meters,
      is_active: true
    }));
  }

  // 3. Merge: employee can check in from office OR from camp
  return [...officeLocations, ...specialEventsLocations];
}
