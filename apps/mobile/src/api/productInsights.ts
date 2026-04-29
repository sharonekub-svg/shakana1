import { invokeFn } from '@/lib/supabase';

type FetchProductPageResponse = {
  html: string;
};

export async function fetchProductPageHtml(url: string): Promise<string | null> {
  const res = await invokeFn<FetchProductPageResponse>('fetch-product-page', { url });
  return res.html || null;
}
