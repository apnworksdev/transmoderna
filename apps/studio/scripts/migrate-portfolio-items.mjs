/**
 * Migrate legacy portfolio items to the new schema.
 * Copies thumbnailImage + videoUrl from the first complete item, generates slugs,
 * fills subtitle/year, and removes the old `media` field.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/migrate-portfolio-items.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const SUBTITLES = ['AV SHOW', 'LIVE SET', 'INSTALLATION', 'STAGE DESIGN', 'VISUALS', 'PROJECTION'];
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickRandom(list, index) {
  return list[index % list.length];
}

const template = await client.fetch(
  `*[_type == "portfolioItem" && defined(thumbnailImage.asset) && defined(videoUrl)][0]{
    _id,
    title,
    thumbnailImage,
    videoUrl
  }`
);

if (!template?.thumbnailImage || !template.videoUrl) {
  console.error('No complete portfolio item found to use as template.');
  process.exit(1);
}

console.log(`Using template: ${template.title} (${template._id})`);

const items = await client.fetch(
  `*[_type == "portfolioItem"] | order(title asc){
    _id,
    title,
    slug,
    subtitle,
    year,
    thumbnailImage,
    videoUrl,
    media,
    sortOrder
  }`
);

const usedSlugs = new Set(
  items.map((item) => item.slug?.current).filter(Boolean)
);

let updated = 0;
let skipped = 0;

for (const [index, item] of items.entries()) {
  const isTemplate = item._id === template._id;
  const needsMigration =
    item.media != null ||
    !item.slug?.current ||
    !item.thumbnailImage?.asset ||
    !item.videoUrl ||
    item.subtitle == null ||
    item.year == null;

  if (!needsMigration) {
    console.log(`skip ${item.title} — already migrated`);
    skipped += 1;
    continue;
  }

  let slug = item.slug?.current ?? slugify(item.title ?? 'portfolio-item');

  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
  } else if (!item.slug?.current) {
    let suffix = 2;
    while (usedSlugs.has(`${slug}-${suffix}`)) {
      suffix += 1;
    }
    slug = `${slug}-${suffix}`;
    usedSlugs.add(slug);
  }

  const patch = client.patch(item._id).set({
    slug: { _type: 'slug', current: slug },
    sortOrder: item.sortOrder ?? index
  });

  if (!isTemplate || !item.thumbnailImage?.asset) {
    patch.set({ thumbnailImage: template.thumbnailImage });
  }

  if (!isTemplate || !item.videoUrl) {
    patch.set({ videoUrl: template.videoUrl });
  }

  if (item.subtitle == null) {
    patch.set({ subtitle: pickRandom(SUBTITLES, index) });
  }

  if (item.year == null) {
    patch.set({ year: pickRandom(YEARS, index + 2) });
  }

  if (item.media != null) {
    patch.unset(['media']);
  }

  await patch.commit();
  console.log(`updated ${item.title} → /${slug}`);
  updated += 1;
}

console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
