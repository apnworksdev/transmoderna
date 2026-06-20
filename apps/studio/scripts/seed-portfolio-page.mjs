/**
 * Create the Portfolio page singleton and link all portfolio items in list order.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-portfolio-page.mjs --with-user-token
 */
import { PORTFOLIO_PAGE_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const existing = await client.fetch(`*[_id == $id][0]{ _id }`, {
  id: PORTFOLIO_PAGE_DOCUMENT_ID
});

const portfolioItems = await client.fetch(
  `*[_type == "portfolioItem"] | order(sortOrder asc){ _id }`
);

const references = portfolioItems.map((item) => ({
  _type: 'reference',
  _ref: item._id,
  _key: item._id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}));

if (existing) {
  await client.patch(PORTFOLIO_PAGE_DOCUMENT_ID).set({ portfolioItems: references }).commit();
  console.log(`Updated portfolio page with ${references.length} portfolio items.`);
} else {
  await client.create({
    _id: PORTFOLIO_PAGE_DOCUMENT_ID,
    _type: 'portfolioPage',
    portfolioItems: references
  });
  console.log(`Created portfolio page with ${references.length} portfolio items.`);
}
