/**
 * Attach sample MP3 files to podcast episodes missing audio.
 * Uses SoundHelix royalty-free example tracks (https://www.soundhelix.com).
 *
 * Run from apps/studio:
 *   npx sanity exec scripts/seed-podcast-audio.mjs --with-user-token
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2025-08-15' });

function sampleAudioUrl(index) {
  const songNumber = (index % 16) + 1;
  return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songNumber}.mp3`;
}

function safeFilename(title, number) {
  const base = String(title ?? 'podcast')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${String(number).padStart(3, '0')}-${base || 'episode'}.mp3`;
}

const podcasts = await client.fetch(
  `*[_type == "podcast"] | order(sortOrder asc, number desc){
    _id,
    title,
    number,
    "hasAudio": defined(audioFile.asset)
  }`
);

const pending = podcasts.filter((item) => !item.hasAudio);

if (pending.length === 0) {
  console.log('All podcasts already have audio files.');
  process.exit(0);
}

console.log(`Uploading audio for ${pending.length} podcast(s)...`);

let uploaded = 0;
let failed = 0;

for (const [index, podcast] of pending.entries()) {
  const url = sampleAudioUrl(index);
  const filename = safeFilename(podcast.title, podcast.number);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const asset = await client.assets.upload('file', buffer, {
      filename,
      contentType: 'audio/mpeg'
    });

    await client
      .patch(podcast._id)
      .set({
        audioFile: {
          _type: 'file',
          asset: {
            _type: 'reference',
            _ref: asset._id
          }
        }
      })
      .commit();

    console.log(`uploaded ${filename} -> ${podcast.title} (#${podcast.number})`);
    uploaded += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`failed ${podcast.title} (#${podcast.number}): ${message}`);
    failed += 1;
  }
}

console.log(`Done. Uploaded ${uploaded}, failed ${failed}.`);
