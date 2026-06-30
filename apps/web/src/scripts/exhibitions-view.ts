import {
  EXHIBITIONS_VIEW_STORAGE_KEY,
  EXHIBITIONS_VIEW_TRANSITION_MS,
  getDefaultExhibitionsViewMode,
  type ExhibitionsViewMode
} from '../lib/exhibitions-view.ts';
import { prefersReducedMotion } from './exhibitions-swiper-shared.ts';
import { initExhibitionsFullSwiper } from './exhibitions-full-swiper.ts';
import { initExhibitionsThumbnailSwiper } from './exhibitions-thumbnail-swiper.ts';

let swiperCleanup: (() => void) | null = null;
let currentViewMode: ExhibitionsViewMode | null = null;
let isViewTransitioning = false;

function getStoredExhibitionsViewMode(): ExhibitionsViewMode {
  try {
    const value = localStorage.getItem(EXHIBITIONS_VIEW_STORAGE_KEY);
    if (value === 'thumbnail' || value === 'full') {
      return value;
    }
  } catch {
    // Ignore storage errors.
  }
  return getDefaultExhibitionsViewMode();
}

function setStoredViewMode(mode: ExhibitionsViewMode): void {
  try {
    localStorage.setItem(EXHIBITIONS_VIEW_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors.
  }
}

function syncViewModeAttributes(mode: ExhibitionsViewMode, page: HTMLElement): void {
  page.dataset.exhibitionsView = mode;
  document.documentElement.dataset.exhibitionsView = mode;
}

function updateToggleButtons(mode: ExhibitionsViewMode, root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('[data-exhibitions-view-toggle]').forEach((button) => {
    const isActive = button.dataset.exhibitionsViewToggle === mode;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function destroySwiper(): void {
  if (swiperCleanup) {
    swiperCleanup();
    swiperCleanup = null;
  }
}

function initSwiperForMode(mode: ExhibitionsViewMode, root: ParentNode): void {
  const start = () => {
    if (mode === 'full') {
      swiperCleanup = initExhibitionsFullSwiper(root);
      return;
    }

    swiperCleanup = initExhibitionsThumbnailSwiper(root);
    const scroller = root.querySelector<HTMLElement>('[data-exhibitions-thumbnail-scroller]');
    scroller?.focus({ preventScroll: true });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(start);
  });
}

function waitViewTransition(page: HTMLElement, mode: ExhibitionsViewMode): Promise<void> {
  const incomingView = page.querySelector<HTMLElement>(
    mode === 'full' ? '[data-exhibitions-full]' : '[data-exhibitions-thumbnail]'
  );

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      incomingView?.removeEventListener('transitionend', onEnd);
      resolve();
    };

    const onEnd = (event: TransitionEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (
        target.matches('[data-exhibitions-full], [data-exhibitions-thumbnail]') &&
        event.propertyName === 'opacity'
      ) {
        finish();
      }
    };

    incomingView?.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, EXHIBITIONS_VIEW_TRANSITION_MS + 50);
  });
}

async function setViewMode(
  page: HTMLElement,
  mode: ExhibitionsViewMode,
  root: ParentNode,
  { transition = true }: { transition?: boolean } = {}
): Promise<void> {
  if (currentViewMode === mode) {
    return;
  }

  const previousMode = currentViewMode;
  const shouldAnimate = transition && !prefersReducedMotion() && previousMode !== null;

  if (isViewTransitioning) {
    return;
  }

  isViewTransitioning = shouldAnimate;
  page.classList.toggle('is-view-no-transition', !shouldAnimate);

  if (shouldAnimate && previousMode === 'full') {
    root.querySelector('[data-exhibitions-full]')?.classList.add('is-hiding');
  }

  if (shouldAnimate && previousMode === 'thumbnail') {
    root.querySelector('[data-exhibitions-thumbnail]')?.classList.add('is-hiding');
  }

  syncViewModeAttributes(mode, page);
  setStoredViewMode(mode);
  updateToggleButtons(mode, root);

  if (shouldAnimate) {
    await waitViewTransition(page, mode);
  }

  destroySwiper();
  root.querySelector('[data-exhibitions-full]')?.classList.remove('is-hiding');
  root.querySelector('[data-exhibitions-thumbnail]')?.classList.remove('is-hiding');
  initSwiperForMode(mode, root);
  currentViewMode = mode;

  page.classList.remove('is-view-no-transition');
  isViewTransitioning = false;
}

export function destroyExhibitionsView(): void {
  destroySwiper();
  currentViewMode = null;
  isViewTransitioning = false;

  document.querySelectorAll<HTMLElement>('[data-exhibitions-page]').forEach((page) => {
    delete page.dataset.exhibitionsViewInitialized;
    page.querySelector('[data-exhibitions-full]')?.classList.remove('is-ready', 'is-hiding');
    document.documentElement.classList.add('exhibitions-list-pending');
  });
}

export function initExhibitionsView(root: ParentNode = document): void {
  const page = root.querySelector<HTMLElement>('[data-exhibitions-page]');
  if (!page || page.dataset.exhibitionsViewInitialized === 'true') {
    return;
  }

  page.dataset.exhibitionsViewInitialized = 'true';

  const initialMode = getStoredExhibitionsViewMode();
  void setViewMode(page, initialMode, root, { transition: false });

  root.querySelectorAll<HTMLButtonElement>('[data-exhibitions-view-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.exhibitionsViewToggle;
      if (mode === 'thumbnail' || mode === 'full') {
        void setViewMode(page, mode, root, { transition: true });
      }
    });
  });
}
