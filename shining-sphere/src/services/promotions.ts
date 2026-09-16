import type { Promotion, Tanda } from '../types';
import {
  getTandasFromDb,
  getTandaBySlugFromDb,
  insertTandaToDb,
  toggleTandaStatusInDb,
  deleteTandaFromDb,
  fetchTandasClient,
  createTandaClient,
  toggleTandaClient,
  deleteTandaClient
} from './tandas';

const PROMOTIONS_KEY = 'softcookies_promotions';

// Local storage helper for client fallback
export function getAllPromotions(): Promotion[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PROMOTIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getActivePromotions(): Promotion[] {
  return getAllPromotions().filter((p) => p.isActive);
}

export function getPromotionBySlug(slug: string): Promotion | undefined {
  return getAllPromotions().find((p) => p.slug === slug);
}

export async function createPromotion(data: {
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  image?: string;
  shortDescription?: string;
  longDescription: string;
  batchDates: string;
  locations?: string[];
  totalSlots: number;
}): Promise<Promotion> {
  const tanda = await createTandaClient({
    name: data.name,
    subtitle: data.subtitle || '',
    price: data.price,
    unit: data.unit || '/ porción',
    image: data.image || '/images/tarta-vasca.jpg',
    shortDescription: data.shortDescription || '',
    longDescription: data.longDescription,
    deliveryDate: data.batchDates,
    locations: data.locations,
    totalSlots: data.totalSlots
  });

  // Keep local storage synced for instant UI reactivity
  if (typeof window !== 'undefined') {
    const all = getAllPromotions();
    all.unshift(tanda);
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('softcookies:promotions-updated', { detail: tanda }));
  }

  return tanda;
}

export async function togglePromotionStatus(id: string): Promise<void> {
  await toggleTandaClient(id);
  if (typeof window !== 'undefined') {
    const all = getAllPromotions();
    const index = all.findIndex((p) => p.id === id);
    if (index !== -1) {
      all[index].isActive = !all[index].isActive;
      localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
    }
  }
}

export async function deletePromotion(id: string): Promise<void> {
  await deleteTandaClient(id);
  if (typeof window !== 'undefined') {
    let all = getAllPromotions();
    all = all.filter((p) => p.id !== id);
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
  }
}

export {
  getTandasFromDb,
  getTandaBySlugFromDb,
  insertTandaToDb,
  toggleTandaStatusInDb,
  deleteTandaFromDb,
  fetchTandasClient,
  createTandaClient,
  toggleTandaClient,
  deleteTandaClient
};
