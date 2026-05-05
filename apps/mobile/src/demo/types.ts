export type Brand = 'hm' | 'zara';

export type Category = 'best' | 'new' | 'shirts' | 'pants' | 'dresses' | 'accessories';

export type Product = {
  id: string;
  brand: Brand;
  name: string;
  sku: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  badge?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  userId: string;
  size: string;
  color: string;
  qty: number;
  isPrivate: boolean;
  addedAt: number;
};

export type Participant = {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
};

export type OrderStatus = 'open' | 'submitted' | 'accepted' | 'packing' | 'ready' | 'shipped';

export type GroupOrder = {
  id: string;
  brand: Brand;
  storeName: string;
  ownerId: string;
  joinCode: string;
  createdAt: number;
  expiresAt: number;
  status: OrderStatus;
  participants: Participant[];
  items: CartItem[];
  goal: number;
  individualDeliveryFee: number;
  totalDeliveryFee: number;
};

export type DemoUserId = 'A' | 'B' | 'C';

export type Role = 'user' | 'store' | null;
