/**
 * Create work items from an existing template document.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-work-items.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const WORK_ITEMS = [
  { title: 'BLUE', year: 2026 },
  { title: 'THE FLIP', year: 2026 },
  { title: 'SEEING LIKE DRONES', year: 2025 },
  { title: 'THE FLIP', year: 2025 },
  { title: 'STORY OF A GIRL', year: 2024 },
  { title: 'PROSTHESIS', year: 2024 },
  { title: 'SOUL ARMOUR', year: 2024 },
  { title: 'ECHO', year: 2024 },
  { title: 'MYCOFOREST', year: 2024 },
  { title: 'XENOPUNK (GAMEPLAY)', year: 2023 },
  { title: 'XENOPUNK (VR)', year: 2022 },
  { title: 'TERRAFORMING (VR)', year: 2022 },
  { title: 'MACHINE CONCRETE (DIGITAL)', year: 2022 },
  { title: 'UNDERWATER STREAM', year: 2021 },
  { title: 'MACHINE CONCRETE (VR)', year: 2021 }
];

const template = await client.fetch(
  `*[_type == "work"] | order(_createdAt asc)[0]{
    description,
    media
  }`
);

if (!template) {
  console.error('No existing work document found to use as template.');
  process.exit(1);
}

const existing = await client.fetch(`*[_type == "work"]{ title, year }`);
const existingKeys = new Set(existing.map((item) => `${item.title}::${item.year}`));

let created = 0;
let skipped = 0;

for (const [index, item] of WORK_ITEMS.entries()) {
  const key = `${item.title}::${item.year}`;
  if (existingKeys.has(key)) {
    console.log(`skip ${item.title} (${item.year}) — already exists`);
    skipped += 1;
    continue;
  }

  const doc = await client.create({
    _type: 'work',
    title: item.title,
    year: item.year,
    sortOrder: index,
    description: template.description,
    media: template.media
  });

  console.log(`created ${doc._id}: ${item.title} (${item.year})`);
  existingKeys.add(key);
  created += 1;
}

console.log(`Done. Created ${created}, skipped ${skipped}.`);
