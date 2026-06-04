import type { APIRoute } from 'astro';
import {
  fetchProductVariantsByHandle,
  isStorefrontConfigured
} from '../../lib/shopify-storefront';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const handle = url.searchParams.get('handle');
  if (!handle) {
    return new Response(
      JSON.stringify({ success: false, message: 'Missing handle query parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isStorefrontConfigured()) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Storefront API not configured'
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const variants = await fetchProductVariantsByHandle(handle);
    return new Response(JSON.stringify({ success: true, variants }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
