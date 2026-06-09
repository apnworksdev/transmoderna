/**
 * Copy legacy Home `intro` (Portable Text) into `introText` (plain string).
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/migrate-home-intro-text.mjs --with-user-token
 */
import { HOME_DOCUMENT_ID } from '@repo/shared';
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

const home = await client.fetch(
  `*[_type == "home" && _id == $id][0]{ intro, introText }`,
  { id: HOME_DOCUMENT_ID }
);

if (!home) {
  console.log(`No home document found at id "${HOME_DOCUMENT_ID}".`);
  process.exit(0);
}

if (typeof home.introText === 'string' && home.introText.trim()) {
  console.log('home.introText already set — nothing to migrate.');
  process.exit(0);
}

const introText = blocksToPlainText(home.intro);

if (!introText) {
  console.log('No legacy intro blocks to migrate.');
  process.exit(0);
}

await client
  .patch(HOME_DOCUMENT_ID)
  .set({ introText })
  .commit();

console.log(`Migrated intro → introText (${introText.length} chars).`);
