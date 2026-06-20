import { formatEurPrice } from '../lib/shop-format';

type VariantPayload = {
  id: string;
  title: string;
  selectedOptions: Array<{ name: string; value: string }>;
  price?: number;
  available: boolean;
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

function isDefaultTitleOption(name: string, value: string): boolean {
  return name === 'Title' && value === 'Default Title';
}

function findFullMatchingVariant(
  variants: VariantPayload[],
  selections: Map<string, string>
): VariantPayload | undefined {
  if (selections.size === 0) return undefined;

  return variants.find((variant) => {
    if (!variant.available) return false;
    const options = variant.selectedOptions.filter(
      (option) => !isDefaultTitleOption(option.name, option.value)
    );
    if (selections.size !== options.length) return false;
    return options.every((option) => selections.get(option.name) === option.value);
  });
}

function findMatchingVariant(
  variants: VariantPayload[],
  selections: Map<string, string>
): VariantPayload | undefined {
  if (variants.length === 0) return undefined;

  const fullMatch = findFullMatchingVariant(variants, selections);
  if (fullMatch) return fullMatch;

  if (selections.size === 0) {
    return variants.find((variant) => variant.available) ?? variants[0];
  }

  return variants.find((variant) => {
    if (!variant.available) return false;
    const options = variant.selectedOptions.filter(
      (option) => !isDefaultTitleOption(option.name, option.value)
    );
    return options.every((option) => {
      const selected = selections.get(option.name);
      return !selected || selected === option.value;
    });
  });
}

function isOptionValueAvailable(
  variants: VariantPayload[],
  selections: Map<string, string>,
  optionName: string,
  optionValue: string
): boolean {
  const hypothetical = new Map(selections);
  hypothetical.set(optionName, optionValue);

  return variants.some((variant) => {
    if (!variant.available) return false;
    const options = variant.selectedOptions.filter(
      (option) => !isDefaultTitleOption(option.name, option.value)
    );

    return (
      options.some((option) => option.name === optionName && option.value === optionValue) &&
      options.every((option) => {
        const selected = hypothetical.get(option.name);
        return !selected || selected === option.value;
      })
    );
  });
}

function syncVariantRadio(root: HTMLElement, variant?: VariantPayload): void {
  const radios = root.querySelectorAll<HTMLInputElement>('[data-variant-radio]');
  if (!variant) return;

  radios.forEach((radio) => {
    radio.checked = radio.dataset.variantId === variant.id;
  });
}

function updateVariantUI(root: HTMLElement): void {
  const variants = readVariants(root);
  const selections = getSelectedOptionsMap(root);
  const fullVariant = findFullMatchingVariant(variants, selections);
  const displayVariant = fullVariant ?? findMatchingVariant(variants, selections);
  const priceEl = root.querySelector('[data-variant-price]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-to-cart]');

  if (displayVariant && typeof displayVariant.price === 'number' && priceEl) {
    priceEl.textContent = formatEurPrice(displayVariant.price);
  }

  syncVariantRadio(root, fullVariant);

  if (addBtn) {
    addBtn.disabled = !fullVariant?.available;
  }

  root.querySelectorAll<HTMLButtonElement>('[data-option-value]').forEach((button) => {
    const optionName = button.dataset.optionGroup;
    const optionValue = button.dataset.optionValue;
    if (!optionName || !optionValue) return;

    button.disabled = !isOptionValueAvailable(variants, selections, optionName, optionValue);
  });
}

function clampQty(value: number): number {
  return Math.min(99, Math.max(1, value));
}

let cleanup: (() => void) | null = null;

export function destroyShopProduct(): void {
  cleanup?.();
  cleanup = null;
}

export function initShopProduct(): (() => void) | null {
  destroyShopProduct();

  const root = getShopRoot();
  if (!root || root.dataset.shopPage !== 'product') return null;

  const qtyValue = root.querySelector('[data-qty-value]');
  const minus = root.querySelector<HTMLButtonElement>('[data-qty-minus]');
  const plus = root.querySelector<HTMLButtonElement>('[data-qty-plus]');
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-to-cart]');
  const hero = root.querySelector<HTMLImageElement>('[data-product-hero]');
  const thumbs = root.querySelectorAll<HTMLButtonElement>('[data-product-thumb]');
  const optionButtons = root.querySelectorAll<HTMLButtonElement>('[data-option-value]');

  let qty = 1;

  const setQty = (next: number) => {
    qty = clampQty(next);
    if (qtyValue) qtyValue.textContent = String(qty);
    if (addBtn) addBtn.dataset.qty = String(qty);
  };

  const listeners: Array<() => void> = [];

  if (minus) {
    const onMinus = () => setQty(qty - 1);
    minus.addEventListener('click', onMinus);
    listeners.push(() => minus.removeEventListener('click', onMinus));
  }

  if (plus) {
    const onPlus = () => setQty(qty + 1);
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
  const fromDataset = Number.parseInt(addBtn?.dataset.qty ?? '1', 10);
  return clampQty(Number.isFinite(fromDataset) ? fromDataset : 1);
}
