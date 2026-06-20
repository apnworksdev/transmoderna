type PlayerCleanup = () => void;

export function initPortfolioVideoPlayer(root: ParentNode = document): PlayerCleanup | null {
  const playerRoot = root.querySelector<HTMLElement>('[data-portfolio-video]');
  const video = playerRoot?.querySelector<HTMLVideoElement>('[data-portfolio-video-media]');
  const progress = playerRoot?.querySelector<HTMLButtonElement>('[data-portfolio-video-progress]');
  const progressFill = playerRoot?.querySelector<HTMLElement>('[data-portfolio-video-progress-fill]');

  if (!playerRoot || !video || !progress || !progressFill) {
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

  void tryAutoplay();
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

export function destroyPortfolioVideoPlayer(root: ParentNode = document): void {
  const video = root.querySelector<HTMLVideoElement>('[data-portfolio-video-media]');
  video?.pause();
}
