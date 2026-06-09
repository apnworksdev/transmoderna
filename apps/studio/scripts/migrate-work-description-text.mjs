/**
 * Copy legacy Work `description` (Portable Text) into plain `text`.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/migrate-work-description-text.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

function blocksToPlainText(blocks) {
  if (!Array.isArray(blocks)) {
    return '';
  }

  return blocks
    .filter((block) => block?._type === 'block')
    .map((block) =>
      (block.children ?? [])
        .map((child) => (typeof child?.text === 'string' ? child.text : ''))
        .join('')
    )
    .join('\n\n')
    .trim();
}

const works = await client.fetch(`*[_type == "work"]{ _id, title, description }`);

let migrated = 0;
let skipped = 0;

for (const work of works) {
  if (typeof work.description === 'string') {
    skipped += 1;
    continue;
  }

  const description = blocksToPlainText(work.description);
  if (!description) {
    skipped += 1;
    continue;
  }

  await client.patch(work._id).set({ description }).commit();
  console.log(`migrated ${work.title ?? work._id}`);
  migrated += 1;
}

console.log(`Done. Migrated ${migrated}, skipped ${skipped}.`);
