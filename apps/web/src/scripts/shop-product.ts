import { formatPrice } from '../lib/shop-format';
import {
  findDisplayVariantBySelections,
  findVariantBySelections,
  isOptionValueAvailable,
  type SelectableVariant
} from '../lib/shop-options';

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

  const hero = root.querySelector<HTMLImageElement>('[data-product-hero]');
  const thumbs = root.querySelectorAll<HTMLButtonElement>('[data-product-thumb]');
  const listeners: Array<() => void> = [];

  wireProductBuyPanel(buyRoot, listeners);

  thumbs.forEach((thumb) => {
    const onClick = () => {
      const url = thumb.dataset.imageUrl;
      if (!url || !hero) return;

      hero.src = url;
      thumbs.forEach((item) => item.setAttribute('aria-current', 'false'));
      thumb.setAttribute('aria-current', 'true');
    };

    thumb.addEventListener('click', onClick);
    listeners.push(() => thumb.removeEventListener('click', onClick));
  });

  productCleanup = () => {
    listeners.forEach((remove) => remove());
  };

  return productCleanup;
}

export function initShopCardQuickBuy(): (() => void) | null {
  destroyShopCardQuickBuy();

  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'index') return null;

  const listeners: Array<() => void> = [];

  root.querySelectorAll<HTMLElement>('[data-shop-product-card]').forEach((card) => {
    const buyRoot = card.querySelector<HTMLElement>('[data-product-buy]');
    if (!buyRoot) return;

    wireProductBuyPanel(buyRoot, listeners);

    const onPanelClick = (event: Event) => {
      event.stopPropagation();
    };
    buyRoot.addEventListener('click', onPanelClick);
    listeners.push(() => buyRoot.removeEventListener('click', onPanelClick));
  });

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
