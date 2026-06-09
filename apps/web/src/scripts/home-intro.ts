import { HOME_INTRO_SESSION_KEY, HOME_INTRO_SESSION_VALUE } from '@repo/shared';

const TYPEWRITER_MS = 42;
const TEXT_WAIT_MS = 1000;

function cssDurationMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) {
    return fallback;
  }
  if (raw.endsWith('ms')) {
    return Number.parseFloat(raw);
  }
  if (raw.endsWith('s')) {
    return Number.parseFloat(raw) * 1000;
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

let fadeMs = cssDurationMs('--duration-base', 600);

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isIntroComplete(): boolean {
  try {
    return sessionStorage.getItem(HOME_INTRO_SESSION_KEY) === HOME_INTRO_SESSION_VALUE;
  } catch {
    return true;
  }
}

function markIntroComplete(): void {
  try {
    sessionStorage.setItem(HOME_INTRO_SESSION_KEY, HOME_INTRO_SESSION_VALUE);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.remove('intro-pending');
  document.documentElement.classList.add('intro-complete');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showIntroText(el: HTMLElement): void {
  el.hidden = false;
  requestAnimationFrame(() => {
    el.classList.add('is-visible');
  });
}

function hideIntroText(): Promise<void> {
  const text = document.querySelector<HTMLElement>('[data-home-intro-text]');
  if (!text || text.hidden) {
    return Promise.resolve();
  }

  if (prefersReducedMotion()) {
    text.hidden = true;
    text.classList.remove('is-visible', 'is-hiding');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    text.classList.remove('is-visible');
    text.classList.add('is-hiding');

    const done = () => {
      text.hidden = true;
      text.classList.remove('is-hiding');
      resolve();
    };

    text.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'opacity') {
        done();
      }
    }, { once: true });

    window.setTimeout(done, fadeMs + 50);
  });
}

function getVideo(root: HTMLElement): HTMLVideoElement | null {
  return root.querySelector<HTMLVideoElement>('.page-index-video video');
}

function revealVideo(video: HTMLVideoElement): void {
  video.closest('.page-index-video')?.classList.add('is-visible');
}

function whenVideoStarts(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (didPlay: boolean) => {
      if (didPlay) {
        revealVideo(video);
      }
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    if (!video.paused && video.readyState >= 2) {
      finish(true);
      return;
    }

    video.addEventListener('playing', () => finish(true), { once: true });
    video.addEventListener('error', () => finish(false), { once: true });
    void video.play().catch(() => finish(false));
  });
}

function runTypewriter(el: HTMLElement, text: string, onComplete: () => void): void {
  if (prefersReducedMotion()) {
    el.textContent = text;
    onComplete();
    return;
  }

  el.textContent = '';
  let index = 0;

  const tick = () => {
    if (index >= text.length) {
      onComplete();
      return;
    }
    el.textContent += text.charAt(index);
    index += 1;
    window.setTimeout(tick, TYPEWRITER_MS);
  };

  tick();
}

async function finishIntro(): Promise<void> {
  await hideIntroText();
  markIntroComplete();
}

function runIntroSequence(page: HTMLElement): void {
  const text = page.dataset.introText?.trim() ?? '';
  const typewriter = page.querySelector<HTMLElement>('[data-home-intro-text]');

  const afterTextComplete = () => {
    void wait(TEXT_WAIT_MS).then(finishIntro);
  };

  const startTypewriter = () => {
    if (!text || !typewriter) {
      void finishIntro();
      return;
    }

    showIntroText(typewriter);
    runTypewriter(typewriter, text, afterTextComplete);
  };

  const afterPlaybackStarts = () => {
    void wait(prefersReducedMotion() ? 0 : TEXT_WAIT_MS).then(startTypewriter);
  };

  const video = getVideo(page);
  if (!video) {
    afterPlaybackStarts();
    return;
  }

  void whenVideoStarts(video).then(afterPlaybackStarts);
}

export function initHomeIntro(): void {
  fadeMs = cssDurationMs('--duration-base', 600);

  const page = document.querySelector<HTMLElement>('[data-home-page]');
  if (!page) {
    return;
  }

  if (isIntroComplete()) {
    markIntroComplete();
    void hideIntroText();
    const video = getVideo(page);
    if (video) {
      void whenVideoStarts(video);
    }
    return;
  }

  document.documentElement.classList.add('intro-pending');
  runIntroSequence(page);
}
