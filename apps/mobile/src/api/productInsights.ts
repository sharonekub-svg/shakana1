import { supabase } from '@/lib/supabase';

type FetchProductPageResponse = {
  html: string;
};

export async function fetchProductPageHtml(url: string): Promise<string | null> {
  const endpoint =
    typeof window === 'undefined'
      ? `https://${process.env.EXPO_PUBLIC_UNIVERSAL_LINK_HOST ?? 'shakana1.vercel.app'}/api/fetch-product-page`
      : '/api/fetch-product-page';

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as FetchProductPageResponse;
  return payload.html || null;
}
