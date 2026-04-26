import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { env } from './env';

const STORAGE_KEY = 'shakana.pendingSharedProduct';

export type SharedProductDraft = {
  url: string;
  title: string;
  source: 'zara';
  rawText?: string;
};

export type SharedProductInsights = {
  title: string;
  imageUrl: string | null;
  priceAgorot: number | null;
  originalPriceAgorot: number | null;
  deliveryFeeAgorot: number;
  storePickupFeeAgorot: number;
  freeShippingThresholdAgorot: number;
  recommendedParticipants: number;
  neighborsNeeded: number;
  perPersonAgorot: number;
  dealSummary: string | null;
  sourceUrl: string;
};

const ALLOWED_HOSTS = new Set(['zara.com', 'www.zara.com', 'm.zara.com', 'static.zara.com']);
const TRACKER_KEYS = new Set(['gclid', 'fbclid', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);
const HOME_DELIVERY_FEE_AGOROT = 3000;
const STORE_PICKUP_FEE_AGOROT = 0;
const FREE_SHIPPING_THRESHOLD_AGOROT = 19900;
const TARGET_SHARE_AGOROT = 6000;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(normalizeHost(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

function stripTrackingParams(url: URL): URL {
  const cleaned = new URL(url.toString());
  const keys = cleaned.search
    .replace(/^\?/, '')
    .split('&')
    .map((pair) => pair.split('=')[0] ?? '')
    .filter((key): key is string => key.length > 0);
  keys.forEach((key) => {
    if (key.startsWith('utm_') || TRACKER_KEYS.has(key)) {
      cleaned.searchParams.delete(key);
    }
  });
  cleaned.hash = '';
  return cleaned;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match?.[0] ?? null;
}

function humanizeSlug(slug: string): string {
  const cleaned = slug
    .replace(/\.(html?|aspx?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'ZARA item';
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function inferTitleFromUrl(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[parts.length - 1] ?? '';
  const title = humanizeSlug(slug);
  return title === 'Item' ? 'ZARA item' : title;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readMeta(html: string, key: string, attr: 'property' | 'name' = 'property'): string | null {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() || null;
}

function readFirstJsonLdObject(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== 'object') continue;
        const obj = item as Record<string, unknown>;
        const type = obj['@type'];
        if (typeof type === 'string' && type.toLowerCase().includes('product')) {
          return obj;
        }
        if (Array.isArray(type) && type.some((entry) => typeof entry === 'string' && entry.toLowerCase().includes('product'))) {
          return obj;
        }
        for (const value of Object.values(obj)) {
          if (Array.isArray(value)) stack.push(...value);
          else if (value && typeof value === 'object') stack.push(value as Record<string, unknown>);
        }
      }
    } catch {
      // Ignore malformed JSON-LD and continue scanning.
    }
  }
  return null;
}

function parseMoneyToAgorot(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw).replace(/[^\d.,-]/g, '');
  if (!text) return null;
  const normalized = text.includes(',') && text.includes('.')
    ? text.replace(/,/g, '')
    : text.replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function chooseTitle(html: string, fallback: string): string {
  const jsonLd = readFirstJsonLdObject(html);
  const ogTitle = readMeta(html, 'og:title');
  const twitterTitle = readMeta(html, 'twitter:title');
  const ldTitle = jsonLd && typeof jsonLd.name === 'string' ? jsonLd.name : null;
  const headTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const raw = ldTitle ?? ogTitle ?? twitterTitle ?? headTitleMatch?.[1] ?? fallback;
  return stripTags(raw).replace(/\s+\|\s+ZARA.*$/i, '').trim() || fallback;
}

function chooseImage(html: string): string | null {
  const jsonLd = readFirstJsonLdObject(html);
  const ldImage = jsonLd?.image;
  if (typeof ldImage === 'string') return ldImage;
  if (Array.isArray(ldImage)) {
    const first = ldImage.find((item) => typeof item === 'string');
    if (typeof first === 'string') return first;
  }
  return readMeta(html, 'og:image') ?? readMeta(html, 'twitter:image');
}

function choosePriceAgorot(html: string): number | null {
  const jsonLd = readFirstJsonLdObject(html);
  const offers = jsonLd?.offers;
  if (offers && typeof offers === 'object') {
    const obj = offers as Record<string, unknown>;
    const direct = parseMoneyToAgorot(obj.price as string | number | undefined);
    if (direct) return direct;
    if (Array.isArray(obj.priceSpecification)) {
      for (const spec of obj.priceSpecification) {
        if (spec && typeof spec === 'object') {
          const next = parseMoneyToAgorot((spec as Record<string, unknown>).price as string | number | undefined);
          if (next) return next;
        }
      }
    }
  }

  const metaPrice =
    readMeta(html, 'product:price:amount') ??
    readMeta(html, 'og:price:amount') ??
    readMeta(html, 'twitter:data1', 'name');
  const parsedMeta = parseMoneyToAgorot(metaPrice);
  if (parsedMeta) return parsedMeta;

  const match = html.match(/"price"\s*:\s*"?(?<price>\d+(?:[.,]\d+)?)"?/i);
  return parseMoneyToAgorot(match?.groups?.price ?? null);
}

function deriveDealSummary(priceAgorot: number | null, originalPriceAgorot: number | null): string | null {
  if (!priceAgorot || !originalPriceAgorot || originalPriceAgorot <= priceAgorot) return null;
  const discount = Math.round((1 - priceAgorot / originalPriceAgorot) * 100);
  return `${discount}% off`;
}

function deriveParticipants(priceAgorot: number | null, deliveryFeeAgorot: number): number {
  const total = (priceAgorot ?? 0) + deliveryFeeAgorot;
  return Math.max(2, Math.min(5, Math.ceil(total / TARGET_SHARE_AGOROT)));
}

export function summarizeSharedProduct(draft: SharedProductDraft, html?: string | null): SharedProductInsights {
  const priceAgorot = html ? choosePriceAgorot(html) : null;
  const originalPriceAgorot = null;
  const deliveryFeeAgorot = priceAgorot && priceAgorot >= FREE_SHIPPING_THRESHOLD_AGOROT
    ? 0
    : HOME_DELIVERY_FEE_AGOROT;
  const recommendedParticipants = deriveParticipants(priceAgorot, deliveryFeeAgorot);
  const neighborsNeeded = Math.max(1, recommendedParticipants - 1);
  const perPersonAgorot = Math.ceil(((priceAgorot ?? 0) + deliveryFeeAgorot) / recommendedParticipants);

  return {
    title: html ? chooseTitle(html, draft.title) : draft.title,
    imageUrl: html ? chooseImage(html) : null,
    priceAgorot,
    originalPriceAgorot,
    deliveryFeeAgorot,
    storePickupFeeAgorot: STORE_PICKUP_FEE_AGOROT,
    freeShippingThresholdAgorot: FREE_SHIPPING_THRESHOLD_AGOROT,
    recommendedParticipants,
    neighborsNeeded,
    perPersonAgorot,
    dealSummary: deriveDealSummary(priceAgorot, originalPriceAgorot),
    sourceUrl: draft.url,
  };
}

export async function loadSharedProductInsights(draft: SharedProductDraft): Promise<SharedProductInsights> {
  try {
    const res = await fetch(draft.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return summarizeSharedProduct(draft);
    const html = await res.text();
    return summarizeSharedProduct(draft, html);
  } catch {
    return summarizeSharedProduct(draft);
  }
}

export function parseSharedProduct(input: {
  text?: string | null;
  url?: string | null;
  title?: string | null;
}): SharedProductDraft | null {
  const raw = input.url?.trim() || (input.text ? extractUrl(input.text) : null);
  if (!raw) return null;

  const url = safeUrl(raw);
  if (!url) return null;

  const isZara = normalizeHost(url.hostname).endsWith('zara.com');
  if (!isZara) return null;

  const cleanUrl = stripTrackingParams(url);
  const title = (input.title ?? '').trim() || inferTitleFromUrl(cleanUrl);

  return {
    url: cleanUrl.toString(),
    title,
    source: 'zara',
    rawText: input.text ?? undefined,
  };
}

export async function stashPendingSharedProduct(draft: SharedProductDraft): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage failures; the share can still continue in-memory.
  }
}

export async function consumePendingSharedProduct(): Promise<SharedProductDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return JSON.parse(raw) as SharedProductDraft;
  } catch {
    return null;
  }
}

export async function peekPendingSharedProduct(): Promise<SharedProductDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SharedProductDraft;
  } catch {
    return null;
  }
}

export function buildShareRoute(draft: SharedProductDraft): string {
  const params = new URLSearchParams({
    url: draft.url,
    title: draft.title,
    source: draft.source,
  });
  return `/share?${params.toString()}`;
}

export function buildAppShareUrl(draft: SharedProductDraft): string {
  const params = new URLSearchParams({
    url: draft.url,
    title: draft.title,
    source: draft.source,
  });
  return `${env.appScheme}://share?${params.toString()}`;
}
