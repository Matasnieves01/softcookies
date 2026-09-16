import type { Order, OrderStatus } from '../types';

const ORDERS_KEY = 'softcookies_orders';

export function getAllOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ORDERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getOrdersByUser(userId: string): Order[] {
  const all = getAllOrders();
  return all.filter((order) => order.customerId === userId);
}

export function createOrder(data: {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  notes?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}): Order {
  const all = getAllOrders();
  const orderNumber = 'SC-' + Math.floor(1000 + Math.random() * 9000);
  const subtotal = data.unitPrice * data.quantity;

  const newOrder: Order = {
    id: 'order-' + Date.now(),
    orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    pickupLocation: data.pickupLocation,
    notes: data.notes?.trim() || '',
    item: {
      productId: data.productId,
      productName: data.productName,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      subtotal
    },
    total: subtotal,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  all.unshift(newOrder); // Newest first
  localStorage.setItem(ORDERS_KEY, JSON.stringify(all));

  window.dispatchEvent(new CustomEvent('softcookies:order-created', { detail: newOrder }));
  return newOrder;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const all = getAllOrders();
  const index = all.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    all[index].status = status;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('softcookies:orders-updated'));
  }
}
