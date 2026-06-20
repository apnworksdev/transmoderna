/**
 * Remove player bar background images from all podcasts.
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/clear-podcast-player-images.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

const podcasts = await client.fetch(
  `*[_type == "podcast" && defined(playerBackgroundImage)]{ _id, title, number }`
);

if (podcasts.length === 0) {
  console.log('No podcasts with playerBackgroundImage to clear.');
  process.exit(0);
}

let cleared = 0;

for (const podcast of podcasts) {
  await client.patch(podcast._id).unset(['playerBackgroundImage']).commit();
  console.log(`cleared ${podcast.title} (#${podcast.number})`);
  cleared += 1;
}

console.log(`Done. Cleared ${cleared} podcast(s).`);
