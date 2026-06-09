type VimeoProgressiveFile = {
  url?: string;
  width?: number;
  height?: number;
  quality?: string;
};

type VimeoConfigResponse = {
  request?: {
    files?: {
      progressive?: VimeoProgressiveFile[];
    };
  };
};

export function vimeoVideoId(url: string | undefined): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();

    if (host === 'player.vimeo.com') {
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      return match?.[1];
    }

    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      const id = segments.find((segment) => /^\d+$/.test(segment));
      return id && /^\d+$/.test(id) ? id : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function vimeoPrivacyHash(url: string): string | undefined {
  try {
    const parsed = new URL(url.trim());
    const segments = parsed.pathname.split('/').filter(Boolean);
    const idIndex = segments.findIndex((segment) => /^\d+$/.test(segment));
    if (idIndex === -1) {
      return undefined;
    }
    const next = segments[idIndex + 1];
    if (!next || next.includes('-')) {
      return undefined;
    }
    return next;
  } catch {
    return undefined;
  }
}

export function vimeoEmbedUrl(url: string | undefined): string | undefined {
  const id = vimeoVideoId(url);
  return id ? `https://player.vimeo.com/video/${id}` : undefined;
}

export async function resolveVimeoVideoSrc(url: string | undefined): Promise<string | undefined> {
  const id = vimeoVideoId(url);
  if (!id) {
    return undefined;
  }

  const hash = url ? vimeoPrivacyHash(url) : undefined;
  const configUrl = hash
    ? `https://player.vimeo.com/video/${id}/config?h=${encodeURIComponent(hash)}`
    : `https://player.vimeo.com/video/${id}/config`;

  try {
    const response = await fetch(configUrl, {
      headers: { Referer: 'https://vimeo.com/' }
    });
    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as VimeoConfigResponse;
    const progressive = data.request?.files?.progressive;
    if (!progressive?.length) {
      return undefined;
    }

    const best = [...progressive].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    return best?.url;
  } catch {
    return undefined;
  }
}
