/**
 * Duplicate an existing exhibition with new titles and slugs.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/duplicate-exhibitions.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const NEW_EXHIBITIONS = [
  { title: 'NXT MUSEUM AMSTERDAM', slug: 'nxt-museum-amsterdam' },
  { title: 'JULIA STOSCHEK FOUNDATION', slug: 'julia-stoschek-foundation' },
  { title: 'FONDATION BEYERLE BASEL', slug: 'fondation-beyerle-basel' },
  { title: 'MAX ERNST MUSEUM BRUHL', slug: 'max-ernst-museum-bruhl' },
  { title: 'W1 CURATES LONDON', slug: 'w1-curates-london' },
  { title: 'KUHLHAUS BERLIN', slug: 'kuhlhaus-berlin' }
];

const template = await client.fetch(
  `*[_type == "exhibition"] | order(_createdAt asc)[0]{
    thumbnailImage,
    fullImage,
    tags,
    location,
    year,
    artists,
    content
  }`
);

if (!template) {
  console.error('No existing exhibition found to use as template.');
  process.exit(1);
}

const existingSlugs = new Set(
  (await client.fetch(`*[_type == "exhibition"].slug.current`)).filter(Boolean)
);

let created = 0;
let skipped = 0;

for (const item of NEW_EXHIBITIONS) {
  if (existingSlugs.has(item.slug)) {
    console.log(`skip ${item.title} — slug "${item.slug}" already exists`);
    skipped += 1;
    continue;
  }

  const doc = await client.create({
    _type: 'exhibition',
    title: item.title,
    slug: { _type: 'slug', current: item.slug },
    thumbnailImage: template.thumbnailImage,
    fullImage: template.fullImage,
    tags: template.tags,
    location: template.location,
    year: template.year,
    artists: template.artists,
    content: template.content
  });

  console.log(`created ${doc._id}: ${item.title} (${item.slug})`);
  existingSlugs.add(item.slug);
  created += 1;
}

console.log(`Done. Created ${created}, skipped ${skipped}.`);
