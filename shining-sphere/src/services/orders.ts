import type { Order, OrderStatus, Tanda } from '../types';

const ORDERS_KEY = 'softcookies_orders';

// Safely retrieves and sanitizes all stored orders from localStorage
export function getAllOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ORDERS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((o): o is Order => Boolean(o && typeof o === 'object' && o.id && o.item))
      .map((o) => {
        const unitPrice = Number(o.item?.unitPrice) >= 0 ? Number(o.item.unitPrice) : 0;
        const rawQty = Number(o.item?.quantity);
        const quantity = !isNaN(rawQty) && rawQty > 0 ? Math.floor(rawQty) : 1;
        const subtotal = Number(o.item?.subtotal) >= 0 ? Number(o.item.subtotal) : unitPrice * quantity;
        const total = Number(o.total) >= 0 ? Number(o.total) : subtotal;

        return {
          ...o,
          item: {
            ...o.item,
            productId: String(o.item.productId || '').trim(),
            productName: String(o.item.productName || '').trim(),
            unitPrice,
            quantity,
            subtotal
          },
          total,
          status: (['pending', 'confirmed', 'delivered', 'cancelled'].includes(o.status) 
            ? o.status 
            : 'confirmed') as OrderStatus
        };
      });
  } catch {
    return [];
  }
}

// Retrieves all orders for a specific user ID
export function getOrdersByUser(userId: string): Order[] {
  if (!userId) return [];
  const all = getAllOrders();
  return all.filter((order) => order.customerId === userId);
}

// Retrieves a single order by ID
export function getOrderById(orderId: string): Order | null {
  if (!orderId) return null;
  const all = getAllOrders();
  return all.find((o) => o.id === orderId) || null;
}

// Creates a new order, validates slot availability, saves to localStorage, and syncs
export function createOrder(data: {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  notes?: string;
  productId: string;
  productName: string;
  productSlug?: string;
  unitPrice: number;
  quantity: number;
  totalSlots?: number;
}): Order {
  const qty = Number(data.quantity) > 0 ? Math.floor(Number(data.quantity)) : 1;
  const unitPrice = Number(data.unitPrice) >= 0 ? Number(data.unitPrice) : 0;
  const subtotal = unitPrice * qty;

  // If totalSlots is provided, verify there are still slots available
  if (typeof data.totalSlots === 'number' && data.totalSlots > 0) {
    const currentReserved = getActiveReservedSlotsForProduct(data.productId, data.productName, data.productSlug);
    const remaining = Math.max(0, data.totalSlots - currentReserved);
    if (remaining <= 0) {
      throw new Error('Esta tanda ha alcanzado el límite máximo de cupos y las reservaciones están cerradas.');
    }
    if (qty > remaining) {
      throw new Error(`Solo quedan ${remaining} cupo(s) disponible(s) para esta tanda.`);
    }
  }

  const all = getAllOrders();
  const orderNumber = 'SC-' + Math.floor(1000 + Math.random() * 9000);

  const newOrder: Order = {
    id: 'order-' + Date.now(),
    orderNumber,
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    pickupLocation: data.pickupLocation,
    notes: data.notes?.trim() || '',
    item: {
      productId: data.productId.trim(),
      productName: data.productName.trim(),
      unitPrice,
      quantity: qty,
      subtotal
    },
    total: subtotal,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  all.unshift(newOrder); // Newest first

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Error saving order to localStorage:', err);
    }
    // Sync reserved slots for this tanda in the background
    syncTandaReservedSlots(data.productId, data.productName, data.productSlug);
    window.dispatchEvent(new CustomEvent('softcookies:order-created', { detail: newOrder }));
  }

  return newOrder;
}

// Updates the status of an existing order
export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const all = getAllOrders();
  const index = all.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    all[index].status = status;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
      } catch (err) {
        console.warn('Error saving order status to localStorage:', err);
      }
      syncTandaReservedSlots(all[index].item?.productId, all[index].item?.productName, undefined, status === 'cancelled');
      window.dispatchEvent(new CustomEvent('softcookies:orders-updated'));
    }
  }
}

// Updates an existing order's details (quantity, pickup location, notes)
export function updateOrder(
  orderId: string,
  updates: {
    quantity?: number;
    pickupLocation?: string;
    notes?: string;
  }
): Order | null {
  const all = getAllOrders();
  const index = all.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  const order = all[index];
  if (typeof updates.quantity === 'number' && updates.quantity > 0) {
    const qty = Math.floor(updates.quantity);
    order.item.quantity = qty;
    order.item.subtotal = order.item.unitPrice * qty;
    order.total = order.item.subtotal;
  }
  if (typeof updates.pickupLocation === 'string' && updates.pickupLocation.trim()) {
    order.pickupLocation = updates.pickupLocation.trim();
  }
  if (typeof updates.notes === 'string') {
    order.notes = updates.notes.trim();
  }

  all[index] = order;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Error saving updated order to localStorage:', err);
    }
    syncTandaReservedSlots(order.item?.productId, order.item?.productName, undefined, true);
    window.dispatchEvent(new CustomEvent('softcookies:orders-updated', { detail: order }));
  }

  return order;
}

// Cancels an order and releases reserved slots
export function cancelOrder(orderId: string): boolean {
  const all = getAllOrders();
  const index = all.findIndex((o) => o.id === orderId);
  if (index === -1) return false;

  const order = all[index];
  all[index].status = 'cancelled';

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Error saving cancelled order to localStorage:', err);
    }
    syncTandaReservedSlots(order.item?.productId, order.item?.productName, undefined, true);
    window.dispatchEvent(new CustomEvent('softcookies:orders-updated'));
  }

  return true;
}

// Permanently deletes an order from local records
export function deleteOrder(orderId: string): boolean {
  const all = getAllOrders();
  const index = all.findIndex((o) => o.id === orderId);
  if (index === -1) return false;

  const order = all[index];
  all.splice(index, 1);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Error deleting order from localStorage:', err);
    }
    syncTandaReservedSlots(order.item?.productId, order.item?.productName, undefined, true);
    window.dispatchEvent(new CustomEvent('softcookies:orders-updated'));
  }

  return true;
}

// Helper to normalize strings for forgiving comparisons (accents, z vs s, b vs v, casing, symbols)
export function normalizeProductText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents (á -> a)
    .replace(/z/g, 's')              // equate 'vasca' and 'vazca'
    .replace(/b/g, 'v')              // equate 'b' and 'v'
    .replace(/[^a-z0-9]/g, '');      // alphanumeric only
}

// Determines if an order belongs to a given tanda target
export function isOrderMatchingTanda(
  order: Order, 
  tandaTarget: { id?: string; slug?: string; name?: string }
): boolean {
  if (!order || !order.item || !tandaTarget) return false;

  const itemPid = (order.item.productId || '').trim();
  const itemPName = (order.item.productName || '').trim();

  const targetId = (tandaTarget.id || '').trim();
  const targetSlug = (tandaTarget.slug || '').trim();
  const targetName = (tandaTarget.name || '').trim();

  if (!targetId && !targetSlug && !targetName) return false;

  // 1. Direct opaque ID check:
  // If both have explicit tanda database IDs starting with 'tanda' and they differ, they CANNOT be the same tanda.
  if (targetId.startsWith('tanda') && itemPid.startsWith('tanda')) {
    return targetId === itemPid;
  }

  // 2. Exact ID or Slug match
  if (targetId && itemPid && itemPid === targetId) {
    return true;
  }
  if (targetSlug && itemPid && itemPid === targetSlug) {
    return true;
  }

  // 3. Normalized text matching
  const normOrderPid = normalizeProductText(itemPid);
  const normOrderPName = normalizeProductText(itemPName);
  const normTargetId = normalizeProductText(targetId);
  const normTargetSlug = normalizeProductText(targetSlug);
  const normTargetName = normalizeProductText(targetName);

  // Exact normalized match
  if (normTargetName && normOrderPName && normTargetName === normOrderPName) {
    return true;
  }
  if (normTargetSlug && normOrderPid && normTargetSlug === normOrderPid) {
    return true;
  }
  if (normTargetSlug && normOrderPName && normTargetSlug === normOrderPName) {
    return true;
  }
  if (normTargetName && normOrderPid && normTargetName === normOrderPid) {
    return true;
  }
  if (normTargetId && normOrderPid && normTargetId === normOrderPid) {
    return true;
  }

  // 4. Substring / inclusion match (for cases where one name is slightly longer, e.g. "Tarta Vazca" vs "Tarta Vazca de Queso")
  // Enforces a minimum safe length of at least 5 characters and excludes opaque IDs
  if (normOrderPName.length >= 5 && normTargetName.length >= 5) {
    if (normTargetName.includes(normOrderPName) || normOrderPName.includes(normTargetName)) {
      return true;
    }
  }
  if (normOrderPName.length >= 5 && normTargetSlug.length >= 5) {
    if (normTargetSlug.includes(normOrderPName) || normOrderPName.includes(normTargetSlug)) {
      return true;
    }
  }

  return false;
}

// Calculates total active reserved units from local orders for a given product
export function getActiveReservedSlotsForProduct(
  productId?: string, 
  productName?: string, 
  productSlug?: string,
  _totalActiveTandasCount?: number
): number {
  if (typeof window === 'undefined') return 0;
  const all = getAllOrders();
  const activeOrders = all.filter((o) => o.status !== 'cancelled');

  const tandaTarget = { id: productId, slug: productSlug, name: productName };

  return activeOrders
    .filter((o) => isOrderMatchingTanda(o, tandaTarget))
    .reduce((sum, o) => {
      const qty = Number(o.item?.quantity);
      return sum + (!isNaN(qty) && qty > 0 ? qty : 1);
    }, 0);
}

// Helper to compute remaining slots
export function getRemainingSlotsForProduct(
  totalSlots: number,
  productId?: string,
  productName?: string,
  productSlug?: string,
  _totalActiveTandasCount?: number
): number {
  const reserved = getActiveReservedSlotsForProduct(productId, productName, productSlug, _totalActiveTandasCount);
  return Math.max(0, totalSlots - reserved);
}

// Persists the calculated reserved slots to the server database for this tanda
export async function syncTandaReservedSlots(
  productId?: string, 
  productName?: string, 
  productSlug?: string, 
  forceExact = false
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/tandas?all=true');
    if (!res.ok) return;
    const data = (await res.json()) as { tandas?: Tanda[] };
    const tandas: Tanda[] = Array.isArray(data?.tandas) ? data.tandas : [];
    if (tandas.length === 0) return;

    // Find the matching tanda using resilient matchers
    const matched = tandas.find((t) => {
      if (productId && (t.id === productId || t.slug === productId)) return true;
      if (productSlug && (t.slug === productSlug || t.id === productSlug)) return true;

      const normTName = normalizeProductText(t.name);
      const normInputName = normalizeProductText(productName);
      if (normTName && normInputName && normTName === normInputName) return true;
      if (normTName.length >= 5 && normInputName.length >= 5) {
        if (normTName.includes(normInputName) || normInputName.includes(normTName)) return true;
      }
      return false;
    });

    if (matched) {
      const activeSlots = getActiveReservedSlotsForProduct(matched.id, matched.name, matched.slug);
      const currentDbReserved = typeof matched.reservedSlots === 'number' ? matched.reservedSlots : 0;
      const targetSlots = forceExact ? activeSlots : Math.max(currentDbReserved, activeSlots);
      const totalSlots = typeof matched.totalSlots === 'number' ? matched.totalSlots : 0;

      // Auto-close if all slots are filled
      const shouldAutoClose = totalSlots > 0 && targetSlots >= totalSlots && matched.isActive;
      const slotsChanged = targetSlots !== matched.reservedSlots;

      if (slotsChanged || shouldAutoClose) {
        const payload: Record<string, any> = { reservedSlots: targetSlots };
        if (shouldAutoClose) {
          payload.isActive = false;
        }

        await fetch(`/api/tandas/${matched.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
      }
    }
  } catch (err) {
    console.warn('Syncing tanda reserved slots error:', err);
  }
}

// Synchronizes all tandas across the system from client orders without endless loops
export async function syncAllTandasReservedSlots(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/tandas?all=true');
    if (!res.ok) return;
    const data = (await res.json()) as { tandas?: Tanda[] };
    const tandas: Tanda[] = Array.isArray(data?.tandas) ? data.tandas : [];
    if (tandas.length === 0) return;

    let hasChanges = false;
    for (const tanda of tandas) {
      const activeSlots = getActiveReservedSlotsForProduct(tanda.id, tanda.name, tanda.slug);
      const currentDbReserved = typeof tanda.reservedSlots === 'number' ? tanda.reservedSlots : 0;
      const totalSlots = typeof tanda.totalSlots === 'number' ? tanda.totalSlots : 0;

      const shouldUpdateSlots = activeSlots > currentDbReserved;
      const shouldAutoClose = totalSlots > 0 && Math.max(currentDbReserved, activeSlots) >= totalSlots && tanda.isActive;

      if (shouldUpdateSlots || shouldAutoClose) {
        const payload: Record<string, any> = { 
          reservedSlots: Math.max(currentDbReserved, activeSlots) 
        };
        if (shouldAutoClose) {
          payload.isActive = false;
        }

        await fetch(`/api/tandas/${tanda.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
    }
  } catch (err) {
    console.warn('Sync all tandas reserved slots error:', err);
  }
}
