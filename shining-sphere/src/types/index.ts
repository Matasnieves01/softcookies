export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string; // undefined if guest
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  notes?: string;
  item: OrderItem;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Promotion {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  details?: string[];
  ingredients?: string[];
  batchDates: string; // Día que se repartirá
  deliveryDate?: string;
  locations: string[];
  totalSlots: number;
  reservedSlots: number;
  isActive: boolean;
  createdAt: string;
}

export type Tanda = Promotion;

