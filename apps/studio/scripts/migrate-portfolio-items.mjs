/**
 * Migrate portfolio items to the media array schema.
 * Converts legacy `videoUrl` into multiple workMedia entries, fills missing fields,
 * and removes deprecated top-level fields.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/migrate-portfolio-items.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const SUBTITLES = ['AV SHOW', 'LIVE SET', 'INSTALLATION', 'STAGE DESIGN', 'VISUALS', 'PROJECTION'];
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const MEDIA_COUNT = 4;

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

function buildMediaArray(videoUrl) {
  return Array.from({ length: MEDIA_COUNT }, (_, index) => ({
    _type: 'workMedia',
    _key: `media-${index + 1}`,
    url: videoUrl
  }));
}

function hasValidMedia(media) {
  return Array.isArray(media) && media.some((entry) => entry?.url?.trim() || entry?.image?.asset);
}

const template = await client.fetch(
  `*[_type == "portfolioItem" && defined(thumbnailImage.asset) && (defined(videoUrl) || count(media[defined(url) || defined(image.asset)]) > 0)][0]{
    _id,
    title,
    thumbnailImage,
    videoUrl,
    media
  }`
);

const templateVideoUrl =
  template?.videoUrl?.trim() ||
  template?.media?.find((entry) => entry?.url?.trim())?.url?.trim();

if (!template?.thumbnailImage || !templateVideoUrl) {
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
  const legacyVideoUrl = item.videoUrl?.trim() || templateVideoUrl;
  const needsMigration =
    !hasValidMedia(item.media) ||
    item.videoUrl != null ||
    !item.slug?.current ||
    !item.thumbnailImage?.asset ||
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

  if (!hasValidMedia(item.media)) {
    patch.set({ media: buildMediaArray(legacyVideoUrl) });
  }

  if (!isTemplate || !item.thumbnailImage?.asset) {
    patch.set({ thumbnailImage: template.thumbnailImage });
  }

  if (item.subtitle == null) {
    patch.set({ subtitle: pickRandom(SUBTITLES, index) });
  }

  if (item.year == null) {
    patch.set({ year: pickRandom(YEARS, index + 2) });
  }

  if (item.videoUrl != null) {
    patch.unset(['videoUrl']);
  }

  await patch.commit();
  console.log(`updated ${item.title} → /${slug} (${MEDIA_COUNT} media items)`);
  updated += 1;
}

console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
