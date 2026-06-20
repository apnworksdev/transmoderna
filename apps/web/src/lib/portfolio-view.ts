export const PORTFOLIO_ACTIVE_INDEX_STORAGE_KEY = 'portfolio-active-index';

function wrapPortfolioIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function getStoredPortfolioActiveIndex(length: number): number {
  if (length <= 0) {
    return 0;
  }

  try {
    const raw = localStorage.getItem(PORTFOLIO_ACTIVE_INDEX_STORAGE_KEY);
    if (raw === null) {
      return 0;
    }

    const index = Number.parseInt(raw, 10);
    if (!Number.isFinite(index)) {
      return 0;
    }

    return wrapPortfolioIndex(index, length);
  } catch {
    return 0;
  }
}

export function setStoredPortfolioActiveIndex(index: number): void {
  try {
    localStorage.setItem(PORTFOLIO_ACTIVE_INDEX_STORAGE_KEY, String(index));
  } catch {
    // Ignore storage errors.
  }
}
