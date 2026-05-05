import type { Product } from './types';

const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=70`;

export const PRODUCTS: Product[] = [
  // ===== H&M =====
  { id: 'hm-1', brand: 'hm', name: 'Cotton Crew T-Shirt', sku: 'HM-CT-001', description: 'Soft 100% cotton crew-neck tee. Everyday essential.', price: 49, category: 'best', image: img('1521572163474-6864f9cf17ab'), sizes: ['XS','S','M','L','XL'], colors: ['Black','White','Beige'], inStock: true, badge: 'Bestseller' },
  { id: 'hm-2', brand: 'hm', name: 'Slim Fit Jeans', sku: 'HM-JN-014', description: 'Classic 5-pocket slim jeans in stretch denim.', price: 149, category: 'pants', image: img('1542272604-787c3835535d'), sizes: ['28','30','32','34','36'], colors: ['Blue','Black'], inStock: true },
  { id: 'hm-3', brand: 'hm', name: 'Ribbed Tank Top', sku: 'HM-TT-022', description: 'Fitted ribbed tank, cropped length.', price: 39, category: 'shirts', image: img('1503342217505-b0a15ec3261c'), sizes: ['XS','S','M','L'], colors: ['White','Black','Pink'], inStock: true },
  { id: 'hm-4', brand: 'hm', name: 'Linen Summer Dress', sku: 'HM-DR-031', description: 'Breezy linen-blend midi dress with tie waist.', price: 199, category: 'dresses', image: img('1572804013309-59a88b7e92f1'), sizes: ['XS','S','M','L'], colors: ['Cream','Olive','Navy'], inStock: true, badge: 'New' },
  { id: 'hm-5', brand: 'hm', name: 'Oversized Hoodie', sku: 'HM-HD-045', description: 'Heavyweight cotton-blend hoodie, oversized fit.', price: 179, category: 'best', image: img('1556905055-8f358a7a47b2'), sizes: ['S','M','L','XL'], colors: ['Grey','Black','Beige'], inStock: true },
  { id: 'hm-6', brand: 'hm', name: 'Cargo Pants', sku: 'HM-CG-052', description: 'Relaxed-fit cargo pants in twill cotton.', price: 169, category: 'pants', image: img('1624378439575-d8705ad7ae80'), sizes: ['28','30','32','34'], colors: ['Khaki','Black'], inStock: true, badge: 'New' },
  { id: 'hm-7', brand: 'hm', name: 'Wrap Mini Dress', sku: 'HM-DR-067', description: 'Wrap-front mini dress in soft viscose.', price: 159, category: 'dresses', image: img('1539109136881-3be0616acf4b'), sizes: ['XS','S','M','L'], colors: ['Black','Red'], inStock: true },
  { id: 'hm-8', brand: 'hm', name: 'Canvas Tote Bag', sku: 'HM-AC-081', description: 'Roomy canvas shopper with inner pocket.', price: 59, category: 'accessories', image: img('1544816155-12df9643f363'), sizes: ['One Size'], colors: ['Natural','Black'], inStock: true },
  { id: 'hm-9', brand: 'hm', name: 'Knit Cardigan', sku: 'HM-KN-088', description: 'Soft fine-knit button cardigan.', price: 129, category: 'shirts', image: img('1591047139829-d91aecb6caea'), sizes: ['XS','S','M','L','XL'], colors: ['Cream','Black','Lilac'], inStock: true },
  { id: 'hm-10', brand: 'hm', name: 'Leather Belt', sku: 'HM-AC-093', description: 'Genuine leather belt with brushed buckle.', price: 79, category: 'accessories', image: img('1553062407-98eeb64c6a62'), sizes: ['S','M','L'], colors: ['Brown','Black'], inStock: true },
  { id: 'hm-11', brand: 'hm', name: 'Pleated Midi Skirt', sku: 'HM-SK-101', description: 'High-waisted pleated midi in satin.', price: 139, category: 'dresses', image: img('1583496661160-fb5886a13d44'), sizes: ['XS','S','M','L'], colors: ['Champagne','Black'], inStock: true },
  { id: 'hm-12', brand: 'hm', name: 'Wide-Leg Trousers', sku: 'HM-PT-110', description: 'Tailored wide-leg trousers in stretch crepe.', price: 169, category: 'pants', image: img('1594633312681-425c7b97ccd1'), sizes: ['28','30','32','34'], colors: ['Black','Camel'], inStock: true, badge: 'Bestseller' },
  { id: 'hm-13', brand: 'hm', name: 'Straw Bucket Hat', sku: 'HM-AC-118', description: 'Woven paper-straw bucket hat.', price: 49, category: 'accessories', image: img('1521369909029-2afed882baee'), sizes: ['One Size'], colors: ['Natural'], inStock: true },
  { id: 'hm-14', brand: 'hm', name: 'Button-Up Shirt', sku: 'HM-SH-125', description: 'Crisp poplin shirt, regular fit.', price: 119, category: 'shirts', image: img('1602810318383-e386cc2a3ccf'), sizes: ['S','M','L','XL'], colors: ['White','Sky Blue'], inStock: true },

  // ===== ZARA =====
  { id: 'za-1', brand: 'zara', name: 'Oversized Blazer', sku: 'ZR-BZ-201', description: 'Structured oversized blazer with notch lapels.', price: 359, category: 'best', image: img('1591369822096-ffd140ec948f'), sizes: ['XS','S','M','L'], colors: ['Black','Sand'], inStock: true, badge: 'Bestseller' },
  { id: 'za-2', brand: 'zara', name: 'High-Waist Mom Jeans', sku: 'ZR-JN-212', description: 'High-rise mom-fit jeans in rigid denim.', price: 199, category: 'pants', image: img('1541099649105-f69ad21f3246'), sizes: ['26','28','30','32','34'], colors: ['Blue','Washed Black'], inStock: true },
  { id: 'za-3', brand: 'zara', name: 'Satin Slip Dress', sku: 'ZR-DR-225', description: 'Bias-cut satin slip dress with thin straps.', price: 229, category: 'dresses', image: img('1595777457583-95e059d581b8'), sizes: ['XS','S','M','L'], colors: ['Champagne','Black','Emerald'], inStock: true, badge: 'New' },
  { id: 'za-4', brand: 'zara', name: 'Knit Polo Sweater', sku: 'ZR-KN-237', description: 'Fine-gauge knit polo with collar.', price: 179, category: 'shirts', image: img('1620799140408-edc6dcb6d633'), sizes: ['S','M','L','XL'], colors: ['Cream','Navy','Olive'], inStock: true },
  { id: 'za-5', brand: 'zara', name: 'Pleated Mini Dress', sku: 'ZR-DR-244', description: 'Plissé mini dress with cami straps.', price: 189, category: 'dresses', image: img('1539008835657-9e8e9680c956'), sizes: ['XS','S','M','L'], colors: ['Black','Ivory'], inStock: true },
  { id: 'za-6', brand: 'zara', name: 'Tailored Trousers', sku: 'ZR-PT-256', description: 'Slim tailored trousers in stretch wool.', price: 219, category: 'pants', image: img('1584030373081-f37b7bb4fa8e'), sizes: ['28','30','32','34','36'], colors: ['Black','Grey'], inStock: true },
  { id: 'za-7', brand: 'zara', name: 'Pointed Stiletto Heels', sku: 'ZR-AC-262', description: 'Leather pointed-toe stiletto heels.', price: 299, category: 'accessories', image: img('1543163521-1bf539c55dd2'), sizes: ['36','37','38','39','40'], colors: ['Black','Nude'], inStock: true },
  { id: 'za-8', brand: 'zara', name: 'Linen Shirt', sku: 'ZR-SH-271', description: 'Relaxed-fit pure linen shirt.', price: 169, category: 'shirts', image: img('1604176354204-9268737828e4'), sizes: ['S','M','L','XL'], colors: ['White','Sky'], inStock: true, badge: 'New' },
  { id: 'za-9', brand: 'zara', name: 'Chain Shoulder Bag', sku: 'ZR-AC-289', description: 'Quilted shoulder bag with chain strap.', price: 259, category: 'accessories', image: img('1584917865442-de89df76afd3'), sizes: ['One Size'], colors: ['Black','Cream'], inStock: true },
  { id: 'za-10', brand: 'zara', name: 'Cropped Trench Coat', sku: 'ZR-CT-294', description: 'Cropped trench in technical cotton blend.', price: 399, category: 'best', image: img('1539533018447-63fcce2678e3'), sizes: ['XS','S','M','L'], colors: ['Camel','Black'], inStock: true, badge: 'Bestseller' },
  { id: 'za-11', brand: 'zara', name: 'Slip Skirt', sku: 'ZR-SK-301', description: 'Bias slip skirt in liquid satin.', price: 159, category: 'dresses', image: img('1582142306909-195724d33ffc'), sizes: ['XS','S','M','L'], colors: ['Pewter','Black','Ivory'], inStock: true },
  { id: 'za-12', brand: 'zara', name: 'Wide-Leg Cargo', sku: 'ZR-CG-312', description: 'Heavy-cotton wide-leg cargo pants.', price: 239, category: 'pants', image: img('1611404134230-89b09c441b81'), sizes: ['28','30','32','34'], colors: ['Khaki','Black','Stone'], inStock: true },
  { id: 'za-13', brand: 'zara', name: 'Mini Hobo Bag', sku: 'ZR-AC-318', description: 'Soft leather mini hobo with magnetic closure.', price: 219, category: 'accessories', image: img('1591348278863-a8fb3887e2aa'), sizes: ['One Size'], colors: ['Black','Tan'], inStock: true },
  { id: 'za-14', brand: 'zara', name: 'Knit Maxi Dress', sku: 'ZR-DR-326', description: 'Long ribbed-knit maxi with side slit.', price: 249, category: 'dresses', image: img('1566174053879-31528523f8ae'), sizes: ['XS','S','M','L'], colors: ['Chocolate','Black'], inStock: true, badge: 'New' },
];

export const BRAND_META: Record<'hm'|'zara', { name: string; tagline: string; accent: string; logo: string; cover: string; deliveryFee: number; goal: number }> = {
  hm: {
    name: 'H&M',
    tagline: 'Fashion and quality at the best price',
    accent: '#E50010',
    logo: 'H&M',
    cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70',
    deliveryFee: 25,
    goal: 400,
  },
  zara: {
    name: 'ZARA',
    tagline: 'Love your curves',
    accent: '#000000',
    logo: 'ZARA',
    cover: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=70',
    deliveryFee: 30,
    goal: 500,
  },
};

export function productsByBrand(brand: 'hm' | 'zara') {
  return PRODUCTS.filter((p) => p.brand === brand);
}

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}
