/**
 * Create the Work page singleton and link all work items in list order.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-work-page.mjs --with-user-token
 */
import { WORK_PAGE_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const existing = await client.fetch(`*[_id == $id][0]{ _id }`, { id: WORK_PAGE_DOCUMENT_ID });

const workItems = await client.fetch(
  `*[_type == "work"] | order(sortOrder asc, year desc){ _id }`
);

const references = workItems.map((item) => ({
  _type: 'reference',
  _ref: item._id,
  _key: item._id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}));

if (existing) {
  await client
    .patch(WORK_PAGE_DOCUMENT_ID)
    .set({ workItems: references })
    .commit();
  console.log(`Updated work page with ${references.length} work items.`);
} else {
  await client.create({
    _id: WORK_PAGE_DOCUMENT_ID,
    _type: 'workPage',
    workItems: references,
    clients: []
  });
  console.log(`Created work page with ${references.length} work items.`);
}
