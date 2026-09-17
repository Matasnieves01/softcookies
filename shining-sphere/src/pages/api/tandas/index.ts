import type { APIRoute } from 'astro';
import { getTandasFromDb, insertTandaToDb, getCloudflareDb, type TandaInput } from '../../../services/tandas';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';
    const db = await getCloudflareDb(locals);

    const tandas = await getTandasFromDb(db, !all);
    return new Response(JSON.stringify({ success: true, tandas }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Error al obtener tandas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = await getCloudflareDb(locals);
    const body = (await request.json()) as any;

    const {
      name,
      subtitle,
      price,
      unit,
      image,
      shortDescription,
      longDescription,
      deliveryDate,
      totalSlots,
      locations
    } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'El nombre de la tanda es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!deliveryDate || !deliveryDate.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'El día de reparto es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!totalSlots || Number(totalSlots) <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'La cantidad de cupos disponibles debe ser mayor a 0' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const finalImage = (image && image.trim()) ? image.trim() : '/images/tarta-vasca.jpg';

    const tandaInput: TandaInput = {
      name: name.trim(),
      subtitle: subtitle ? subtitle.trim() : '',
      price: Number(price) > 0 ? Number(price) : 6.50,
      unit: unit || '/ porción',
      image: finalImage,
      shortDescription: shortDescription ? shortDescription.trim() : '',
      longDescription: longDescription ? longDescription.trim() : '',
      deliveryDate: deliveryDate.trim(),
      totalSlots: Number(totalSlots),
      locations: locations || ['Tierras Altas', 'Bugaba', 'David']
    };

    const newTanda = await insertTandaToDb(db, tandaInput);

    return new Response(JSON.stringify({ success: true, tanda: newTanda }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Error al guardar la tanda' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
