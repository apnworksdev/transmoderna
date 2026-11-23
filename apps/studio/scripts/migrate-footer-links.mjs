/**
 * Move the old Footer `pages` references into `links`.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/migrate-footer-links.mjs --with-user-token
 */
import { SITE_FOOTER_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const footer = await client.fetch(
  `*[_id == $id][0]{ pages, links }`,
  { id: SITE_FOOTER_DOCUMENT_ID }
);

if (!footer) {
  console.log('No footer document found.');
  process.exit(0);
}

if (Array.isArray(footer.links) && footer.links.length > 0) {
  console.log('Footer links already set — nothing to migrate.');
  process.exit(0);
}

const pages = Array.isArray(footer.pages) ? footer.pages : [];
const links = pages
  .filter((page) => page && page._ref)
  .map((page) => ({
    _key: page._key,
    _type: 'footerLink',
    linkType: 'internal',
    page: {
      _type: 'reference',
      _ref: page._ref
    }
  }));

if (links.length === 0) {
  console.log('No footer page references to migrate.');
  process.exit(0);
}

await client
  .patch(SITE_FOOTER_DOCUMENT_ID)
  .set({ links })
  .unset(['pages'])
  .commit();

console.log(`Migrated ${links.length} footer page references into links.`);
