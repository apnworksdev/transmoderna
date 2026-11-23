import type Plyr from 'plyr';
import { loadPlyr, syncYoutubeCoverRatio, youtubePlyrOptions } from './youtube-plyr.ts';

type PlayerCleanup = () => void;

function syncMuteToggle(toggle: HTMLButtonElement, muted: boolean): void {
  toggle.setAttribute('aria-pressed', String(!muted));
  toggle.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
  toggle.textContent = muted ? 'Unmute' : 'Mute';
}

function initAmbientYoutubePlayer(root: HTMLElement): PlayerCleanup | null {
  const embed = root.querySelector<HTMLElement>('[data-plyr-provider="youtube"]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-youtube-mute-toggle]');
  if (!embed || !toggle || root.dataset.youtubeReady === 'pending') {
    return null;
  }

  root.dataset.youtubeReady = 'pending';
  const title = root.dataset.videoTitle?.trim() || 'Video';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let player: Plyr | null = null;
  let cancelled = false;
  let wantsMuted = true;
  let observer: IntersectionObserver | null = null;

  const play = () => {
    if (!player || reducedMotion) {
      return;
    }
    void player.play();
  };

  const onToggleClick = () => {
    wantsMuted = !wantsMuted;
    if (player) {
      player.muted = wantsMuted;
    }
    syncMuteToggle(toggle, wantsMuted);
  };

  toggle.addEventListener('click', onToggleClick);

  void (async () => {
    const PlyrPlayer = await loadPlyr();
    if (cancelled || !embed.isConnected) {
      return;
    }

    player = new PlyrPlayer(embed, youtubePlyrOptions({ title, muted: true, loop: true }));
    if (cancelled) {
      player.destroy();
      player = null;
      return;
    }

    player.on('volumechange', () => {
      if (player) {
        syncMuteToggle(toggle, player.muted);
      }
    });

    player.on('ready', () => {
      if (cancelled || !player) {
        return;
      }

      root.dataset.youtubeReady = 'ready';
      player.muted = wantsMuted;
      player.loop = true;
      syncMuteToggle(toggle, player.muted);
      if (root.classList.contains('youtube-cover')) {
        syncYoutubeCoverRatio(player, root);
        window.setTimeout(() => {
          if (player) {
            syncYoutubeCoverRatio(player, root);
          }
        }, 1000);
      }

      if (reducedMotion) {
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              play();
            } else {
              player?.pause();
            }
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(root);
    });
  })();

  return () => {
    cancelled = true;
    observer?.disconnect();
    toggle.removeEventListener('click', onToggleClick);
    player?.destroy();
    player = null;
    delete root.dataset.youtubeReady;
  };
}

export function initAmbientYoutubePlayers(root: ParentNode = document): PlayerCleanup | null {
  const players = root.querySelectorAll<HTMLElement>('[data-ambient-youtube]');
  const cleanups: PlayerCleanup[] = [];

  players.forEach((playerRoot) => {
    const cleanup = initAmbientYoutubePlayer(playerRoot);
    if (cleanup) {
      cleanups.push(cleanup);
    }
  });

  if (cleanups.length === 0) {
    return null;
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
