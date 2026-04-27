import { parseSharedProduct, summarizeSharedProduct } from '@/lib/sharedProduct';

describe('sharedProduct', () => {
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

  it('extracts a Zara product url from shared text', () => {
    const draft = parseSharedProduct({
      text: 'I found this on Zara: https://www.zara.com/il/en/crossbody-bag-p16064110.html?utm_source=app.',
      title: '',
    });

    expect(draft).toEqual({
      url: 'https://www.zara.com/il/en/crossbody-bag-p16064110.html',
      title: 'Crossbody Bag P16064110',
      source: 'zara',
      rawText: 'I found this on Zara: https://www.zara.com/il/en/crossbody-bag-p16064110.html?utm_source=app.',
    });
  });

  it('finds a Zara product inside a redirect-style share url', () => {
    const draft = parseSharedProduct({
      url: 'https://example.com/share?url=https%3A%2F%2Fwww.zara.com%2Fil%2Fen%2Ftextured-shirt-p01234567.html%3Futm_medium%3Dshare',
      title: 'Shared',
    });

    expect(draft).toEqual({
      url: 'https://www.zara.com/il/en/textured-shirt-p01234567.html',
      title: 'Shared',
      source: 'zara',
      rawText: undefined,
    });
  });

  it('accepts an H&M product url', () => {
    const draft = parseSharedProduct({
      url: 'https://www2.hm.com/hw_il/product-page.html?utm_source=share',
      title: '',
    });

    expect(draft).toEqual({
      url: 'https://www2.hm.com/hw_il/product-page.html',
      title: 'Product Page',
      source: 'hm',
      rawText: undefined,
    });
  });

  it('extracts a 1+1 promotion and H&M shipping details', () => {
    const draft = {
      url: 'https://www2.hm.com/hw_il/product-page.html',
      title: 'Shirt',
      source: 'hm' as const,
    };

    const html = `
      <html>
        <head>
          <meta property="og:title" content="H&M | Shirt" />
          <meta name="description" content="1+1 on selected items" />
          <meta property="og:image" content="https://example.com/image.jpg" />
          <script type="application/ld+json">
            {
              "@type": "Product",
              "name": "Shirt",
              "brand": { "@type": "Brand", "name": "H&M" },
              "description": "Cotton shirt for everyday wear",
              "color": "Black",
              "sku": "HM123",
              "offers": { "price": "129.00" }
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    const insights = summarizeSharedProduct(draft, html);

    expect(insights.brandName).toBe('H&M');
    expect(insights.promotionText).toBe('1+1');
    expect(insights.priceAgorot).toBe(12900);
    expect(insights.deliveryFeeAgorot).toBe(3000);
    expect(insights.freeShippingThresholdAgorot).toBe(19900);
    expect(insights.productFacts).toEqual(
      expect.arrayContaining(['H&M', '1+1', 'Color: Black', 'SKU: HM123']),
    );
  });

  it('reads Zara minor-unit prices from embedded page data', () => {
    const draft = {
      url: 'https://www.zara.com/il/en/crossbody-bag-p16064110.html',
      title: 'Bag',
      source: 'zara' as const,
    };

    const insights = summarizeSharedProduct(draft, `
      <html>
        <head><meta property="og:title" content="Crossbody Bag | ZARA" /></head>
        <body>{"price":19990,"currency":"ILS"}</body>
      </html>
    `);

    expect(insights.priceAgorot).toBe(19990);
    expect(insights.deliveryFeeAgorot).toBe(0);
  });

  it('rejects non-supported links', () => {
    expect(
      parseSharedProduct({
        url: 'https://example.com/product/123',
      }),
    ).toBeNull();
  });

  it('rejects Zara links that are not product pages', () => {
    expect(
      parseSharedProduct({
        url: 'https://www.zara.com/il/en/cart',
      }),
    ).toBeNull();
  });
});
