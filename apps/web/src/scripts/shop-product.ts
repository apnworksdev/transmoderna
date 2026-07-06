import { formatPrice } from '../lib/shop-format';
import {
  findDisplayVariantBySelections,
  findVariantBySelections,
  isOptionValueAvailable,
  type SelectableVariant
} from '../lib/shop-options';
import {
  SWIPER_TOUCH_THRESHOLD,
  prefersReducedMotion,
  throttleRAF
} from './exhibitions-swiper-shared.ts';

export type VariantPayload = SelectableVariant & {
  price?: number;
  currencyCode?: string;
  quantityAvailable?: number | null;
};

function getShopRoot(): HTMLElement | null {
  return document.querySelector('[data-shop-root]');
}

export function resolveBuyRoot(element: HTMLElement): HTMLElement | null {
  if (element.matches('[data-product-buy]')) {
    return element;
  }
  return element.closest('[data-product-buy]');
}

function readVariants(buyRoot: HTMLElement): VariantPayload[] {
  const raw = buyRoot.dataset.productVariants;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as VariantPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDefaultCurrency(buyRoot: HTMLElement): string {
  return buyRoot.dataset.defaultCurrency ?? 'EUR';
}

function getSelectedOptionsMap(buyRoot: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  buyRoot.querySelectorAll<HTMLButtonElement>('[data-option-value].is-selected').forEach((button) => {
    const name = button.dataset.optionGroup;
    const value = button.dataset.optionValue;
    if (name && value) {
      map.set(name, value);
    }
  });
  return map;
}

function syncVariantRadio(buyRoot: HTMLElement, variant?: SelectableVariant): void {
  if (!variant) return;

  buyRoot.querySelectorAll<HTMLInputElement>('[data-variant-radio]').forEach((radio) => {
    radio.checked = radio.dataset.variantId === variant.id;
  });
}

function maxQtyForVariant(variant?: VariantPayload): number {
  if (!variant) return 1;
  const available = variant.quantityAvailable;
  if (typeof available === 'number' && available > 0) {
    return Math.min(99, available);
  }
  return 99;
}

function addButtonLabel(
  addBtn: HTMLButtonElement,
  variants: VariantPayload[],
  fullVariant?: VariantPayload
): string {
  const defaultLabel = addBtn.dataset.defaultLabel ?? 'Add to cart';

  if (variants.length === 0) {
    return 'Unavailable';
  }

  if (variants.every((variant) => !variant.availableForSale)) {
    return 'Sold out';
  }

  if (!fullVariant) {
    return 'Select options';
  }

  if (!fullVariant.availableForSale) {
    return 'Sold out';
  }

  return defaultLabel;
}

export function updateVariantUI(buyRoot: HTMLElement): void {
  const variants = readVariants(buyRoot);
  const selections = getSelectedOptionsMap(buyRoot);
  const currency = getDefaultCurrency(buyRoot);
  const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
  const displayVariant = findDisplayVariantBySelections(variants, selections) as
    | VariantPayload
    | undefined;
  const priceEl = buyRoot.querySelector('[data-variant-price]');
  const addBtn = buyRoot.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const qtyValue = buyRoot.querySelector('[data-qty-value]');

  if (displayVariant && typeof displayVariant.price === 'number' && priceEl) {
    priceEl.textContent = formatPrice(
      displayVariant.price,
      displayVariant.currencyCode ?? currency
    );
  }

  syncVariantRadio(buyRoot, fullVariant);

  if (addBtn) {
    addBtn.disabled = !fullVariant?.availableForSale;
    addBtn.textContent = addButtonLabel(addBtn, variants, fullVariant);
  }

  buyRoot.querySelectorAll<HTMLButtonElement>('[data-option-value]').forEach((button) => {
    const optionName = button.dataset.optionGroup;
    const optionValue = button.dataset.optionValue;
    if (!optionName || !optionValue) return;

    button.disabled = !isOptionValueAvailable(variants, selections, optionName, optionValue);
  });

  if (qtyValue && addBtn) {
    const currentQty = Number.parseInt(addBtn.dataset.qty ?? '1', 10) || 1;
    const maxQty = maxQtyForVariant(fullVariant);
    const clamped = Math.min(maxQty, Math.max(1, currentQty));
    if (clamped !== currentQty) {
      qtyValue.textContent = String(clamped);
      addBtn.dataset.qty = String(clamped);
    }
  }
}

function clampQty(value: number, max = 99): number {
  return Math.min(max, Math.max(1, value));
}

function wireProductBuyPanel(
  buyRoot: HTMLElement,
  listeners: Array<() => void>,
  initialQty = 1
): void {
  let activeQty = initialQty;
  const qtyValue = buyRoot.querySelector('[data-qty-value]');
  const minus = buyRoot.querySelector<HTMLButtonElement>('[data-qty-minus]');
  const plus = buyRoot.querySelector<HTMLButtonElement>('[data-qty-plus]');
  const addBtn = buyRoot.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const optionButtons = buyRoot.querySelectorAll<HTMLButtonElement>('[data-option-value]');

  const getMaxQty = () => {
    const variants = readVariants(buyRoot);
    const selections = getSelectedOptionsMap(buyRoot);
    const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
    return maxQtyForVariant(fullVariant);
  };

  const setQty = (next: number) => {
    activeQty = clampQty(next, getMaxQty());
    if (qtyValue) qtyValue.textContent = String(activeQty);
    if (addBtn) addBtn.dataset.qty = String(activeQty);
  };

  if (minus) {
    const onMinus = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setQty(activeQty - 1);
    };
    minus.addEventListener('click', onMinus);
    listeners.push(() => minus.removeEventListener('click', onMinus));
  }

  if (plus) {
    const onPlus = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setQty(activeQty + 1);
    };
    plus.addEventListener('click', onPlus);
    listeners.push(() => plus.removeEventListener('click', onPlus));
  }

  optionButtons.forEach((button) => {
    const onClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;

      const group = button.dataset.optionGroup;
      if (!group) return;

      buyRoot.querySelectorAll<HTMLButtonElement>(`[data-option-group="${group}"]`).forEach((item) => {
        item.classList.remove('is-selected');
        item.setAttribute('aria-pressed', 'false');
      });

      button.classList.add('is-selected');
      button.setAttribute('aria-pressed', 'true');
      updateVariantUI(buyRoot);
      setQty(activeQty);
    };

    button.addEventListener('click', onClick);
    listeners.push(() => button.removeEventListener('click', onClick));
  });

  updateVariantUI(buyRoot);
  setQty(1);
}

let productCleanup: (() => void) | null = null;
let cardCleanup: (() => void) | null = null;

const MOBILE_MEDIA_QUERY = '(max-width: 820px)';

function getProductMediaSlides(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[data-product-media-slide]')];
}

function getProductMediaTrack(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-product-media-track]');
}

function syncProductMediaAria(root: HTMLElement, activeIndex: number): void {
  const slides = getProductMediaSlides(root);
  const thumbs = root.querySelectorAll<HTMLButtonElement>('[data-product-thumb]');

  slides.forEach((slide, index) => {
    const isActive = index === activeIndex;
    slide.classList.toggle('is-active', isActive);
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  thumbs.forEach((thumb, index) => {
    thumb.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
  });
}

function getActiveSlideIndexFromScroll(track: HTMLElement, slides: HTMLElement[]): number {
  if (slides.length === 0) {
    return 0;
  }

  const trackCenter = track.scrollLeft + track.clientWidth / 2;
  let closestIndex = 0;
  let closestDistance = Infinity;

  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
    const distance = Math.abs(slideCenter - trackCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function scrollProductMediaToIndex(
  track: HTMLElement,
  slides: HTMLElement[],
  index: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  const slide = slides[index];
  if (!slide) {
    return;
  }

  track.scrollTo({ left: slide.offsetLeft, behavior });
}

function wrapSlideIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

function getDesktopTrackStep(track: HTMLElement): number {
  const viewport = track.parentElement;
  return viewport?.clientWidth || track.clientWidth || track.getBoundingClientRect().width;
}

function setDesktopTrackTransform(
  track: HTMLElement,
  index: number,
  dragOffsetPx = 0,
  animate = true
): void {
  const isDragging = !animate || dragOffsetPx !== 0;
  track.classList.toggle('is-dragging', isDragging);

  if (isDragging || prefersReducedMotion()) {
    track.style.transition = 'none';
  } else {
    track.style.removeProperty('transition');
  }

  track.style.transform = `translate3d(calc(-${index * 100}% + ${dragOffsetPx}px), 0, 0)`;
}

function clearDesktopTrackTransform(track: HTMLElement): void {
  track.classList.remove('is-dragging');
  track.style.removeProperty('transform');
  track.style.removeProperty('transition');
}

function wireProductMedia(root: HTMLElement, listeners: Array<() => void>): void {
  const track = getProductMediaTrack(root);
  const slides = getProductMediaSlides(root);
  const thumbs = root.querySelectorAll<HTMLButtonElement>('[data-product-thumb]');
  const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

  if (!track || slides.length === 0) {
    return;
  }

  let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
  if (activeIndex < 0) {
    activeIndex = 0;
  }

  const goTo = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const nextIndex = wrapSlideIndex(index, slides.length);
    activeIndex = nextIndex;
    syncProductMediaAria(root, nextIndex);

    if (mobileQuery.matches) {
      scrollProductMediaToIndex(track, slides, nextIndex, behavior);
      return;
    }

    setDesktopTrackTransform(track, nextIndex, 0, behavior !== 'auto');
  };

  thumbs.forEach((thumb) => {
    const onClick = () => {
      const index = Number.parseInt(thumb.dataset.imageIndex ?? '', 10);
      if (!Number.isFinite(index) || index === activeIndex) {
        return;
      }

      goTo(index);
    };

    thumb.addEventListener('click', onClick);
    listeners.push(() => thumb.removeEventListener('click', onClick));
  });

  const onScroll = throttleRAF(() => {
    if (!mobileQuery.matches) {
      return;
    }

    const index = getActiveSlideIndexFromScroll(track, slides);
    if (index === activeIndex) {
      return;
    }

    activeIndex = index;
    syncProductMediaAria(root, index);
  });

  track.addEventListener('scroll', onScroll, { passive: true });
  listeners.push(() => track.removeEventListener('scroll', onScroll));

  if (slides.length > 1) {
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetPx = 0;
    let isDragging = false;

    const onPointerDown = (event: PointerEvent) => {
      if (mobileQuery.matches || event.button !== 0) {
        return;
      }

      isDragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragOffsetPx = 0;
      track.setPointerCapture(event.pointerId);
      setDesktopTrackTransform(track, activeIndex, 0, false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (mobileQuery.matches || !isDragging) {
        return;
      }

      dragOffsetPx = event.clientX - dragStartX;
      setDesktopTrackTransform(track, activeIndex, dragOffsetPx, false);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (mobileQuery.matches || !isDragging) {
        return;
      }

      isDragging = false;
      if (track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }

      const deltaX = dragStartX - event.clientX;
      const deltaY = dragStartY - event.clientY;
      const step = getDesktopTrackStep(track);
      const threshold = Math.min(SWIPER_TOUCH_THRESHOLD, step * 0.12);

      if (Math.abs(deltaX) < Math.abs(deltaY) || Math.abs(deltaX) < threshold) {
        goTo(activeIndex);
        return;
      }

      goTo(activeIndex + (deltaX > 0 ? 1 : -1));
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      if (track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }

      goTo(activeIndex);
    };

    const onDragStart = (event: Event) => {
      if (!mobileQuery.matches) {
        event.preventDefault();
      }
    };

    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerCancel);
    track.addEventListener('dragstart', onDragStart);

    listeners.push(() => {
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.removeEventListener('pointercancel', onPointerCancel);
      track.removeEventListener('dragstart', onDragStart);
    });
  }

  const syncForViewport = () => {
    syncProductMediaAria(root, activeIndex);

    if (mobileQuery.matches) {
      clearDesktopTrackTransform(track);
      scrollProductMediaToIndex(track, slides, activeIndex, 'auto');
      return;
    }

    track.scrollLeft = 0;
    setDesktopTrackTransform(track, activeIndex, 0, false);
  };

  const onResize = throttleRAF(() => {
    if (mobileQuery.matches) {
      return;
    }

    setDesktopTrackTransform(track, activeIndex, 0, false);
  });

  mobileQuery.addEventListener('change', syncForViewport);
  window.addEventListener('resize', onResize);

  listeners.push(() => {
    mobileQuery.removeEventListener('change', syncForViewport);
    window.removeEventListener('resize', onResize);
  });

  syncForViewport();
}

export function destroyShopProduct(): void {
  productCleanup?.();
  productCleanup = null;
}

export function destroyShopCardQuickBuy(): void {
  cardCleanup?.();
  cardCleanup = null;
}

export function initShopProduct(): (() => void) | null {
  destroyShopProduct();

  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'product') return null;

  if (root.dataset.variantsTruncated === 'true') {
    console.warn('[shop-product] Some product variants were not loaded from Shopify.');
  }

  const buyRoot = root.querySelector<HTMLElement>('[data-product-buy]');
  if (!buyRoot) return null;

  const listeners: Array<() => void> = [];

  wireProductBuyPanel(buyRoot, listeners);
  wireProductMedia(root, listeners);

  productCleanup = () => {
    listeners.forEach((remove) => remove());
  };

  return productCleanup;
}

function setQuickShopOpen(card: HTMLElement, open: boolean): void {
  const buyRoot = card.querySelector<HTMLElement>('[data-product-buy]');
  const trigger = buyRoot?.querySelector<HTMLButtonElement>('[data-quickshop-trigger]');

  card.classList.toggle('is-quickshop-open', open);

  if (trigger) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

function closeQuickShopPanels(root: HTMLElement, except?: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-shop-product-card].is-quickshop-open').forEach((card) => {
    if (except && card === except) return;
    setQuickShopOpen(card, false);
  });
}

export function initShopCardQuickBuy(): (() => void) | null {
  destroyShopCardQuickBuy();

  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'index') return null;

  const listeners: Array<() => void> = [];
  const mobileQuery = window.matchMedia('(max-width: 820px)');

  root.querySelectorAll<HTMLElement>('[data-shop-product-card]').forEach((card) => {
    const buyRoot = card.querySelector<HTMLElement>('[data-product-buy]');
    if (!buyRoot) return;

    wireProductBuyPanel(buyRoot, listeners);

    const trigger = buyRoot.querySelector<HTMLButtonElement>('[data-quickshop-trigger]');

    const onPanelClick = (event: Event) => {
      event.stopPropagation();
    };
    buyRoot.addEventListener('click', onPanelClick);
    listeners.push(() => buyRoot.removeEventListener('click', onPanelClick));

    if (trigger) {
      const onTriggerClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        if (trigger.disabled) return;

        const isOpen = card.classList.contains('is-quickshop-open');
        closeQuickShopPanels(root, card);
        setQuickShopOpen(card, !isOpen);
      };

      trigger.addEventListener('click', onTriggerClick);
      listeners.push(() => trigger.removeEventListener('click', onTriggerClick));
    }
  });

  const onDocumentClick = (event: Event) => {
    if (!mobileQuery.matches) return;
    if (!(event.target instanceof Node)) return;

    const openCard = root.querySelector<HTMLElement>('[data-shop-product-card].is-quickshop-open');
    if (!openCard || openCard.contains(event.target)) return;

    setQuickShopOpen(openCard, false);
  };

  document.addEventListener('click', onDocumentClick);
  listeners.push(() => document.removeEventListener('click', onDocumentClick));

  const onViewportChange = () => {
    if (!mobileQuery.matches) {
      closeQuickShopPanels(root);
    }
  };

  mobileQuery.addEventListener('change', onViewportChange);
  listeners.push(() => mobileQuery.removeEventListener('change', onViewportChange));

  cardCleanup = () => {
    listeners.forEach((remove) => remove());
  };

  return cardCleanup;
}

export function getSelectedQuantity(buyRoot: HTMLElement): number {
  const addBtn = buyRoot.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const variants = readVariants(buyRoot);
  const selections = getSelectedOptionsMap(buyRoot);
  const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
  const maxQty = maxQtyForVariant(fullVariant);
  const fromDataset = Number.parseInt(addBtn?.dataset.qty ?? '1', 10);
  return clampQty(Number.isFinite(fromDataset) ? fromDataset : 1, maxQty);
}

export function getSelectedVariantId(buyRoot: HTMLElement): string | undefined {
  const checked = buyRoot.querySelector<HTMLInputElement>('[data-variant-radio]:checked');
  if (checked?.dataset.variantId) {
    return checked.dataset.variantId;
  }

  const variants = readVariants(buyRoot);
  const selections = getSelectedOptionsMap(buyRoot);
  return findVariantBySelections(variants, selections)?.id;
}

export function refreshProductBuyUI(buyRoot?: HTMLElement): void {
  if (buyRoot) {
    updateVariantUI(buyRoot);
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-product-buy]').forEach((element) => {
    updateVariantUI(element);
  });
}
