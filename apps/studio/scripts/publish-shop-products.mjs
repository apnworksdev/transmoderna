/**
 * Publish all Shopify-synced products and variants so they appear on the public API (/shop).
 *
 * Run from apps/studio (uses your Sanity login):
 *   npx sanity exec scripts/publish-shop-products.mjs --with-user-token
 */
import { createDraftId } from '@sanity/id-utils';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const productIds = await client.fetch(`*[_type == "product" && !(_id in path("drafts.**"))]._id`);
const variantIds = await client.fetch(
  `*[_type == "productVariant" && !(_id in path("drafts.**"))]._id`
);

async function publishId(publishedId) {
  const draftId = createDraftId(publishedId);
  const hasDraft = await client.fetch(`defined(*[_id == $draftId][0]._id)`, { draftId });
  if (!hasDraft) {
    console.log(`skip ${publishedId} (no draft to publish)`);
    return;
  }
  await client.action({
    actionType: 'sanity.action.document.publish',
    publishedId,
    draftId
  });
  console.log(`published ${publishedId}`);
}

for (const id of variantIds) {
  try {
    await publishId(id);
  } catch (err) {
    console.error(`variant ${id}:`, err.message);
  }
}

for (const id of productIds) {
  try {
    await publishId(id);
  } catch (err) {
    console.error(`product ${id}:`, err.message);
  }
}

const publicCount = await fetch(
  `https://${client.config().projectId}.api.sanity.io/v2025-08-15/data/query/production?query=${encodeURIComponent('count(*[_type == "product"])')}`
).then((r) => r.json());

console.log('Public API product count:', publicCount.result);
