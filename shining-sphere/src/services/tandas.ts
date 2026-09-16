import type { Tanda } from '../types';

export interface TandaInput {
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  image: string;
  shortDescription?: string;
  longDescription: string;
  deliveryDate: string;
  locations?: string[];
  totalSlots: number;
}

// In-memory fallback for local dev when D1 binding is not initialized
let fallbackTandas: Tanda[] = [];

// Helper to get Cloudflare D1 DB binding safely in Astro v6/v7
export async function getCloudflareDb(locals?: any): Promise<any> {
  // 1) Try cloudflare:workers standard module in Astro v6/v7
  try {
    // @ts-ignore - Virtual module provided by Cloudflare Workers runtime
    const cf: any = await import('cloudflare:workers');
    const cloudflareEnv = cf?.env || cf?.default?.env;
    if (cloudflareEnv?.DB) {
      return cloudflareEnv.DB;
    }
  } catch {}

  // 2) Try locals if present
  try {
    if (locals?.runtime?.DB) return locals.runtime.DB;
    if (locals?.runtime?.env?.DB) return locals.runtime.env.DB;
  } catch {}

  return null;
}

// Helper to ensure D1 table exists
export async function ensureTandasTable(db: any): Promise<void> {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS tandas (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL DEFAULT 6.50,
        unit TEXT NOT NULL DEFAULT '/ porción',
        image TEXT NOT NULL,
        short_description TEXT NOT NULL DEFAULT '',
        long_description TEXT NOT NULL DEFAULT '',
        delivery_date TEXT NOT NULL,
        locations TEXT NOT NULL DEFAULT '["Tierras Altas", "Bugaba", "David"]',
        total_slots INTEGER NOT NULL DEFAULT 25,
        reserved_slots INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).run();
  } catch (err) {
    console.error('Error ensuring tandas table in D1:', err);
  }
}

// Map D1 DB row to Tanda object
function mapRowToTanda(row: any): Tanda {
  let locations = ['Tierras Altas', 'Bugaba', 'David'];
  try {
    if (typeof row.locations === 'string') {
      locations = JSON.parse(row.locations);
    } else if (Array.isArray(row.locations)) {
      locations = row.locations;
    }
  } catch {
    locations = ['Tierras Altas', 'Bugaba', 'David'];
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle || '',
    price: Number(row.price),
    unit: row.unit || '/ porción',
    image: row.image || '/images/tarta-vasca.jpg',
    shortDescription: row.short_description || row.shortDescription || '',
    longDescription: row.long_description || row.longDescription || '',
    batchDates: row.delivery_date || row.batchDates || '',
    deliveryDate: row.delivery_date || row.batchDates || '',
    locations,
    totalSlots: Number(row.total_slots ?? row.totalSlots ?? 20),
    reservedSlots: Number(row.reserved_slots ?? row.reservedSlots ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

// Generate a clean slug from name
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'tanda'}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Server-side: Get all tandas from D1 (or fallback)
export async function getTandasFromDb(db: any, activeOnly = false): Promise<Tanda[]> {
  if (db) {
    await ensureTandasTable(db);
    try {
      const query = activeOnly
        ? 'SELECT * FROM tandas WHERE is_active = 1 ORDER BY created_at DESC'
        : 'SELECT * FROM tandas ORDER BY created_at DESC';
      const res = await db.prepare(query).all();
      if (res && res.results) {
        return res.results.map(mapRowToTanda);
      }
    } catch (err) {
      console.error('Error fetching tandas from D1:', err);
    }
  }

  // Fallback to in-memory store
  if (activeOnly) {
    return fallbackTandas.filter((t) => t.isActive);
  }
  return [...fallbackTandas];
}

// Server-side: Get single tanda by slug
export async function getTandaBySlugFromDb(db: any, slug: string): Promise<Tanda | null> {
  if (db) {
    await ensureTandasTable(db);
    try {
      const res = await db.prepare('SELECT * FROM tandas WHERE slug = ? LIMIT 1').bind(slug).first();
      if (res) return mapRowToTanda(res);
    } catch (err) {
      console.error(`Error fetching tanda with slug ${slug} from D1:`, err);
    }
  }

  const found = fallbackTandas.find((t) => t.slug === slug);
  return found || null;
}

// Server-side: Create new tanda in D1
export async function insertTandaToDb(db: any, input: TandaInput): Promise<Tanda> {
  const id = 'tanda-' + Date.now();
  const slug = generateSlug(input.name);
  const locations = input.locations && input.locations.length ? input.locations : ['Tierras Altas', 'Bugaba', 'David'];
  const locationsJson = JSON.stringify(locations);
  const createdAt = new Date().toISOString();
  const shortDesc = input.shortDescription || input.longDescription.slice(0, 120);

  const newTanda: Tanda = {
    id,
    slug,
    name: input.name.trim(),
    subtitle: (input.subtitle || '').trim(),
    price: Number(input.price),
    unit: input.unit || '/ porción',
    image: input.image,
    shortDescription: shortDesc.trim(),
    longDescription: input.longDescription.trim(),
    batchDates: input.deliveryDate.trim(),
    deliveryDate: input.deliveryDate.trim(),
    locations,
    totalSlots: Number(input.totalSlots),
    reservedSlots: 0,
    isActive: true,
    createdAt
  };

  if (db) {
    await ensureTandasTable(db);
    try {
      await db.prepare(`
        INSERT INTO tandas (
          id, slug, name, subtitle, price, unit, image,
          short_description, long_description, delivery_date,
          locations, total_slots, reserved_slots, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        slug,
        newTanda.name,
        newTanda.subtitle,
        newTanda.price,
        newTanda.unit,
        newTanda.image,
        newTanda.shortDescription,
        newTanda.longDescription,
        newTanda.deliveryDate,
        locationsJson,
        newTanda.totalSlots,
        0,
        1,
        createdAt
      ).run();
    } catch (err) {
      console.error('Error inserting tanda into D1:', err);
    }
  }

  fallbackTandas.unshift(newTanda);
  return newTanda;
}

// Server-side: Toggle active status
export async function toggleTandaStatusInDb(db: any, id: string): Promise<boolean> {
  if (db) {
    await ensureTandasTable(db);
    try {
      await db.prepare(`
        UPDATE tandas 
        SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END 
        WHERE id = ?
      `).bind(id).run();
      return true;
    } catch (err) {
      console.error('Error toggling tanda in D1:', err);
    }
  }

  const idx = fallbackTandas.findIndex((t) => t.id === id);
  if (idx !== -1) {
    fallbackTandas[idx].isActive = !fallbackTandas[idx].isActive;
    return true;
  }
  return false;
}

// Server-side: Delete tanda
export async function deleteTandaFromDb(db: any, id: string): Promise<boolean> {
  if (db) {
    await ensureTandasTable(db);
    try {
      await db.prepare('DELETE FROM tandas WHERE id = ?').bind(id).run();
      return true;
    } catch (err) {
      console.error('Error deleting tanda from D1:', err);
    }
  }

  fallbackTandas = fallbackTandas.filter((t) => t.id !== id);
  return true;
}

// Client-side helper functions for browser
export async function fetchTandasClient(all = false): Promise<Tanda[]> {
  try {
    const res = await fetch(`/api/tandas${all ? '?all=true' : ''}`);
    if (!res.ok) throw new Error('Error fetching tandas from server');
    const data: any = await res.json();
    return data.tandas || [];
  } catch (err) {
    console.warn('Fallback fetching client tandas:', err);
    return [];
  }
}

export async function createTandaClient(input: TandaInput): Promise<Tanda> {
  const res = await fetch('/api/tandas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const errData: any = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al guardar la tanda en la base de datos');
  }
  const data: any = await res.json();
  return data.tanda;
}

export async function toggleTandaClient(id: string): Promise<void> {
  const res = await fetch(`/api/tandas/${id}`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al actualizar estado de la tanda');
}

export async function deleteTandaClient(id: string): Promise<void> {
  const res = await fetch(`/api/tandas/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar la tanda');
}
