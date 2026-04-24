type NominatimResult = {
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
  };
};

/**
 * Street autocomplete via Nominatim (OpenStreetMap). Hebrew-locale,
 * country-scoped to IL, results filtered to road / pedestrian / footway
 * and deduplicated.
 *
 * Caller must debounce; respect Nominatim's 1 rps usage policy.
 */
export async function searchStreets(
  query: string,
  city: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cityParam = city ? `, ${city}` : '';
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      countrycodes: 'il',
      limit: '8',
      'accept-language': 'he',
      q: q + cityParam,
    }).toString();

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'he', 'User-Agent': 'Shakana/1.0 (streets)' },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];

  const unique = new Set<string>();
  for (const r of data) {
    const name = r.address?.road ?? r.address?.pedestrian ?? r.address?.footway;
    if (name) unique.add(name);
  }
  return Array.from(unique).slice(0, 6);
}
