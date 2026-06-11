export const EXHIBITIONS_VIEW_STORAGE_KEY = 'exhibitions-view-mode';
export const EXHIBITIONS_ACTIVE_INDEX_STORAGE_KEY = 'exhibitions-active-index';
export const EXHIBITIONS_VIEW_TRANSITION_MS = 600;

export type ExhibitionsViewMode = 'thumbnail' | 'full';

export function getDefaultExhibitionsViewMode(): ExhibitionsViewMode {
  return 'full';
}

function wrapExhibitionIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function getStoredExhibitionsActiveIndex(length: number): number {
  if (length <= 0) {
    return 0;
  }

  try {
    const raw = localStorage.getItem(EXHIBITIONS_ACTIVE_INDEX_STORAGE_KEY);
    if (raw === null) {
      return 0;
    }

    const index = Number.parseInt(raw, 10);
    if (!Number.isFinite(index)) {
      return 0;
    }

    return wrapExhibitionIndex(index, length);
  } catch {
    return 0;
  }
}

export function setStoredExhibitionsActiveIndex(index: number): void {
  try {
    localStorage.setItem(EXHIBITIONS_ACTIVE_INDEX_STORAGE_KEY, String(index));
  } catch {
    // Ignore storage errors.
  }
}
