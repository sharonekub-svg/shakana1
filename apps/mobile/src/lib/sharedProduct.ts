import { env } from './env';
import { getStoredValue, removeStoredValue, setStoredValue } from './secureStorage';

const STORAGE_KEY = 'shakana.pendingSharedProduct';

export type SharedProductDraft = {
  url: string;
  title: string;
  source: string;
  storeLabel: string;
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
  amountMissingForFreeShippingAgorot: number | null;
};

export type ProductPageHtmlFetcher = (url: string) => Promise<string | null>;

const TRACKER_KEYS = new Set([
  'gclid',
  'fbclid',
  'igshid',
  '_encoding',
  'content-id',
  'dib',
  'dib_tag',
  'keywords',
  'pd_rd_r',
  'pd_rd_w',
  'pd_rd_wg',
  'qid',
  'ref',
  's',
  'sbo',
  'sr',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

const STORE_PICKUP_FEE_AGOROT = 0;
const DEFAULT_HOME_DELIVERY_FEE_AGOROT = 3000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT = 19900;
const CURRENCY_TO_ILS_AGOROT: Record<string, number> = {
  ILS: 100,
  USD: 313,
  EUR: 357,
  GBP: 424,
};

type BrandConfig = {
  source: string;
  brandName: string;
  displayName: string;
  hostTest: (hostname: string) => boolean;
  productPathTest: (url: URL) => boolean;
  homeDeliveryFeeAgorot: number;
  freeShippingThresholdAgorot: number;
};

const BRAND_CONFIGS: BrandConfig[] = [
  {
    source: 'amazon',
    brandName: 'Amazon',
    displayName: 'Amazon',
    hostTest: (hostname) => /(?:^|\.)amazon\./i.test(normalizeHost(hostname)),
    productPathTest: (url) => /\/dp\/[A-Z0-9]{10}(?:\/|$)/i.test(url.pathname),
    homeDeliveryFeeAgorot: DEFAULT_HOME_DELIVERY_FEE_AGOROT,
    freeShippingThresholdAgorot: DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT,
  },
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

function labelFromHostname(hostname: string): string {
  const host = normalizeHost(hostname).replace(/^m\./, '').replace(/^www2\./, '');
  const parts = host.split('.').filter(Boolean);
  const brandPart = parts.length > 2 ? parts[parts.length - 3] : parts[0];
  const raw = brandPart || host;
  const known: Record<string, string> = {
    amazon: 'Amazon',
    hm: 'H&M',
    zara: 'Zara',
  };
  return known[raw] ?? raw.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function sourceFromHostname(hostname: string): string {
  return labelFromHostname(hostname).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'store';
}

function looksLikeNonProductPage(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  if (!path || path === '/') return true;
  return /\/(?:cart|basket|checkout|login|account|search|category|categories|wishlist)(?:\/|$)/i.test(path);
}

function parseCleanUrl(raw: string): URL | null {
  try {
    const url = new URL(cleanRawUrl(raw));
    if (url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

function safeProductUrl(raw: string): URL | null {
  const url = parseCleanUrl(raw);
  if (!url) return null;
  const brand = getBrandConfig(url.hostname);
  if (!brand) return url;
  return brand.productPathTest(url) ? url : null;
}

function likelyProductUrl(raw: string): URL | null {
  const url = safeProductUrl(raw);
  if (!url || looksLikeNonProductPage(url)) return null;
  return url;
}

function stripTrackingParams(url: URL): URL {
  const cleaned = new URL(url.toString());
  const brand = getBrandConfig(cleaned.hostname);
  if (brand?.source === 'amazon') {
    const asin = cleaned.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
    if (asin) {
      const parts = cleaned.pathname.split('/').filter(Boolean);
      const dpIndex = parts.findIndex((part) => part.toLowerCase() === 'dp');
      const titleParts = dpIndex > 0 ? parts.slice(0, dpIndex) : [];
      cleaned.pathname = `/${titleParts.join('/')}/dp/${asin}`;
    }
    cleaned.search = '';
    cleaned.hash = '';
    return cleaned;
  }

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
  const candidates = getCandidateUrls(text);
  return (
    candidates.find((candidate) => {
      const url = likelyProductUrl(candidate);
      return url && getBrandConfig(url.hostname);
    }) ??
    candidates.find((candidate) => likelyProductUrl(candidate)) ??
    null
  );
}

function humanizeSlug(slug: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug;
    }
  })();
  const cleaned = decoded
    .replace(/\.(html?|aspx?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Product item';
  const title = cleaned
    .split(' ')
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
  return polishInferredTitle(title);
}

function polishInferredTitle(title: string): string {
  return title
    .replace(/\bASUS\s+Strix\b/i, 'ASUS ROG Strix')
    .replace(/\bAsus\b/g, 'ASUS')
    .replace(/\bRog\b/g, 'ROG')
    .trim();
}

function inferTitleFromUrl(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const amazonDpIndex = parts.findIndex((part) => part.toLowerCase() === 'dp');
  if (amazonDpIndex > 0) {
    const titleSlug = parts[amazonDpIndex - 1] ?? '';
    return humanizeSlug(titleSlug);
  }
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
  const stripped = stripTags(raw)
    .replace(/\s+\|\s+[^|]+$/i, '')
    .replace(/\s+-\s+(Amazon|ZARA|H&M).*$/i, '')
    .replace(/^Amazon\.[a-z.]+:\s*/i, '')
    .trim();
  return polishInferredTitle(stripped || fallback);
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

function detectCurrency(raw: string | number): keyof typeof CURRENCY_TO_ILS_AGOROT {
  const text = String(raw);
  if (/₪|NIS|ILS|ש["״]?ח/i.test(text)) return 'ILS';
  if (/€|EUR/i.test(text)) return 'EUR';
  if (/£|GBP/i.test(text)) return 'GBP';
  if (/\$|USD/i.test(text)) return 'USD';
  return 'ILS';
}

function parseMoneyToAgorot(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const currency = detectCurrency(raw);
  const text = String(raw).replace(/[^\d.,-]/g, '');
  if (!text) return null;
  const normalized = (() => {
    if (text.includes(',') && text.includes('.')) return text.replace(/,/g, '');
    if (text.includes(',') && /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) return text.replace(/,/g, '');
    return text.replace(',', '.');
  })();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rate = CURRENCY_TO_ILS_AGOROT[currency];
  return Math.round(value * (typeof rate === 'number' ? rate : 100));
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

  const amazonPricePatterns = [
    /class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*(?<price>[$₪€£]?\s?\d[\d,.]*)\s*</i,
    /id=["']priceblock_[^"']+["'][^>]*>\s*(?<price>[$₪€£]?\s?\d[\d,.]*)\s*</i,
    /"displayPrice"\s*:\s*"(?<price>[^"]*\d[^"]*)"/i,
  ];
  for (const pattern of amazonPricePatterns) {
    const parsed = parseMoneyToAgorot(html.match(pattern)?.groups?.price ?? null);
    if (parsed) return parsed;
  }

  const structuredMinorUnitMatch = html.match(/"price"\s*:\s*"?(?<price>\d{4,7})"?/i);
  const minorUnits = parseStoreMinorUnitsToAgorot(structuredMinorUnitMatch?.groups?.price ?? null);
  if (minorUnits) return minorUnits;

  const match = html.match(/"price"\s*:\s*"?(?<price>\d+(?:[.,]\d+)?)"?/i);
  return parseMoneyToAgorot(match?.groups?.price ?? null);
}

function chooseDeliveryFeeAgorot(html: string, fallbackAgorot: number): number {
  const text = stripTags(html).replace(/\s+/g, ' ').slice(0, 20000);
  if (/\bfree\s+(?:delivery|shipping)\b/i.test(text) || /משלוח\s+חינם/i.test(text)) return 0;

  const shippingPatterns = [
    /(?:shipping|delivery)[^$₪€£]{0,80}(?<price>[$₪€£]\s?\d[\d,.]*)/i,
    /(?<price>[$₪€£]\s?\d[\d,.]*)[^.]{0,80}(?:shipping|delivery)/i,
    /משלוח[^₪]{0,80}(?<price>₪\s?\d[\d,.]*)/i,
  ];
  for (const pattern of shippingPatterns) {
    const parsed = parseMoneyToAgorot(text.match(pattern)?.groups?.price ?? null);
    if (parsed != null) return parsed;
  }

  return fallbackAgorot;
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

export function summarizeSharedProduct(draft: SharedProductDraft, html?: string | null): SharedProductInsights {
  const brandConfig = getBrandConfig(new URL(draft.url).hostname);
  const priceAgorot = html ? choosePriceAgorot(html) : null;
  const originalPriceAgorot = html ? chooseOriginalPriceAgorot(html) : null;
  const brandName = html ? readBrand(html) : null;
  const promotionText = html ? choosePromotionText(html) : null;
  const fallbackDeliveryFeeAgorot = brandConfig && priceAgorot && priceAgorot >= brandConfig.freeShippingThresholdAgorot
    ? 0
    : (brandConfig?.homeDeliveryFeeAgorot ?? DEFAULT_HOME_DELIVERY_FEE_AGOROT);
  const deliveryFeeAgorot = html ? chooseDeliveryFeeAgorot(html, fallbackDeliveryFeeAgorot) : fallbackDeliveryFeeAgorot;
  const freeShippingThresholdAgorot = brandConfig?.freeShippingThresholdAgorot ?? DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT;
  const amountMissingForFreeShippingAgorot = priceAgorot == null ? null : Math.max(0, freeShippingThresholdAgorot - priceAgorot);
  const recommendedParticipants = 3;
  const neighborsNeeded = 2;
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
    sourceLabel: brandConfig?.displayName ?? draft.storeLabel,
    sourceUrl: draft.url,
    amountMissingForFreeShippingAgorot,
  };
}

export async function loadSharedProductInsights(
  draft: SharedProductDraft,
  fetchProductPageHtml?: ProductPageHtmlFetcher,
): Promise<SharedProductInsights> {
  if (fetchProductPageHtml) {
    try {
      const backendHtml = await fetchProductPageHtml(draft.url);
      if (backendHtml) return summarizeSharedProduct(draft, backendHtml);
    } catch {
      // Fall back to direct public fetch or manual entry if the backend lookup is unavailable.
    }
  }

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
  manualStoreLabel?: string | null;
}): SharedProductDraft | null {
  const candidates = [
    ...(input.url ? [input.url] : []),
    ...(input.url ? getCandidateUrls(input.url) : []),
    ...(input.text ? getCandidateUrls(input.text) : []),
  ];
  const raw =
    candidates.find((candidate) => {
      const url = likelyProductUrl(candidate);
      return url && getBrandConfig(url.hostname);
    }) ??
    candidates.find((candidate) => likelyProductUrl(candidate)) ??
    (input.text ? extractUrl(input.text) : null);
  if (!raw) return null;

  const url = likelyProductUrl(raw);
  if (!url) return null;

  const brandConfig = getBrandConfig(url.hostname);
  const cleanUrl = stripTrackingParams(url);
  const title = (input.title ?? '').trim() || inferTitleFromUrl(cleanUrl);
  const manualStoreLabel = (input.manualStoreLabel ?? '').trim();
  const inferredStoreLabel = brandConfig?.displayName ?? (manualStoreLabel || labelFromHostname(cleanUrl.hostname));

  return {
    url: cleanUrl.toString(),
    title,
    source: brandConfig?.source ?? sourceFromHostname(cleanUrl.hostname),
    storeLabel: inferredStoreLabel,
    rawText: input.text ?? undefined,
  };
}

export async function stashPendingSharedProduct(draft: SharedProductDraft): Promise<void> {
  try {
    await setStoredValue(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage failures; the share can still continue in-memory.
  }
}

export async function consumePendingSharedProduct(): Promise<SharedProductDraft | null> {
  try {
    const raw = await getStoredValue(STORAGE_KEY);
    if (!raw) return null;
    await removeStoredValue(STORAGE_KEY);
    return JSON.parse(raw) as SharedProductDraft;
  } catch {
    return null;
  }
}

export async function peekPendingSharedProduct(): Promise<SharedProductDraft | null> {
  try {
    const raw = await getStoredValue(STORAGE_KEY);
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
    storeLabel: draft.storeLabel,
  });
  return `/share?${params.toString()}`;
}

export function buildAppShareUrl(draft: SharedProductDraft): string {
  const params = new URLSearchParams({
    url: draft.url,
    title: draft.title,
    source: draft.source,
    storeLabel: draft.storeLabel,
  });
  return `${env.appScheme}://share?${params.toString()}`;
}
