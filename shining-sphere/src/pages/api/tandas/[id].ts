import type { APIRoute } from 'astro';
import { toggleTandaStatusInDb, deleteTandaFromDb, updateTandaInDb, getCloudflareDb } from '../../../services/tandas';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const db = await getCloudflareDb(locals);
    const updated = await updateTandaInDb(db, id, body);

    if (!updated) {
      return new Response(JSON.stringify({ success: false, error: 'Tanda no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, tanda: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getCloudflareDb(locals);
    let body: any = null;
    try {
      body = await request.json();
    } catch {}

    if (body && Object.keys(body).length > 0) {
      const updated = await updateTandaInDb(db, id, body);
      return new Response(JSON.stringify({ success: true, tanda: updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await toggleTandaStatusInDb(db, id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await getCloudflareDb(locals);
    await deleteTandaFromDb(db, id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
