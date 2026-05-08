import { env } from '@/lib/env';
import { IL_CITIES } from '@/lib/israeliCities';

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
  suburb?: string;
};

type NominatimResult = {
  display_name?: string;
  class?: string;
  type?: string;
  name?: string;
  address?: NominatimAddress;
  namedetails?: Record<string, string>;
};

type DataGovRecord = Record<string, unknown>;
type DataGovResponse = {
  success?: boolean;
  result?: {
    records?: DataGovRecord[];
  };
};

type GooglePlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      text?: {
        text?: string;
      };
    };
    queryPrediction?: {
      text?: {
        text?: string;
      };
    };
  }>;
};

type SearchKind = 'city' | 'street';

const cache = new Map<string, string[]>();
const DATA_GOV_URL = 'https://data.gov.il/api/3/action/datastore_search';
const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DATA_GOV_CITIES_RESOURCE_ID = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
const DATA_GOV_STREETS_RESOURCE_ID = 'a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3';
const CITY_NAME_KEY = 'שם_ישוב';
const STREET_NAME_KEY = 'שם_רחוב';
const COMMON_STREETS: readonly string[] = [
  'הרצל',
  'ז׳בוטינסקי',
  'ויצמן',
  'בן גוריון',
  'ביאליק',
  'רוטשילד',
  'דיזנגוף',
  'אלנבי',
  'אבן גבירול',
  'המלך ג׳ורג׳',
  'ארלוזורוב',
  'דרך נמיר',
  'יגאל אלון',
  'העצמאות',
  'הנשיא',
  'ירושלים',
  'הרב קוק',
  'החלוץ',
  'הגפן',
  'הזית',
  'Herzl',
  'Jabotinsky',
  'Weizmann',
  'Ben Gurion',
  'Bialik',
  'Rothschild',
  'Dizengoff',
  'Allenby',
  'Ibn Gabirol',
  'King George',
];

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function scoreCandidate(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (c === q) return 10_000;
  if (c.startsWith(q)) return 8_000 - (c.length - q.length);
  if (c.includes(q)) return 5_000 - c.indexOf(q);
  return 0;
}

function sortByQuery(query: string, values: string[]): string[] {
  return [...values].sort((a, b) => scoreCandidate(query, b) - scoreCandidate(query, a) || a.localeCompare(b, 'he'));
}

function dataGovUrl(resourceId: string, query: string, limit = 50): string {
  const params = new URLSearchParams({
    resource_id: resourceId,
    limit: String(limit),
    q: query,
  });
  return `${DATA_GOV_URL}?${params.toString()}`;
}

function buildUrl(kind: SearchKind, query: string, language: 'he' | 'en', city?: string): string {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'il',
    limit: '12',
    'accept-language': language,
  });

  if (kind === 'city') {
    params.set('q', `${query}, Israel`);
    params.set('layer', 'address');
  } else {
    params.set('q', city ? `${query}, ${city}, Israel` : `${query}, Israel`);
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

function extractCityName(item: NominatimResult): string | null {
  const direct = item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.municipality ?? item.address?.suburb ?? item.address?.hamlet;
  if (direct) return direct;
  const name = item.name ?? item.namedetails?.name ?? item.display_name?.split(',')[0];
  return name?.trim() || null;
}

function extractStreetName(item: NominatimResult): string | null {
  return item.address?.road ?? item.address?.pedestrian ?? item.address?.footway ?? item.name ?? item.display_name?.split(',')[0] ?? null;
}

function extractCandidates(kind: SearchKind, query: string, results: NominatimResult[]): string[] {
  const values: string[] = [];
  for (const item of results) {
    const candidate = kind === 'city' ? extractCityName(item) : extractStreetName(item);
    if (candidate) values.push(candidate);
  }
  const ordered = sortByQuery(query, unique(values));
  return ordered.slice(0, 10);
}

async function searchDataGovCities(query: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch(dataGovUrl(DATA_GOV_CITIES_RESOURCE_ID, query, 30), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as DataGovResponse;
    const values =
      data.result?.records?.flatMap((record) => {
        const city = cleanName(record[CITY_NAME_KEY]);
        return city ? [city] : [];
      }) ?? [];
    return sortByQuery(query, unique(values)).slice(0, 10);
  } catch {
    return [];
  }
}

async function searchDataGovStreets(query: string, city: string | undefined, signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch(dataGovUrl(DATA_GOV_STREETS_RESOURCE_ID, query, 80), { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as DataGovResponse;
    const normalizedCity = normalize(city ?? '');
    const values =
      data.result?.records?.flatMap((record) => {
        const street = cleanName(record[STREET_NAME_KEY]);
        const recordCity = cleanName(record[CITY_NAME_KEY]);
        if (!street) return [];
        if (normalizedCity && recordCity && !normalize(recordCity).includes(normalizedCity)) return [];
        return city ? [street] : recordCity ? [`${street}, ${recordCity}`] : [street];
      }) ?? [];
    return sortByQuery(query, unique(values)).slice(0, 12);
  } catch {
    return [];
  }
}

async function searchGooglePlaces(query: string, language: 'he' | 'en', city?: string, signal?: AbortSignal): Promise<string[]> {
  if (!env.googleMapsApiKey) return [];
  const input = city ? `${query}, ${city}, Israel` : `${query}, Israel`;
  try {
    const res = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googleMapsApiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.text.text,suggestions.queryPrediction.text.text',
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['il'],
        languageCode: language === 'he' ? 'he' : 'en',
      }),
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GooglePlacesAutocompleteResponse;
    const values =
      data.suggestions?.flatMap((suggestion) => {
        const text = cleanName(suggestion.placePrediction?.text?.text ?? suggestion.queryPrediction?.text?.text);
        return text ? [text.replace(/,\s*Israel$/i, '')] : [];
      }) ?? [];
    return sortByQuery(query, unique(values)).slice(0, 8);
  } catch {
    return [];
  }
}

async function searchRemote(
  kind: SearchKind,
  query: string,
  language: 'he' | 'en',
  signal?: AbortSignal,
  city?: string,
): Promise<string[]> {
  const trimmed = query.trim();
  const localPool = kind === 'city' ? IL_CITIES : COMMON_STREETS;
  const fallback = sortByQuery(
    trimmed,
    localPool.filter((value) => normalize(value).includes(normalize(trimmed))),
  ).slice(0, 8);
  if (trimmed.length < 2) return fallback;

  const cacheKey = `${kind}:${language}:${city ?? ''}:${trimmed}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const [googleResult, govResult, nominatimResult] = await Promise.all([
      searchGooglePlaces(trimmed, language, city, signal),
      kind === 'city' ? searchDataGovCities(trimmed, signal) : searchDataGovStreets(trimmed, city, signal),
      fetch(buildUrl(kind, trimmed, language, city), {
        headers: { 'Accept-Language': language },
        signal,
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = (await res.json()) as NominatimResult[];
          return extractCandidates(kind, trimmed, data);
        })
        .catch(() => []),
    ]);
    const merged = sortByQuery(trimmed, unique([...googleResult, ...govResult, ...nominatimResult, ...fallback])).slice(0, 12);
    cache.set(cacheKey, merged);
    return merged;
  } catch {
    return fallback;
  }
}

export async function searchCities(query: string, language: 'he' | 'en', signal?: AbortSignal): Promise<string[]> {
  return searchRemote('city', query, language, signal);
}

export async function searchStreets(
  query: string,
  city: string,
  language: 'he' | 'en',
  signal?: AbortSignal,
): Promise<string[]> {
  return searchRemote('street', query, language, signal, city);
}

export function rankCities(query: string, candidates: string[]): string[] {
  return sortByQuery(query, unique(candidates));
}
