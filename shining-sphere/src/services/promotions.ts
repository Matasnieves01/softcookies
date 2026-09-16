import type { Promotion } from '../types';
import { products as defaultProducts } from '../data/products';

const PROMOTIONS_KEY = 'softcookies_promotions';

function seedDefaultPromotions(): Promotion[] {
  return defaultProducts.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    price: p.price,
    unit: p.unit,
    image: p.image,
    shortDescription: p.shortDescription,
    longDescription: p.longDescription,
    details: p.details,
    ingredients: p.ingredients,
    batchDates: p.batchDates,
    locations: p.locations,
    totalSlots: p.totalSlots,
    reservedSlots: p.reservedSlots,
    isActive: true,
    createdAt: new Date().toISOString()
  }));
}

export function getAllPromotions(): Promotion[] {
  if (typeof window === 'undefined') return seedDefaultPromotions();
  const stored = localStorage.getItem(PROMOTIONS_KEY);
  if (!stored) {
    const initial = seedDefaultPromotions();
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return seedDefaultPromotions();
  }
}

export function getActivePromotions(): Promotion[] {
  return getAllPromotions().filter((p) => p.isActive);
}

export function getPromotionBySlug(slug: string): Promotion | undefined {
  return getAllPromotions().find((p) => p.slug === slug);
}

export function createPromotion(data: {
  name: string;
  subtitle: string;
  price: number;
  unit?: string;
  image?: string;
  shortDescription: string;
  longDescription: string;
  batchDates: string;
  locations?: string[];
  totalSlots: number;
}): Promotion {
  const all = getAllPromotions();
  const slug = data.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const newPromo: Promotion = {
    id: 'promo-' + Date.now(),
    slug: slug + '-' + Math.floor(Math.random() * 1000),
    name: data.name.trim(),
    subtitle: data.subtitle.trim(),
    price: data.price,
    unit: data.unit || '/ porción',
    image: data.image || '/images/tarta-vasca.jpg',
    shortDescription: data.shortDescription.trim(),
    longDescription: data.longDescription.trim(),
    details: [
      'Elaboración artesanal por tanda limitada',
      'Ingredientes frescos y naturales seleccionados',
      'Empaque protector individual para máxima frescura'
    ],
    ingredients: ['Receta especial de la Chef', 'Mantequilla pura', 'Ingredientes seleccionados'],
    batchDates: data.batchDates.trim(),
    locations: data.locations && data.locations.length ? data.locations : ['Tierras Altas', 'Bugaba', 'David'],
    totalSlots: data.totalSlots,
    reservedSlots: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  all.unshift(newPromo);
  localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('softcookies:promotions-updated', { detail: newPromo }));
  return newPromo;
}

export function togglePromotionStatus(id: string): void {
  const all = getAllPromotions();
  const index = all.findIndex((p) => p.id === id);
  if (index !== -1) {
    all[index].isActive = !all[index].isActive;
    localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
  }
}

export function deletePromotion(id: string): void {
  let all = getAllPromotions();
  all = all.filter((p) => p.id !== id);
  localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('softcookies:promotions-updated'));
}
