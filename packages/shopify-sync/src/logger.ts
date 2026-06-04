export type SyncLogPayload = {
  event: 'shopify-sync';
  action?: string;
  productCount?: number;
  durationMs?: number;
  ok: boolean;
  error?: string;
};

export function logSyncEvent(payload: SyncLogPayload): void {
  console.log(JSON.stringify(payload));
}
