import {
  EXHIBITIONS_VIEW_STORAGE_KEY,
  EXHIBITIONS_VIEW_TRANSITION_MS,
  getDefaultExhibitionsViewMode,
  type ExhibitionsViewMode
} from '../lib/exhibitions-view.ts';
import { prefersReducedMotion } from './exhibitions-swiper-shared.ts';
import { initExhibitionsFullSwiper } from './exhibitions-full-swiper.ts';
import { initExhibitionsThumbnailSwiper } from './exhibitions-thumbnail-swiper.ts';

const initializedPages = new WeakSet<HTMLElement>();

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
  if (mode === 'full') {
    swiperCleanup = initExhibitionsFullSwiper(root);
    const scroller = root.querySelector<HTMLElement>('[data-exhibitions-full-scroller]');
    scroller?.focus({ preventScroll: true });
    return;
  }

  swiperCleanup = initExhibitionsThumbnailSwiper(root);
  const scroller = root.querySelector<HTMLElement>('[data-exhibitions-thumbnail-scroller]');
  scroller?.focus({ preventScroll: true });
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

  const shouldAnimate = transition && !prefersReducedMotion() && currentViewMode !== null;

  if (isViewTransitioning) {
    return;
  }

  isViewTransitioning = shouldAnimate;
  page.classList.toggle('is-view-no-transition', !shouldAnimate);

  syncViewModeAttributes(mode, page);
  setStoredViewMode(mode);
  updateToggleButtons(mode, root);

  destroySwiper();
  initSwiperForMode(mode, root);
  currentViewMode = mode;

  if (shouldAnimate) {
    await waitViewTransition(page, mode);
  }

  page.classList.remove('is-view-no-transition');
  isViewTransitioning = false;
}

export function destroyExhibitionsView(): void {
  destroySwiper();
  currentViewMode = null;
  isViewTransitioning = false;
}

export function initExhibitionsView(root: ParentNode = document): void {
  const page = root.querySelector<HTMLElement>('[data-exhibitions-page]');
  if (!page || initializedPages.has(page)) {
    return;
  }

  initializedPages.add(page);

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
