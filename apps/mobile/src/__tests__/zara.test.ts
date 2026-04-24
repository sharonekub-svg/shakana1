import { buildZaraCartUrl } from '@/lib/zara';

describe('buildZaraCartUrl', () => {
  it('assembles a ZARA cart url with refs and an order shakana tag', () => {
    const url = buildZaraCartUrl('abc-123', [
      { ref: '1111' },
      { ref: '2222' },
      { ref: null },
    ] as any);
    expect(url).toContain('https://www.zara.com/il/he/cart');
    expect(url).toContain('ref=shakana_abc-123');
    expect(url).toContain('items=1111%2C2222');
  });
});
