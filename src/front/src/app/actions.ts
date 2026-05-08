'use server';

interface GeocodingResult {
  lng: number;
  lat: number;
  placeName: string;
}

export async function geocodeLocation(query: string): Promise<GeocodingResult | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error('MAPBOX_ACCESS_TOKEN is not configured');

  const sanitized = query.trim();
  if (!sanitized || sanitized.length > 200) return null;
  if (!/^[a-zA-Z0-9\s,.\-'éèêëàâäùûüôöîïçñ]+$/u.test(sanitized)) return null;

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(sanitized)}.json?access_token=${token}`
  );

  if (!response.ok) return null;

  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].center;
    return { lng, lat, placeName: data.features[0].place_name };
  }

  return null;
}
