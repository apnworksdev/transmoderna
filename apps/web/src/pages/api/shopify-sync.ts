import type { APIRoute } from 'astro';
import { runShopifySync } from '@repo/shopify-sync';

export const prerender = false;

export const OPTIONS: APIRoute = ({ request }) => runShopifySync(request);

export const POST: APIRoute = ({ request }) => runShopifySync(request);
