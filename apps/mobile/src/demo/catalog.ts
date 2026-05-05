export type DemoBrandId = 'hm' | 'zara';

export type DemoProduct = {
  id: string;
  brand: DemoBrandId;
  name: string;
  price: number;
  compareAtPrice: number;
  sku: string;
  description: string;
  image: string;
  category: 'Best Sellers' | 'New Arrivals' | 'Shirts' | 'Pants' | 'Dresses' | 'Accessories';
  sizes: string[];
  colors: string[];
  stockStatus: 'In stock' | 'Low stock' | 'Last units';
};

export type DemoStore = {
  id: DemoBrandId;
  name: string;
  tagline: string;
  deliveryEta: string;
  accent: string;
  logoText: string;
  heroImage: string;
};

export const FREE_SHIPPING_GOAL = 400;
export const DELIVERY_FEE = 25;

export const demoStores: Record<DemoBrandId, DemoStore> = {
  hm: {
    id: 'hm',
    name: 'H&M',
    tagline: 'Everyday fashion, consolidated by Shakana',
    deliveryEta: '35-50 min merchant handling',
    accent: '#D4001A',
    logoText: 'H&M',
    heroImage:
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1400&q=80',
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    tagline: 'Premium city wardrobe, one shared delivery',
    deliveryEta: '40-55 min merchant handling',
    accent: '#111111',
    logoText: 'ZARA',
    heroImage:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=80',
  },
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const demoProducts: DemoProduct[] = [
  {
    id: 'hm-linen-shirt',
    brand: 'hm',
    name: 'H&M Linen-Blend Shirt',
    price: 119,
    compareAtPrice: 139,
    sku: 'HM-SH-1048',
    description: 'Lightweight linen-blend button-up with a relaxed resort fit.',
    image: img('photo-1603252109303-2751441dd157'),
    category: 'Best Sellers',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['White', 'Sage', 'Sky Blue'],
    stockStatus: 'In stock',
  },
  {
    id: 'hm-wide-jeans',
    brand: 'hm',
    name: 'H&M Wide High Jeans',
    price: 159,
    compareAtPrice: 189,
    sku: 'HM-DN-8821',
    description: 'Wide-leg denim with a high waist and soft washed finish.',
    image: img('photo-1541099649105-f69ad21f3246'),
    category: 'Pants',
    sizes: ['30', '32', '34', '36', '38', '40'],
    colors: ['Blue', 'Washed Black'],
    stockStatus: 'Low stock',
  },
  {
    id: 'hm-rib-dress',
    brand: 'hm',
    name: 'H&M Rib-Knit Midi Dress',
    price: 129,
    compareAtPrice: 149,
    sku: 'HM-DR-3320',
    description: 'Soft ribbed dress with clean neckline and weekend-ready stretch.',
    image: img('photo-1515372039744-b8f02a3ae446'),
    category: 'Dresses',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Black', 'Cream', 'Brown'],
    stockStatus: 'In stock',
  },
  {
    id: 'hm-cargo-trousers',
    brand: 'hm',
    name: 'H&M Relaxed Cargo Trousers',
    price: 149,
    compareAtPrice: 169,
    sku: 'HM-PT-7714',
    description: 'Cotton twill cargo trousers with adjustable hems and utility pockets.',
    image: img('photo-1506629905607-d405d7d3b0d2'),
    category: 'New Arrivals',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Khaki', 'Black', 'Stone'],
    stockStatus: 'Last units',
  },
  {
    id: 'hm-basic-tee',
    brand: 'hm',
    name: 'H&M Premium Cotton T-Shirt',
    price: 49,
    compareAtPrice: 59,
    sku: 'HM-TS-2105',
    description: 'Dense cotton jersey tee with a straight fit and soft neckline.',
    image: img('photo-1521572163474-6864f9cf17ab'),
    category: 'Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Red', 'Navy'],
    stockStatus: 'In stock',
  },
  {
    id: 'hm-crossbody',
    brand: 'hm',
    name: 'H&M Quilted Crossbody Bag',
    price: 99,
    compareAtPrice: 119,
    sku: 'HM-AC-6673',
    description: 'Compact quilted bag with zip closure and adjustable strap.',
    image: img('photo-1591561954557-26941169b49e'),
    category: 'Accessories',
    sizes: ['One size'],
    colors: ['Black', 'Beige', 'Burgundy'],
    stockStatus: 'In stock',
  },
  {
    id: 'zara-basic-tee',
    brand: 'zara',
    name: 'Zara Basic Heavy T-Shirt',
    price: 89,
    compareAtPrice: 109,
    sku: 'ZA-TS-4102',
    description: 'Heavy cotton T-shirt with a boxy silhouette and premium hand feel.',
    image: img('photo-1503342217505-b0a15ec3261c'),
    category: 'Best Sellers',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Taupe'],
    stockStatus: 'In stock',
  },
  {
    id: 'zara-tailored-pants',
    brand: 'zara',
    name: 'Zara Tailored Straight Pants',
    price: 229,
    compareAtPrice: 259,
    sku: 'ZA-PT-9027',
    description: 'Straight tailored pants with pressed crease and concealed fastening.',
    image: img('photo-1594633312681-425c7b97ccd1'),
    category: 'Pants',
    sizes: ['32', '34', '36', '38', '40', '42'],
    colors: ['Black', 'Charcoal', 'Sand'],
    stockStatus: 'Low stock',
  },
  {
    id: 'zara-poplin-shirt',
    brand: 'zara',
    name: 'Zara Oversized Poplin Shirt',
    price: 179,
    compareAtPrice: 199,
    sku: 'ZA-SH-5539',
    description: 'Crisp poplin shirt with dropped shoulders and long cuffs.',
    image: img('photo-1602810318383-e386cc2a3ccf'),
    category: 'Shirts',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['White', 'Blue Stripe', 'Black'],
    stockStatus: 'In stock',
  },
  {
    id: 'zara-slip-dress',
    brand: 'zara',
    name: 'Zara Satin Slip Dress',
    price: 249,
    compareAtPrice: 279,
    sku: 'ZA-DR-1180',
    description: 'Fluid satin midi dress with adjustable straps and clean drape.',
    image: img('photo-1539008835657-9e8e9680c956'),
    category: 'Dresses',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Ivory', 'Black', 'Deep Green'],
    stockStatus: 'In stock',
  },
  {
    id: 'zara-denim-jacket',
    brand: 'zara',
    name: 'Zara Cropped Denim Jacket',
    price: 299,
    compareAtPrice: 329,
    sku: 'ZA-JK-7082',
    description: 'Cropped denim jacket with structured shoulders and metal buttons.',
    image: img('photo-1551028719-00167b16eac5'),
    category: 'New Arrivals',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Mid Blue', 'Ecru'],
    stockStatus: 'Last units',
  },
  {
    id: 'zara-leather-belt',
    brand: 'zara',
    name: 'Zara Leather Belt',
    price: 119,
    compareAtPrice: 139,
    sku: 'ZA-AC-3305',
    description: 'Smooth leather belt with brushed metal buckle.',
    image: img('photo-1553062407-98eeb64c6a62'),
    category: 'Accessories',
    sizes: ['80', '85', '90', '95'],
    colors: ['Black', 'Brown'],
    stockStatus: 'In stock',
  },
];

export const demoCategories = [
  'Best Sellers',
  'New Arrivals',
  'Shirts',
  'Pants',
  'Dresses',
  'Accessories',
] as const;

export function productsForBrand(brand: DemoBrandId) {
  return demoProducts.filter((product) => product.brand === brand);
}

export function findProduct(productId: string) {
  return demoProducts.find((product) => product.id === productId);
}
