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

  it('rejects non-supported links', () => {
    expect(
      parseSharedProduct({
        url: 'https://example.com/product/123',
      }),
    ).toBeNull();
  });
});
