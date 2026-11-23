import type Plyr from 'plyr';

let plyrModule: Promise<typeof import('plyr').default> | null = null;

export function loadPlyr(): Promise<typeof import('plyr').default> {
  if (!plyrModule) {
    plyrModule = import('plyr').then((mod) => mod.default);
  }
  return plyrModule;
}

export function youtubePlyrOptions(options: {
  title?: string;
  muted?: boolean;
  loop?: boolean;
  autoplay?: boolean;
}): Plyr.Options {
  return {
    title: options.title,
    controls: [],
    clickToPlay: false,
    hideControls: true,
    autoplay: options.autoplay ?? false,
    autopause: false,
    muted: options.muted ?? false,
    volume: 1,
    loop: { active: options.loop ?? false },
    storage: { enabled: false },
    tooltips: { controls: false, seek: false },
    fullscreen: { enabled: false, fallback: false, iosNative: false },
    keyboard: { focused: false, global: false },
    disableContextMenu: true,
    loadSprite: false,
    settings: [],
    invertTime: false,
    toggleInvert: false,
    youtube: {
      noCookie: true,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      customControls: true,
      fs: 0,
      disablekb: 1,
      playsinline: 1
    }
  };
}

/** Keep object-fit: cover in sync with the clip's real aspect ratio. */
export function syncYoutubeCoverRatio(player: Plyr, root: HTMLElement): void {
  const aspect = player.elements?.wrapper?.style.aspectRatio ?? '';
  const [width, height] = aspect.split('/').map((part) => Number(part.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return;
  }
  root.style.setProperty('--youtube-ar', String(width / height));
}
