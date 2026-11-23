const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be'
]);

function bareHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

/** YouTube video id from a watch, share, Shorts, live, or embed URL. */
export function youtubeVideoId(url: string | undefined | null): string | undefined {
  if (typeof url !== 'string' || !url.trim()) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return undefined;
  }

  const host = bareHostname(parsed);
  if (!YOUTUBE_HOSTS.has(host)) {
    return undefined;
  }

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && YOUTUBE_ID.test(id) ? id : undefined;
  }

  const fromQuery = parsed.searchParams.get('v');
  if (fromQuery && YOUTUBE_ID.test(fromQuery)) {
    return fromQuery;
  }

  const parts = parsed.pathname.split('/').filter(Boolean);
  const markerAt = parts.findIndex(
    (part) => part === 'embed' || part === 'shorts' || part === 'live' || part === 'v' || part === 'e'
  );
  const candidate = markerAt >= 0 ? parts[markerAt + 1] : undefined;
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : undefined;
}

export function isYouTubeUrl(value: unknown): boolean {
  return typeof value === 'string' && Boolean(youtubeVideoId(value));
}
