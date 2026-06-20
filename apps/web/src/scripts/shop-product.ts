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

function readVariants(root: HTMLElement): VariantPayload[] {
  const buy = root.querySelector<HTMLElement>('[data-product-buy]');
  const raw = buy?.dataset.productVariants;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as VariantPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDefaultCurrency(root: HTMLElement): string {
  return root.querySelector<HTMLElement>('[data-product-buy]')?.dataset.defaultCurrency ?? 'EUR';
}

function getSelectedOptionsMap(root: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  root.querySelectorAll<HTMLButtonElement>('[data-option-value].is-selected').forEach((button) => {
    const name = button.dataset.optionGroup;
    const value = button.dataset.optionValue;
    if (name && value) {
      map.set(name, value);
    }
  });
  return map;
}

function syncVariantRadio(root: HTMLElement, variant?: SelectableVariant): void {
  if (!variant) return;

  root.querySelectorAll<HTMLInputElement>('[data-variant-radio]').forEach((radio) => {
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

export function updateVariantUI(root: HTMLElement): void {
  const variants = readVariants(root);
  const selections = getSelectedOptionsMap(root);
  const currency = getDefaultCurrency(root);
  const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
  const displayVariant = findDisplayVariantBySelections(variants, selections) as
    | VariantPayload
    | undefined;
  const priceEl = root.querySelector('[data-variant-price]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const qtyValue = root.querySelector('[data-qty-value]');

  if (displayVariant && typeof displayVariant.price === 'number' && priceEl) {
    priceEl.textContent = formatPrice(
      displayVariant.price,
      displayVariant.currencyCode ?? currency
    );
  }

  syncVariantRadio(root, fullVariant);

  if (addBtn) {
    addBtn.disabled = !fullVariant?.availableForSale;
    addBtn.textContent = addButtonLabel(addBtn, variants, fullVariant);
  }

  root.querySelectorAll<HTMLButtonElement>('[data-option-value]').forEach((button) => {
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

let cleanup: (() => void) | null = null;
let activeQty = 1;

export function destroyShopProduct(): void {
  cleanup?.();
  cleanup = null;
}

export function initShopProduct(): (() => void) | null {
  destroyShopProduct();

  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'product') return null;

  if (root.dataset.variantsTruncated === 'true') {
    console.warn('[shop-product] Some product variants were not loaded from Shopify.');
  }

  const qtyValue = root.querySelector('[data-qty-value]');
  const minus = root.querySelector<HTMLButtonElement>('[data-qty-minus]');
  const plus = root.querySelector<HTMLButtonElement>('[data-qty-plus]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const hero = root.querySelector<HTMLImageElement>('[data-product-hero]');
  const thumbs = root.querySelectorAll<HTMLButtonElement>('[data-product-thumb]');
  const optionButtons = root.querySelectorAll<HTMLButtonElement>('[data-option-value]');

  const getMaxQty = () => {
    const variants = readVariants(root);
    const selections = getSelectedOptionsMap(root);
    const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
    return maxQtyForVariant(fullVariant);
  };

  const setQty = (next: number) => {
    activeQty = clampQty(next, getMaxQty());
    if (qtyValue) qtyValue.textContent = String(activeQty);
    if (addBtn) addBtn.dataset.qty = String(activeQty);
  };

  const listeners: Array<() => void> = [];

  if (minus) {
    const onMinus = () => setQty(activeQty - 1);
    minus.addEventListener('click', onMinus);
    listeners.push(() => minus.removeEventListener('click', onMinus));
  }

  if (plus) {
    const onPlus = () => setQty(activeQty + 1);
    plus.addEventListener('click', onPlus);
    listeners.push(() => plus.removeEventListener('click', onPlus));
  }

  optionButtons.forEach((button) => {
    const onClick = () => {
      if (button.disabled) return;

      const group = button.dataset.optionGroup;
      if (!group) return;

      root.querySelectorAll<HTMLButtonElement>(`[data-option-group="${group}"]`).forEach((item) => {
        item.classList.remove('is-selected');
        item.setAttribute('aria-pressed', 'false');
      });

      button.classList.add('is-selected');
      button.setAttribute('aria-pressed', 'true');
      updateVariantUI(root);
      setQty(activeQty);
    };

    button.addEventListener('click', onClick);
    listeners.push(() => button.removeEventListener('click', onClick));
  });

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

  updateVariantUI(root);
  setQty(1);

  cleanup = () => {
    listeners.forEach((remove) => remove());
  };

  return cleanup;
}

export function getSelectedQuantity(root: HTMLElement): number {
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const variants = readVariants(root);
  const selections = getSelectedOptionsMap(root);
  const fullVariant = findVariantBySelections(variants, selections) as VariantPayload | undefined;
  const maxQty = maxQtyForVariant(fullVariant);
  const fromDataset = Number.parseInt(addBtn?.dataset.qty ?? '1', 10);
  return clampQty(Number.isFinite(fromDataset) ? fromDataset : 1, maxQty);
}

export function getSelectedVariantId(root: HTMLElement): string | undefined {
  const checked = root.querySelector<HTMLInputElement>('[data-variant-radio]:checked');
  if (checked?.dataset.variantId) {
    return checked.dataset.variantId;
  }

  const variants = readVariants(root);
  const selections = getSelectedOptionsMap(root);
  return findVariantBySelections(variants, selections)?.id;
}

export function refreshProductBuyUI(root?: HTMLElement): void {
  const target = root ?? getShopRoot();
  if (target) updateVariantUI(target);
}
