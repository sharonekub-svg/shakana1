import { parseSharedProduct } from '@/lib/sharedProduct';

describe('parseSharedProduct', () => {
  it('accepts a Zara product url and strips tracking params', () => {
    const draft = parseSharedProduct({
      url: 'https://www.zara.com/il/he/product-name-p123456.html?utm_source=share&fbclid=abc',
      title: '',
    });

    expect(draft).toEqual({
      url: 'https://www.zara.com/il/he/product-name-p123456.html',
      title: 'Product Name P123456',
      source: 'zara',
      rawText: undefined,
    });
  });

  it('extracts a Zara url from shared text', () => {
    const draft = parseSharedProduct({
      text: 'Check this out: https://www.zara.com/il/en/dress-p765432.html',
    });

    expect(draft?.url).toBe('https://www.zara.com/il/en/dress-p765432.html');
    expect(draft?.source).toBe('zara');
  });

  it('rejects non-zara links', () => {
    expect(
      parseSharedProduct({
        url: 'https://example.com/product/123',
      }),
    ).toBeNull();
  });
});
