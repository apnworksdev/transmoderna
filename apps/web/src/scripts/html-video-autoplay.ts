function initMuteToggles(root: ParentNode): void {
  const toggles = root.querySelectorAll<HTMLButtonElement>('[data-html-video-mute-toggle]');

  for (const toggle of toggles) {
    if (toggle.dataset.muteToggleInit === 'true') {
      continue;
    }

    const video = toggle.closest('.html-video-wrap')?.querySelector<HTMLVideoElement>('[data-autoplay-video]');
    if (!video) {
      continue;
    }

    toggle.dataset.muteToggleInit = 'true';

    const syncToggle = () => {
      const muted = video.muted;
      toggle.setAttribute('aria-pressed', String(!muted));
      toggle.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
      toggle.textContent = muted ? 'Unmute' : 'Mute';
      toggle.dataset.muted = String(muted);
    };

    syncToggle();
    toggle.addEventListener('click', () => {
      video.muted = !video.muted;
      syncToggle();
    });
  }
}

export function initAutoplayVideos(root: ParentNode = document): void {
  const videos = root.querySelectorAll<HTMLVideoElement>('[data-autoplay-video]');
  if (!videos.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const video of videos) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.controls = false;
    video.removeAttribute('controls');
  }

  initMuteToggles(root);

  if (prefersReducedMotion) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          void video.play().catch(() => {
            /* autoplay blocked */
          });
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.2 }
  );

  for (const video of videos) {
    observer.observe(video);
  }
}
