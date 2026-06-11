import {
  EXHIBITIONS_VIEW_STORAGE_KEY,
  getDefaultExhibitionsViewMode,
  type ExhibitionsViewMode
} from '../lib/exhibitions-view.ts';
import { initExhibitionsFullSwiper } from './exhibitions-full-swiper.ts';

const initializedPages = new WeakSet<HTMLElement>();

let swiperCleanup: (() => void) | null = null;

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

function destroySwiper(): void {
  if (swiperCleanup) {
    swiperCleanup();
    swiperCleanup = null;
  }
}

function setViewMode(page: HTMLElement, mode: ExhibitionsViewMode, root: ParentNode): void {
  syncViewModeAttributes(mode, page);
  setStoredViewMode(mode);

  page.querySelectorAll<HTMLButtonElement>('[data-exhibitions-view-toggle]').forEach((button) => {
    const isActive = button.dataset.exhibitionsViewToggle === mode;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  destroySwiper();

  if (mode === 'full') {
    swiperCleanup = initExhibitionsFullSwiper(root);
    const scroller = root.querySelector<HTMLElement>('[data-exhibitions-full-scroller]');
    scroller?.focus({ preventScroll: true });
  }
}

export function initExhibitionsView(root: ParentNode = document): void {
  const page = root.querySelector<HTMLElement>('[data-exhibitions-page]');
  if (!page || initializedPages.has(page)) {
    return;
  }

  initializedPages.add(page);

  const initialMode = getStoredExhibitionsViewMode();
  setViewMode(page, initialMode, root);

  page.querySelectorAll<HTMLButtonElement>('[data-exhibitions-view-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.exhibitionsViewToggle;
      if (mode === 'thumbnail' || mode === 'full') {
        setViewMode(page, mode, root);
      }
    });
  });
}
