/**
 * Create the Exhibitions page singleton and link all exhibition documents.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-exhibitions-page.mjs --with-user-token
 */
import { EXHIBITIONS_PAGE_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const existing = await client.fetch(`*[_id == $id][0]{ _id }`, {
  id: EXHIBITIONS_PAGE_DOCUMENT_ID
});

const exhibitionItems = await client.fetch(
  `*[_type == "exhibition"] | order(_createdAt asc){ _id }`
);

const references = exhibitionItems.map((item) => ({
  _type: 'reference',
  _ref: item._id,
  _key: item._id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}));

if (existing) {
  await client.patch(EXHIBITIONS_PAGE_DOCUMENT_ID).set({ exhibitions: references }).commit();
  console.log(`Updated exhibitions page with ${references.length} exhibitions.`);
} else {
  await client.create({
    _id: EXHIBITIONS_PAGE_DOCUMENT_ID,
    _type: 'exhibitionsPage',
    exhibitions: references
  });
  console.log(`Created exhibitions page with ${references.length} exhibitions.`);
}
