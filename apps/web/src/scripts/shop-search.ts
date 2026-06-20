function getShopRoot(): HTMLElement | null {
  return document.querySelector('[data-shop-root]');
}

function getBottomBar(): HTMLElement | null {
  return document.querySelector('[data-shop-bottom]');
}

function getSearchInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('[data-shop-search-input]');
}

function getSearchToggle(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('[data-shop-search-toggle]');
}

function setSearchOpen(open: boolean): void {
  const bottom = getBottomBar();
  const toggle = getSearchToggle();
  const input = getSearchInput();
  if (!bottom || !toggle || !input) return;

  const wasOpen = bottom.classList.contains('is-search-open');
  bottom.classList.toggle('is-search-open', open);
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) {
    input.focus();
    if (!wasOpen) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

function shouldKeepSearchOpen(query: string): boolean {
  return query.trim().length > 0;
}

function syncUrlQuery(query: string): void {
  const url = new URL(window.location.href);
  const trimmed = query.trim();

  if (trimmed) {
    url.searchParams.set('q', trimmed);
  } else {
    url.searchParams.delete('q');
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function cardSearchHaystack(card: HTMLElement): string {
  const fromDataset = card.dataset.shopSearchText?.trim();
  if (fromDataset) return fromDataset.toLowerCase();

  return (
    card.querySelector('[data-shop-product-title]')?.textContent?.toLowerCase().trim() ?? ''
  );
}

function filterProducts(query: string): void {
  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'index') return;

  const normalized = query.trim().toLowerCase();
  const cards = root.querySelectorAll<HTMLElement>('[data-shop-product-card]');
  const emptyEl = root.querySelector<HTMLElement>('[data-shop-search-empty]');
  let visible = 0;

  cards.forEach((card) => {
    const haystack = cardSearchHaystack(card);
    const match = !normalized || haystack.includes(normalized);
    card.classList.toggle('is-filtered-out', !match);
    if (match) visible += 1;
  });

  if (emptyEl) {
    emptyEl.hidden = visible > 0 || cards.length === 0;
  }

  syncUrlQuery(query);

  if (shouldKeepSearchOpen(query)) {
    setSearchOpen(true);
  }
}

async function navigateToShopSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  const path = trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop';

  try {
    const { navigate } = await import('astro:transitions/client');
    await navigate(path);
    return;
  } catch {
    window.location.assign(path);
  }
}

let cleanup: (() => void) | null = null;

export function destroyShopSearch(): void {
  cleanup?.();
  cleanup = null;
}

export function initShopSearch(): (() => void) | null {
  destroyShopSearch();

  const root = getShopRoot();
  const bottom = getBottomBar();
  const toggle = getSearchToggle();
  const input = getSearchInput();
  if (!root || !bottom || !toggle || !input) return null;

  const page = root.dataset.shopPage ?? '';
  const initialFromUrl = root.dataset.initialSearch ?? '';

  if (initialFromUrl && input.value !== initialFromUrl) {
    input.value = initialFromUrl;
  }

  if (page === 'index') {
    if (shouldKeepSearchOpen(input.value)) {
      setSearchOpen(true);
    }
    filterProducts(input.value);
  }

  const onToggle = () => {
    const isOpen = bottom.classList.contains('is-search-open');
    if (isOpen && !shouldKeepSearchOpen(input.value)) {
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
  };

  const onInput = () => {
    if (page === 'index') {
      if (!bottom.classList.contains('is-search-open')) {
        setSearchOpen(true);
      }
      filterProducts(input.value);
      return;
    }

    if (!bottom.classList.contains('is-search-open')) {
      setSearchOpen(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (page === 'index') {
        input.value = '';
        filterProducts('');
        setSearchOpen(false);
        return;
      }

      setSearchOpen(false);
      return;
    }

    if (page !== 'index' && event.key === 'Enter') {
      event.preventDefault();
      void navigateToShopSearch(input.value);
    }
  };

  toggle.addEventListener('click', onToggle);
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);

  cleanup = () => {
    toggle.removeEventListener('click', onToggle);
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
  };

  return cleanup;
}
