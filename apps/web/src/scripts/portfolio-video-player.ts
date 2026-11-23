import type Plyr from 'plyr';
import { loadPlyr, syncYoutubeCoverRatio, youtubePlyrOptions } from './youtube-plyr.ts';

type PlayerCleanup = () => void;

function initYoutubePortfolioPlayer(
  playerRoot: HTMLElement,
  options: { autoplay?: boolean }
): PlayerCleanup | null {
  const embed = playerRoot.querySelector<HTMLElement>('[data-plyr-provider="youtube"]');
  const progress = playerRoot.querySelector<HTMLButtonElement>('[data-portfolio-video-progress]');
  const progressFill = playerRoot.querySelector<HTMLElement>('[data-portfolio-video-progress-fill]');
  const hit = playerRoot.querySelector<HTMLButtonElement>('[data-portfolio-youtube-hit]');
  if (!embed || !progress || !progressFill || !hit) {
    return null;
  }

  const { autoplay = false } = options;
  const title = playerRoot.dataset.videoTitle?.trim() || 'video';
  let player: Plyr | null = null;
  let cancelled = false;
  let isSeeking = false;
  let awaitingUnmute = false;
  let userGesture = false;
  let autoplayTimer = 0;

  const updateProgress = () => {
    const duration = player?.duration ?? 0;
    if (!player || !Number.isFinite(duration) || duration <= 0) {
      progressFill.style.width = '0%';
      progress.setAttribute('aria-valuenow', '0');
      return;
    }

    const ratio = Math.min(Math.max(player.currentTime / duration, 0), 1);
    const percent = Math.round(ratio * 100);
    progressFill.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
  };

  const seekFromClientX = (clientX: number) => {
    const duration = player?.duration ?? 0;
    if (!player || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const rect = progress.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    player.currentTime = ratio * duration;
    updateProgress();
  };

  const syncHitLabel = () => {
    if (!player) {
      return;
    }
    hit.setAttribute('aria-label', player.paused ? `Play ${title}` : `Pause ${title}`);
  };

  const togglePlayback = () => {
    if (!player) {
      return;
    }

    userGesture = true;
    if (awaitingUnmute) {
      player.muted = false;
      awaitingUnmute = false;
      void player.play();
      hit.setAttribute('aria-label', `Pause ${title}`);
      return;
    }

    if (player.paused) {
      void player.play();
      hit.setAttribute('aria-label', `Pause ${title}`);
      return;
    }

    player.pause();
    hit.setAttribute('aria-label', `Play ${title}`);
  };

  const onProgressPointerDown = (event: PointerEvent) => {
    isSeeking = true;
    progress.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const onProgressPointerMove = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }
    seekFromClientX(event.clientX);
  };

  const onProgressPointerUp = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }
    isSeeking = false;
    if (progress.hasPointerCapture(event.pointerId)) {
      progress.releasePointerCapture(event.pointerId);
    }
  };

  const onTime = () => {
    if (!isSeeking) {
      updateProgress();
    }
  };

  hit.addEventListener('click', togglePlayback);
  progress.addEventListener('pointerdown', onProgressPointerDown);
  progress.addEventListener('pointermove', onProgressPointerMove);
  progress.addEventListener('pointerup', onProgressPointerUp);
  progress.addEventListener('pointercancel', onProgressPointerUp);

  void (async () => {
    const PlyrPlayer = await loadPlyr();
    if (cancelled || !embed.isConnected) {
      return;
    }

    player = new PlyrPlayer(
      embed,
      youtubePlyrOptions({ title, muted: false, loop: false, autoplay })
    );
    if (cancelled) {
      player.destroy();
      player = null;
      return;
    }

    player.on('timeupdate', onTime);
    player.on('seeking', onTime);
    player.on('play', syncHitLabel);
    player.on('pause', syncHitLabel);
    player.on('ready', () => {
      if (cancelled || !player) {
        return;
      }

      syncYoutubeCoverRatio(player, playerRoot);
      window.setTimeout(() => {
        if (player) {
          syncYoutubeCoverRatio(player, playerRoot);
        }
      }, 1000);
      updateProgress();
      syncHitLabel();

      if (!autoplay) {
        return;
      }

      player.muted = false;
      void player.play();
      hit.setAttribute('aria-label', `Pause ${title}`);
      autoplayTimer = window.setTimeout(() => {
        if (cancelled || !player || userGesture) {
          return;
        }

        const embedMuted =
          typeof player.embed?.isMuted === 'function' ? Boolean(player.embed.isMuted()) : false;
        if (player.paused) {
          player.muted = true;
          awaitingUnmute = true;
          void player.play();
          return;
        }

        if (embedMuted) {
          player.muted = true;
          awaitingUnmute = true;
        }
      }, 900);
    });
  })();

  return () => {
    cancelled = true;
    window.clearTimeout(autoplayTimer);
    hit.removeEventListener('click', togglePlayback);
    progress.removeEventListener('pointerdown', onProgressPointerDown);
    progress.removeEventListener('pointermove', onProgressPointerMove);
    progress.removeEventListener('pointerup', onProgressPointerUp);
    progress.removeEventListener('pointercancel', onProgressPointerUp);
    player?.destroy();
    player = null;
  };
}

function initSinglePortfolioVideoPlayer(
  playerRoot: HTMLElement,
  options: { autoplay?: boolean } = {}
): PlayerCleanup | null {
  if (playerRoot.hasAttribute('data-youtube-id')) {
    return initYoutubePortfolioPlayer(playerRoot, options);
  }

  const { autoplay = false } = options;
  const video = playerRoot.querySelector<HTMLVideoElement>('[data-portfolio-video-media]');
  const progress = playerRoot.querySelector<HTMLButtonElement>('[data-portfolio-video-progress]');
  const progressFill = playerRoot.querySelector<HTMLElement>('[data-portfolio-video-progress-fill]');

  if (!video || !progress || !progressFill) {
    return null;
  }

  let isSeeking = false;
  let awaitingUnmute = false;

  const updateProgress = () => {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      progressFill.style.width = '0%';
      progress.setAttribute('aria-valuenow', '0');
      return;
    }

    const ratio = Math.min(Math.max(video.currentTime / duration, 0), 1);
    const percent = Math.round(ratio * 100);
    progressFill.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
  };

  const seekFromClientX = (clientX: number) => {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const rect = progress.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = ratio * duration;
    updateProgress();
  };

  const tryAutoplay = async () => {
    video.muted = false;

    try {
      await video.play();
      awaitingUnmute = false;
    } catch {
      video.pause();
      video.muted = true;
      awaitingUnmute = true;

      try {
        await video.play();
      } catch {
        awaitingUnmute = true;
      }
    }
  };

  const togglePlayback = () => {
    if (awaitingUnmute) {
      video.muted = false;
      awaitingUnmute = false;
      void video.play();
      return;
    }

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const onVideoClick = (event: MouseEvent) => {
    if (event.target === progress || progress.contains(event.target as Node)) {
      return;
    }
    togglePlayback();
  };

  const onProgressPointerDown = (event: PointerEvent) => {
    isSeeking = true;
    progress.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const onProgressPointerMove = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }
    seekFromClientX(event.clientX);
  };

  const onProgressPointerUp = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }
    isSeeking = false;
    if (progress.hasPointerCapture(event.pointerId)) {
      progress.releasePointerCapture(event.pointerId);
    }
  };

  const onTimeUpdate = () => {
    if (!isSeeking) {
      updateProgress();
    }
  };

  const onLoadedMetadata = () => {
    updateProgress();
  };

  video.addEventListener('click', onVideoClick);
  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('loadedmetadata', onLoadedMetadata);
  progress.addEventListener('pointerdown', onProgressPointerDown);
  progress.addEventListener('pointermove', onProgressPointerMove);
  progress.addEventListener('pointerup', onProgressPointerUp);
  progress.addEventListener('pointercancel', onProgressPointerUp);

  if (autoplay) {
    void tryAutoplay();
  }
  updateProgress();

  return () => {
    video.pause();
    video.removeEventListener('click', onVideoClick);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    progress.removeEventListener('pointerdown', onProgressPointerDown);
    progress.removeEventListener('pointermove', onProgressPointerMove);
    progress.removeEventListener('pointerup', onProgressPointerUp);
    progress.removeEventListener('pointercancel', onProgressPointerUp);
  };
}

export function initPortfolioVideoPlayer(root: ParentNode = document): PlayerCleanup | null {
  const playerRoots = root.querySelectorAll<HTMLElement>('[data-portfolio-video]');
  const cleanups: PlayerCleanup[] = [];

  playerRoots.forEach((playerRoot, index) => {
    const cleanup = initSinglePortfolioVideoPlayer(playerRoot, { autoplay: index === 0 });
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

export function destroyPortfolioVideoPlayer(root: ParentNode = document): void {
  root.querySelectorAll<HTMLVideoElement>('[data-portfolio-video-media]').forEach((video) => {
    video.pause();
  });
}
