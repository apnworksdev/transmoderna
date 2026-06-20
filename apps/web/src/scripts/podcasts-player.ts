import { formatElapsedTime } from '../lib/sanity';

type PlayerCleanup = () => void;

function formatTime(seconds: number): string {
  return formatElapsedTime(seconds);
}

function setPlayToggleLabel(button: HTMLButtonElement, isPlaying: boolean): void {
  button.textContent = isPlaying ? 'STOP' : 'PLAY';
  button.setAttribute('aria-label', isPlaying ? 'Stop podcast' : 'Play podcast');
}

function setMuteToggleLabel(button: HTMLButtonElement, isMuted: boolean): void {
  button.textContent = isMuted ? 'UNMUTE' : 'MUTE';
  button.setAttribute('aria-pressed', String(isMuted));
}

function setMiniPlayToggleLabel(button: HTMLButtonElement, isPlaying: boolean): void {
  button.textContent = isPlaying ? '||' : '▶';
  button.setAttribute('aria-label', isPlaying ? 'Pause podcast' : 'Play podcast');
}

export function initPodcastsPlayer(root: ParentNode = document): PlayerCleanup | null {
  const playerRoot = root.querySelector<HTMLElement>('[data-podcast-root]');
  const audio = playerRoot?.querySelector<HTMLAudioElement>('[data-podcast-audio]');

  if (!playerRoot || !audio) {
    return null;
  }

  if (playerRoot.dataset.podcastInit === 'true') {
    return null;
  }

  playerRoot.dataset.podcastInit = 'true';

  const rows = Array.from(playerRoot.querySelectorAll<HTMLElement>('[data-podcast-row]'));
  const miniPlayer = playerRoot.querySelector<HTMLElement>('[data-podcast-mini]');
  const miniElapsed = miniPlayer?.querySelector<HTMLElement>('[data-podcast-mini-elapsed]');
  const miniPlayToggle = miniPlayer?.querySelector<HTMLButtonElement>('[data-podcast-mini-play-toggle]');
  const miniProgressFill = miniPlayer?.querySelector<HTMLElement>('[data-podcast-mini-progress-fill]');
  const shareButton = playerRoot.querySelector<HTMLButtonElement>('[data-podcast-share]');

  let activeRow: HTMLElement | null = null;
  let isSeeking = false;

  const getRowControls = (row: HTMLElement) => ({
    playToggle: row.querySelector<HTMLButtonElement>('[data-podcast-play-toggle]'),
    progress: row.querySelector<HTMLButtonElement>('[data-podcast-progress]'),
    progressFill: row.querySelector<HTMLElement>('[data-podcast-progress-fill]'),
    muteToggle: row.querySelector<HTMLButtonElement>('[data-podcast-mute-toggle]'),
    elapsed: row.querySelector<HTMLElement>('[data-podcast-elapsed]')
  });

  const setActiveRow = (row: HTMLElement | null) => {
    rows.forEach((entry) => {
      entry.classList.toggle('is-active', entry === row);
      const { playToggle } = getRowControls(entry);
      if (playToggle) {
        setPlayToggleLabel(playToggle, entry === row && !audio.paused);
      }
    });
    activeRow = row;
  };

  const updateProgressUi = () => {
    const duration = audio.duration;
    const currentTime = audio.currentTime;
    const ratio =
      Number.isFinite(duration) && duration > 0
        ? Math.min(Math.max(currentTime / duration, 0), 1)
        : 0;
    const percent = Math.round(ratio * 100);
    const elapsedText = formatTime(currentTime);

    rows.forEach((row) => {
      const { progress, progressFill, elapsed } = getRowControls(row);
      const isActive = row === activeRow;

      if (elapsed) {
        elapsed.textContent = isActive ? elapsedText : '00:00:00';
      }

      if (progressFill) {
        progressFill.style.width = isActive ? `${percent}%` : '0%';
      }

      if (progress) {
        progress.setAttribute('aria-valuenow', isActive ? String(percent) : '0');
      }
    });

    if (miniElapsed) {
      miniElapsed.textContent = elapsedText;
    }

    if (miniProgressFill) {
      miniProgressFill.style.width = `${percent}%`;
    }
  };

  const syncPlaybackLabels = () => {
    rows.forEach((row) => {
      const { playToggle } = getRowControls(row);
      if (playToggle) {
        setPlayToggleLabel(playToggle, row === activeRow && !audio.paused);
      }
    });

    if (miniPlayToggle) {
      setMiniPlayToggleLabel(miniPlayToggle, !audio.paused);
    }
  };

  const seekFromClientX = (clientX: number, row: HTMLElement) => {
    const duration = audio.duration;
    const { progress } = getRowControls(row);

    if (!progress || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const rect = progress.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    updateProgressUi();
  };

  const loadRowAudio = async (row: HTMLElement) => {
    const src = row.dataset.audioSrc;
    if (!src) {
      return;
    }

    if (audio.src !== src) {
      audio.src = src;
      audio.load();
    }

    setActiveRow(row);
  };

  const playRow = async (row: HTMLElement) => {
    await loadRowAudio(row);

    try {
      await audio.play();
    } catch {
      audio.pause();
    }

    syncPlaybackLabels();
    updateProgressUi();
  };

  const pausePlayback = () => {
    audio.pause();
    syncPlaybackLabels();
  };

  const toggleRowPlayback = async (row: HTMLElement) => {
    const isSameRow = row === activeRow;

    if (isSameRow && !audio.paused) {
      pausePlayback();
      return;
    }

    await playRow(row);
  };

  const onPlayToggleClick = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const row = button.closest<HTMLElement>('[data-podcast-row]');
    if (!row) {
      return;
    }

    void toggleRowPlayback(row);
  };

  const onMuteToggleClick = () => {
    audio.muted = !audio.muted;

    rows.forEach((row) => {
      const { muteToggle } = getRowControls(row);
      if (muteToggle) {
        setMuteToggleLabel(muteToggle, audio.muted);
      }
    });
  };

  const onProgressPointerDown = (event: PointerEvent) => {
    const progress = event.currentTarget as HTMLButtonElement;
    const row = progress.closest<HTMLElement>('[data-podcast-row]');
    if (!row) {
      return;
    }

    if (row !== activeRow) {
      void loadRowAudio(row).then(() => {
        void audio.play().then(() => {
          syncPlaybackLabels();
          updateProgressUi();
        });
      });
    }

    isSeeking = true;
    progress.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX, row);
  };

  const onProgressPointerMove = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }

    const progress = event.currentTarget as HTMLButtonElement;
    const row = progress.closest<HTMLElement>('[data-podcast-row]');
    if (!row) {
      return;
    }

    seekFromClientX(event.clientX, row);
  };

  const onProgressPointerUp = (event: PointerEvent) => {
    if (!isSeeking) {
      return;
    }

    isSeeking = false;
    const progress = event.currentTarget as HTMLButtonElement;
    if (progress.hasPointerCapture(event.pointerId)) {
      progress.releasePointerCapture(event.pointerId);
    }
  };

  const onTimeUpdate = () => {
    if (!isSeeking) {
      updateProgressUi();
    }
  };

  const onLoadedMetadata = () => {
    updateProgressUi();
  };

  const onEnded = () => {
    syncPlaybackLabels();
    updateProgressUi();
  };

  const onShareClick = async () => {
    const shareData = {
      title: document.title,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      if (shareButton) {
        shareButton.setAttribute('aria-live', 'polite');
        const originalText = shareButton.textContent ?? 'SHARE';
        shareButton.textContent = 'COPIED';
        window.setTimeout(() => {
          shareButton.textContent = originalText;
        }, 1600);
      }
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  const playToggleHandlers = rows.flatMap((row) => {
    const { playToggle, progress, muteToggle } = getRowControls(row);
    const cleanups: Array<() => void> = [];

    if (playToggle) {
      const handler = onPlayToggleClick;
      playToggle.addEventListener('click', handler);
      cleanups.push(() => playToggle.removeEventListener('click', handler));
    }

    if (muteToggle) {
      muteToggle.addEventListener('click', onMuteToggleClick);
      cleanups.push(() => muteToggle.removeEventListener('click', onMuteToggleClick));
    }

    if (progress) {
      progress.addEventListener('pointerdown', onProgressPointerDown);
      progress.addEventListener('pointermove', onProgressPointerMove);
      progress.addEventListener('pointerup', onProgressPointerUp);
      progress.addEventListener('pointercancel', onProgressPointerUp);
      cleanups.push(() => {
        progress.removeEventListener('pointerdown', onProgressPointerDown);
        progress.removeEventListener('pointermove', onProgressPointerMove);
        progress.removeEventListener('pointerup', onProgressPointerUp);
        progress.removeEventListener('pointercancel', onProgressPointerUp);
      });
    }

    return cleanups;
  });

  if (miniPlayToggle && rows[0]) {
    const onMiniPlayToggle = () => {
      void toggleRowPlayback(rows[0]);
    };
    miniPlayToggle.addEventListener('click', onMiniPlayToggle);
    playToggleHandlers.push(() => miniPlayToggle.removeEventListener('click', onMiniPlayToggle));
  }

  if (shareButton) {
    const onShareClickHandler = () => {
      void onShareClick();
    };
    shareButton.addEventListener('click', onShareClickHandler);
    playToggleHandlers.push(() => shareButton.removeEventListener('click', onShareClickHandler));
  }

  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('loadedmetadata', onLoadedMetadata);
  audio.addEventListener('ended', onEnded);

  updateProgressUi();

  return () => {
    audio.pause();
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('ended', onEnded);
    playToggleHandlers.forEach((cleanup) => cleanup());
    delete playerRoot.dataset.podcastInit;
  };
}

export function destroyPodcastsPlayer(root: ParentNode = document): void {
  const audio = root.querySelector<HTMLAudioElement>('[data-podcast-audio]');
  audio?.pause();
}
