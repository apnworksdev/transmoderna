import type { StorefrontVariant } from './shopify-storefront';

export type ProductOption = {
  name: string;
  values: string[];
};

export type SelectableVariant = {
  id: string;
  title?: string;
  availableForSale: boolean;
  selectedOptions?: Array<{ name: string; value: string }>;
};

export function isDefaultTitleOption(name: string, values: string[]): boolean {
  return name === 'Title' && values.length === 1 && values[0] === 'Default Title';
}

export function filterProductOptions(options: ProductOption[]): ProductOption[] {
  return options.filter(
    (option) => option.name && option.values.length > 0 && !isDefaultTitleOption(option.name, option.values)
  );
}

export function buildOptionsFromVariants(variants: StorefrontVariant[]): ProductOption[] {
  const map = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const option of variant.selectedOptions ?? []) {
      if (isDefaultTitleOption(option.name, [option.value])) continue;
      if (!map.has(option.name)) {
        map.set(option.name, new Set());
      }
      map.get(option.name)?.add(option.value);
    }
  }

  return Array.from(map.entries()).map(([name, values]) => ({
    name,
    values: [...values]
  }));
}

export function resolveProductOptions(
  options: ProductOption[] | undefined,
  variants: StorefrontVariant[]
): ProductOption[] {
  const fromMedia = filterProductOptions(options ?? []);
  if (fromMedia.length > 0) {
    return fromMedia;
  }
  return buildOptionsFromVariants(variants);
}

export function getDefaultVariant(variants: StorefrontVariant[]): StorefrontVariant | undefined {
  return variants.find((variant) => variant.availableForSale) ?? variants[0];
}

export function getInitialOptionSelections(
  options: ProductOption[],
  variants: StorefrontVariant[],
  defaultVariant?: StorefrontVariant
): Map<string, string> {
  const selections = new Map<string, string>();

  for (const option of options) {
    const fromVariant = defaultVariant?.selectedOptions?.find((item) => item.name === option.name)
      ?.value;
    if (fromVariant && option.values.includes(fromVariant)) {
      selections.set(option.name, fromVariant);
      continue;
    }

    const firstAvailable = option.values.find((value) =>
      isOptionValueAvailable(variants, new Map(), option.name, value)
    );

    if (firstAvailable) {
      selections.set(option.name, firstAvailable);
    } else if (option.values[0]) {
      selections.set(option.name, option.values[0]);
    }
  }

  return selections;
}

export function findVariantBySelections(
  variants: SelectableVariant[],
  selections: Map<string, string>
): SelectableVariant | undefined {
  return variants.find((variant) => variantMatchesSelections(variant, selections, true));
}

export function findDisplayVariantBySelections(
  variants: SelectableVariant[],
  selections: Map<string, string>
): SelectableVariant | undefined {
  if (variants.length === 0) return undefined;

  const fullMatch = findVariantBySelections(variants, selections);
  if (fullMatch) return fullMatch;

  if (selections.size === 0) {
    return variants.find((variant) => variant.availableForSale) ?? variants[0];
  }

  return variants.find((variant) => {
    if (!variant.availableForSale) return false;
    const options = meaningfulOptions(variant);
    return options.every((option) => {
      const selected = selections.get(option.name);
      return !selected || selected === option.value;
    });
  });
}

export function isOptionValueAvailable(
  variants: SelectableVariant[],
  selections: Map<string, string>,
  optionName: string,
  optionValue: string
): boolean {
  const hypothetical = new Map(selections);
  hypothetical.set(optionName, optionValue);

  return variants.some(
    (variant) =>
      variant.availableForSale &&
      variantMatchesSelections(variant, hypothetical, false, optionName, optionValue)
  );
}

function meaningfulOptions(variant: SelectableVariant) {
  return (variant.selectedOptions ?? []).filter(
    (option) => !isDefaultTitleOption(option.name, [option.value])
  );
}

function variantMatchesSelections(
  variant: SelectableVariant,
  selections: Map<string, string>,
  requireFullMatch: boolean,
  requiredOptionName?: string,
  requiredOptionValue?: string
): boolean {
  if (!variant.availableForSale) return false;

  const options = meaningfulOptions(variant);
  if (requireFullMatch && selections.size !== options.length) return false;

  const matchesSelections = options.every((option) => {
    const selected = selections.get(option.name);
    return !selected || selected === option.value;
  });

  if (!matchesSelections) return false;

  if (requiredOptionName && requiredOptionValue) {
    return options.some(
      (option) => option.name === requiredOptionName && option.value === requiredOptionValue
    );
  }

  if (requireFullMatch) {
    return options.every((option) => selections.has(option.name));
  }

  return true;
}
