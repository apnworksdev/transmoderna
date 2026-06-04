import { logSyncEvent } from './logger.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers ?? {})
    }
  });
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function handlePost(request: Request): Promise<Response> {
  const started = Date.now();
  let action: string | undefined;

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    action = typeof body.action === 'string' ? body.action : undefined;

    logSyncEvent({
      event: 'shopify-sync',
      action,
      ok: false,
      error: 'Sync not implemented'
    });

    return jsonResponse(
      {
        success: false,
        message: 'Sync not implemented. Add product schemas and full handler in @repo/shopify-sync.'
      },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logSyncEvent({
      event: 'shopify-sync',
      action,
      durationMs: Date.now() - started,
      ok: false,
      error: message
    });
    return jsonResponse({ success: false, message }, { status: 500 });
  }
}
