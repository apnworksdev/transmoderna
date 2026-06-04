import { handleOptions, handlePost } from './handler.js';

export async function runShopifySync(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (request.method === 'POST') {
    return handlePost(request);
  }

  return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
