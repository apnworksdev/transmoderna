/**
 * Create 20 podcast episodes and wire them into the Podcasts page singleton.
 * Audio files are omitted — upload them in Studio after seeding.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-podcasts.mjs --with-user-token
 */
import { PODCAST_PAGE_DOCUMENT_ID } from '@repo/shared';
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const PODCAST_ITEMS = [
  { title: 'Signal Drift', number: 1, publishDate: '2026-03-14' },
  { title: 'Mirror Protocol', number: 2, publishDate: '2026-02-28' },
  { title: 'After the Interface', number: 3, publishDate: '2026-02-10' },
  { title: 'Glass Lung', number: 4, publishDate: '2026-01-22' },
  { title: 'Soft Machine', number: 5, publishDate: '2025-12-18' },
  { title: 'Terminal Echo', number: 6, publishDate: '2025-11-30' },
  { title: 'Liquid Archive', number: 7, publishDate: '2025-11-04' },
  { title: 'Body Without Organs', number: 8, publishDate: '2025-10-12' },
  { title: 'Fog Circuit', number: 9, publishDate: '2025-09-21' },
  { title: 'Xenopunk Radio', number: 10, publishDate: '2025-08-30' },
  { title: 'The Drone Gaze', number: 11, publishDate: '2025-07-19' },
  { title: 'Synthetic Myth', number: 12, publishDate: '2025-06-08' },
  { title: 'Underwater Frequency', number: 13, publishDate: '2025-05-17' },
  { title: 'Prosthetic Memory', number: 14, publishDate: '2025-04-03' },
  { title: 'Posthuman Sermon', number: 15, publishDate: '2025-03-11' },
  { title: 'Dark Matter Mix', number: 16, publishDate: '2025-02-02' },
  { title: 'Neural Hymn', number: 17, publishDate: '2025-01-15' },
  { title: 'Terraforming Voices', number: 18, publishDate: '2024-12-07' },
  { title: 'Machine Concrete', number: 19, publishDate: '2024-11-20' },
  { title: 'Transmoderna Sessions', number: 20, publishDate: '2024-10-10' }
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const existing = await client.fetch(`*[_type == "podcast"]{ "slug": slug.current, number }`);
const existingSlugs = new Set(existing.map((item) => item.slug).filter(Boolean));
const existingNumbers = new Set(existing.map((item) => item.number).filter((n) => n != null));

let created = 0;
let skipped = 0;
const createdIds = [];

for (const [index, item] of PODCAST_ITEMS.entries()) {
  const slug = slugify(item.title);

  if (existingSlugs.has(slug) || existingNumbers.has(item.number)) {
    console.log(`skip ${item.title} (#${item.number}) — already exists`);
    skipped += 1;
    continue;
  }

  const doc = await client.create({
    _type: 'podcast',
    title: item.title,
    slug: { _type: 'slug', current: slug },
    podcaster: 'TRANSMODERNA',
    number: item.number,
    publishDate: item.publishDate,
    sortOrder: index
  });

  console.log(`created ${doc._id}: ${item.title} (#${item.number})`);
  existingSlugs.add(slug);
  existingNumbers.add(item.number);
  createdIds.push(doc._id);
  created += 1;
}

const allPodcasts = await client.fetch(
  `*[_type == "podcast"] | order(sortOrder asc, number desc){ _id }`
);

const references = allPodcasts.map((item) => ({
  _type: 'reference',
  _ref: item._id,
  _key: item._id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
}));

const pageExists = await client.fetch(`*[_id == $id][0]{ _id }`, {
  id: PODCAST_PAGE_DOCUMENT_ID
});

if (pageExists) {
  await client.patch(PODCAST_PAGE_DOCUMENT_ID).set({ podcasts: references }).commit();
  console.log(`Updated podcasts page with ${references.length} episodes.`);
} else {
  await client.create({
    _id: PODCAST_PAGE_DOCUMENT_ID,
    _type: 'podcastPage',
    podcasts: references
  });
  console.log(`Created podcasts page with ${references.length} episodes.`);
}

console.log(`Done. Created ${created}, skipped ${skipped}.`);
