export function getPosition(enableHighAccuracy: boolean, timeout: number, maximumAge: number = 180000): Promise<GeolocationPosition> {
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

export async function getReverseGeocode(latitude: number, longitude: number): Promise<string | undefined> {
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
      return [suburb, city, state].filter(Boolean).join(', ');
    }
  } catch {
    // Ignore fetch errors / timeouts
  }
  return undefined;
}

export async function getCurrentLocationSafe(): Promise<{ latitude?: number; longitude?: number; address?: string; error?: string }> {
  try {
    let position: GeolocationPosition | null = null;
    try {
      position = await getPosition(false, 6000, 180000);
    } catch {
      position = await getPosition(true, 20000, 60000);
    }

    const { latitude, longitude } = position.coords;
    const address = await getReverseGeocode(latitude, longitude);

    return { latitude, longitude, address: address || "Location details unavailable" };
  } catch (err: any) {
    console.warn("Could not get location:", err);
    let errMsg = "Could not get your GPS location. Please ensure location services are enabled on your device.";
    if (err?.code === 1) errMsg = "Location access denied in your browser.\n\nPlease tap the lock icon 🔒 next to the website address in Chrome, set Location to 'Allow', and reload.";
    if (err?.code === 2) errMsg = "Location is turned off or unavailable on this device.\n\nPlease turn on Location in your phone's quick settings and ensure Chrome has location permission in Android Settings.";
    if (err?.code === 3) errMsg = "GPS satellite signal timed out.\n\nPlease move closer to a window, door, or open area and try again.";
    return { error: errMsg };
  }
}
