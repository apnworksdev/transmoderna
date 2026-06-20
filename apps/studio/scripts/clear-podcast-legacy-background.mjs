/**
 * Remove legacy podcast backgroundImage field (renamed to playerBackgroundImage).
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/clear-podcast-legacy-background.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const podcasts = await client.fetch(
  `*[_type == "podcast" && defined(backgroundImage)]{ _id, title, number }`
);

if (podcasts.length === 0) {
  console.log('No legacy backgroundImage fields to clear.');
  process.exit(0);
}

for (const podcast of podcasts) {
  await client.patch(podcast._id).unset(['backgroundImage']).commit();
  console.log(`cleared legacy backgroundImage on ${podcast.title} (#${podcast.number})`);
}

console.log(`Done. Cleared ${podcasts.length} podcast(s).`);
