import * as SecureStore from 'expo-secure-store';
import { env } from './env';

const STORAGE_KEY = 'shakana.pendingSharedProduct';

export type SharedProductDraft = {
  url: string;
  title: string;
  source: 'zara' | 'hm';
  rawText?: string;
};

export type SharedProductInsights = {
  title: string;
  brandName: string | null;
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
  promotionText: string | null;
  productFacts: string[];
  sourceLabel: string;
  sourceUrl: string;
};

const TRACKER_KEYS = new Set([
  'gclid',
  'fbclid',
  'igshid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

const STORE_PICKUP_FEE_AGOROT = 0;
const TARGET_SHARE_AGOROT = 6000;
const DEFAULT_HOME_DELIVERY_FEE_AGOROT = 3000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT = 19900;

type BrandConfig = {
  source: SharedProductDraft['source'];
  brandName: string;
  displayName: string;
  hostTest: (hostname: string) => boolean;
  productPathTest: (url: URL) => boolean;
  homeDeliveryFeeAgorot: number;
  freeShippingThresholdAgorot: number;
};

const BRAND_CONFIGS: BrandConfig[] = [
  {
    source: 'zara',
    brandName: 'Zara',
    displayName: 'Zara',
    hostTest: (hostname) => normalizeHost(hostname).endsWith('zara.com'),
    productPathTest: (url) => /(?:^|-)p\d{5,}(?:\.html)?$/i.test(url.pathname.split('/').pop() ?? ''),
    homeDeliveryFeeAgorot: DEFAULT_HOME_DELIVERY_FEE_AGOROT,
    freeShippingThresholdAgorot: DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT,
  },
  {
    source: 'hm',
    brandName: 'H&M',
    displayName: 'H&M',
    hostTest: (hostname) => normalizeHost(hostname).endsWith('hm.com'),
    productPathTest: (url) => /product(?:-|_)page|\/product\//i.test(url.pathname),
    homeDeliveryFeeAgorot: DEFAULT_HOME_DELIVERY_FEE_AGOROT,
    freeShippingThresholdAgorot: DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT,
  },
];

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function getBrandConfig(hostname: string): BrandConfig | null {
  return BRAND_CONFIGS.find((config) => config.hostTest(hostname)) ?? null;
}

function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(cleanRawUrl(raw));
    if (url.protocol !== 'https:') return null;
    const brand = getBrandConfig(url.hostname);
    if (!brand || !brand.productPathTest(url)) return null;
    return url;
  } catch {
    return null;
  }
}

function stripTrackingParams(url: URL): URL {
  const cleaned = new URL(url.toString());
  const keysToDelete: string[] = [];
  cleaned.searchParams.forEach((_, key) => {
    if (key.startsWith('utm_') || TRACKER_KEYS.has(key)) keysToDelete.push(key);
  });
  for (const key of keysToDelete) cleaned.searchParams.delete(key);
  cleaned.hash = '';
  return cleaned;
}

function cleanRawUrl(raw: string): string {
  return raw
    .trim()
    .replace(/^[<("']+/, '')
    .replace(/[>)"',.]+$/, '');
}

function getCandidateUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const decodedMatches = matches.flatMap((candidate) => {
    try {
      const url = new URL(cleanRawUrl(candidate));
      return ['url', 'u', 'link', 'productUrl', 'redirect'].map((key) => url.searchParams.get(key)).filter(Boolean) as string[];
    } catch {
      return [];
    }
  });
  return [...matches, ...decodedMatches].map(cleanRawUrl);
}

function extractUrl(text: string): string | null {
  return getCandidateUrls(text).find((candidate) => safeUrl(candidate)) ?? null;
}

function humanizeSlug(slug: string): string {
  const cleaned = slug
    .replace(/\.(html?|aspx?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Product item';
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function inferTitleFromUrl(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const slug = parts[parts.length - 1] ?? '';
  const title = humanizeSlug(slug);
  return title === 'Item' ? 'Product item' : title;
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
      // ignore malformed JSON-LD
    }
  }
  return null;
}

function readDescription(html: string): string | null {
  const jsonLd = readFirstJsonLdObject(html);
  const ldDescription = jsonLd && typeof jsonLd.description === 'string' ? jsonLd.description : null;
  return readMeta(html, 'description', 'name') ?? readMeta(html, 'og:description') ?? ldDescription;
}

function readBrand(html: string): string | null {
  const jsonLd = readFirstJsonLdObject(html);
  const brand = jsonLd?.brand;
  if (typeof brand === 'string') return brand.trim() || null;
  if (brand && typeof brand === 'object') {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return readMeta(html, 'og:site_name');
}

function chooseTitle(html: string, fallback: string): string {
  const jsonLd = readFirstJsonLdObject(html);
  const ogTitle = readMeta(html, 'og:title');
  const twitterTitle = readMeta(html, 'twitter:title');
  const ldTitle = jsonLd && typeof jsonLd.name === 'string' ? jsonLd.name : null;
  const headTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const raw = ldTitle ?? ogTitle ?? twitterTitle ?? headTitleMatch?.[1] ?? fallback;
  return stripTags(raw).replace(/\s+[-|]\s+(ZARA|H&M).*$/i, '').trim() || fallback;
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

function parseStoreMinorUnitsToAgorot(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw).replace(/[^\d]/g, '');
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value >= 1000 ? value : value * 100;
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

  const structuredMinorUnitMatch = html.match(/"price"\s*:\s*"?(?<price>\d{4,7})"?/i);
  const minorUnits = parseStoreMinorUnitsToAgorot(structuredMinorUnitMatch?.groups?.price ?? null);
  if (minorUnits) return minorUnits;

  const match = html.match(/"price"\s*:\s*"?(?<price>\d+(?:[.,]\d+)?)"?/i);
  return parseMoneyToAgorot(match?.groups?.price ?? null);
}

function chooseOriginalPriceAgorot(html: string): number | null {
  const candidates = [
    readMeta(html, 'product:original_price:amount'),
    readMeta(html, 'og:original_price:amount'),
    readMeta(html, 'price:original', 'name'),
  ];
  for (const candidate of candidates) {
    const parsed = parseMoneyToAgorot(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function choosePromotionText(html: string): string | null {
  const description = readDescription(html);
  const text = stripTags(html).slice(0, 12000);
  const normalized = [description, text].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  const promoPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\b1\s*\+\s*1\b/i, label: '1+1' },
    { pattern: /\bbuy\s*1\s*get\s*1\b/i, label: 'Buy 1 get 1' },
    { pattern: /\b2\s*(?:for|x|×)\s*1\b/i, label: '2 for 1' },
    { pattern: /קנה\s*1\s*קבל\s*1/i, label: '1+1' },
    { pattern: /\bsale\b/i, label: 'Sale' },
    { pattern: /מבצע/i, label: 'מבצע' },
  ];
  for (const entry of promoPatterns) {
    if (entry.pattern.test(normalized)) return entry.label;
  }
  return null;
}

function formatAmountShort(agorot: number): string {
  return (agorot / 100).toFixed(2).replace(/\.00$/, '');
}

function chooseProductFacts(
  html: string,
  brandName: string | null,
  promotionText: string | null,
  priceAgorot: number | null,
  originalPriceAgorot: number | null,
): string[] {
  const facts = new Set<string>();
  const jsonLd = readFirstJsonLdObject(html);

  if (brandName) facts.add(brandName);
  if (promotionText) facts.add(promotionText);

  const color = jsonLd && typeof jsonLd.color === 'string' ? jsonLd.color.trim() : null;
  const sku = jsonLd && typeof jsonLd.sku === 'string' ? jsonLd.sku.trim() : null;
  const category = jsonLd && typeof jsonLd.category === 'string' ? jsonLd.category.trim() : null;
  const description = readDescription(html);

  if (color) facts.add(`Color: ${color}`);
  if (sku) facts.add(`SKU: ${sku}`);
  if (category) facts.add(category);
  if (description) facts.add(description.replace(/\s+/g, ' ').slice(0, 120));
  if (priceAgorot && originalPriceAgorot && originalPriceAgorot > priceAgorot) {
    facts.add(`Before ${formatAmountShort(originalPriceAgorot)}`);
  }

  return [...facts].filter(Boolean);
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
  const brandConfig = getBrandConfig(new URL(draft.url).hostname);
  const priceAgorot = html ? choosePriceAgorot(html) : null;
  const originalPriceAgorot = html ? chooseOriginalPriceAgorot(html) : null;
  const brandName = html ? readBrand(html) : null;
  const promotionText = html ? choosePromotionText(html) : null;
  const deliveryFeeAgorot = brandConfig && priceAgorot && priceAgorot >= brandConfig.freeShippingThresholdAgorot
    ? 0
    : (brandConfig?.homeDeliveryFeeAgorot ?? DEFAULT_HOME_DELIVERY_FEE_AGOROT);
  const freeShippingThresholdAgorot = brandConfig?.freeShippingThresholdAgorot ?? DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT;
  const recommendedParticipants = deriveParticipants(priceAgorot, deliveryFeeAgorot);
  const neighborsNeeded = Math.max(1, recommendedParticipants - 1);
  const perPersonAgorot = Math.ceil(((priceAgorot ?? 0) + deliveryFeeAgorot) / recommendedParticipants);
  const productFacts = html
    ? chooseProductFacts(html, brandName ?? brandConfig?.brandName ?? null, promotionText, priceAgorot, originalPriceAgorot)
    : [];

  return {
    title: html ? chooseTitle(html, draft.title) : draft.title,
    brandName: brandName ?? brandConfig?.brandName ?? null,
    imageUrl: html ? chooseImage(html) : null,
    priceAgorot,
    originalPriceAgorot,
    deliveryFeeAgorot,
    storePickupFeeAgorot: STORE_PICKUP_FEE_AGOROT,
    freeShippingThresholdAgorot,
    recommendedParticipants,
    neighborsNeeded,
    perPersonAgorot,
    dealSummary: deriveDealSummary(priceAgorot, originalPriceAgorot),
    promotionText,
    productFacts,
    sourceLabel: brandConfig?.displayName ?? draft.source.toUpperCase(),
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
  const candidates = [
    ...(input.url ? [input.url] : []),
    ...(input.url ? getCandidateUrls(input.url) : []),
    ...(input.text ? getCandidateUrls(input.text) : []),
  ];
  const raw = candidates.find((candidate) => safeUrl(candidate)) ?? (input.text ? extractUrl(input.text) : null);
  if (!raw) return null;

  const url = safeUrl(raw);
  if (!url) return null;

  const brandConfig = getBrandConfig(url.hostname);
  if (!brandConfig) return null;

  const cleanUrl = stripTrackingParams(url);
  const title = (input.title ?? '').trim() || inferTitleFromUrl(cleanUrl);

  return {
    url: cleanUrl.toString(),
    title,
    source: brandConfig.source,
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
