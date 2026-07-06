import type { APIRoute } from 'astro';
import { runShopifySync } from '@repo/shopify-sync';

export const prerender = false;

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.SHOPIFY_SYNC_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get('authorization');
  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get('x-sync-secret') === secret;
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const OPTIONS: APIRoute = ({ request }) => {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  return runShopifySync(request);
};

export const POST: APIRoute = ({ request }) => {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  return runShopifySync(request);
};
