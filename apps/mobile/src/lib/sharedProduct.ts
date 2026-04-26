import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'shakana.pendingSharedProduct';

export type SharedProductDraft = {
  url: string;
  title: string;
  source: 'zara';
  rawText?: string;
};

const ALLOWED_HOSTS = new Set(['zara.com', 'www.zara.com', 'm.zara.com', 'static.zara.com']);
const TRACKER_KEYS = new Set(['gclid', 'fbclid', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']);

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
