const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const marketCountry = import.meta.env.PUBLIC_SHOPIFY_MARKET_COUNTRY;
const apiVersion = '2024-01';

const VARIANTS_FIRST = 250;
const IMAGES_FIRST = 12;
const CART_LINES_FIRST = 250;
const STOREFRONT_CACHE_TTL_MS = 60_000;
const STOREFRONT_BATCH_SIZE = 10;
const HANDLE_PATTERN = /^[a-zA-Z0-9_-]+$/;

export type StorefrontVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  price?: { amount: string; currencyCode: string };
  selectedOptions?: Array<{ name: string; value: string }>;
  image?: { url?: string; altText?: string | null } | null;
};

export type StorefrontProductMedia = {
  images: Array<{ url: string; altText?: string | null }>;
  options: Array<{ name: string; values: string[] }>;
};

export type StorefrontProductData = {
  images: StorefrontProductMedia['images'];
  options: StorefrontProductMedia['options'];
  variants: StorefrontVariant[];
  variantsTruncated: boolean;
};

type StorefrontCacheEntry = {
  expiresAt: number;
  value: StorefrontProductData | null;
};

const storefrontCache = new Map<string, StorefrontCacheEntry>();

export function isStorefrontConfigured(): boolean {
  return Boolean(
    typeof domain === 'string' &&
      domain.length > 0 &&
      typeof token === 'string' &&
      token.length > 0
  );
}

function getMarketCountry(): string | null {
  return typeof marketCountry === 'string' && marketCountry ? marketCountry : null;
}

function inContextDirective(country: string | null): string {
  return country ? '@inContext(country: $country)' : '';
}

function sanitizeHandle(handle: string): string | null {
  const trimmed = handle.trim();
  return HANDLE_PATTERN.test(trimmed) ? trimmed : null;
}

function readCachedProduct(handle: string): StorefrontProductData | null | undefined {
  const entry = storefrontCache.get(handle);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    storefrontCache.delete(handle);
    return undefined;
  }

  return entry.value;
}

function writeCachedProduct(handle: string, value: StorefrontProductData | null): void {
  storefrontCache.set(handle, {
    expiresAt: Date.now() + STOREFRONT_CACHE_TTL_MS,
    value
  });
}

async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!isStorefrontConfigured()) {
    throw new Error('Shopify Storefront API is not configured');
  }

  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token as string
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront HTTP ${res.status}`);
  }

  let json: { data?: T; errors?: Array<{ message?: string }> };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error('Invalid Shopify Storefront response');
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Shopify Storefront error');
  }

  if (!json.data) {
    throw new Error('Empty Storefront API response');
  }

  return json.data;
}

const PRODUCT_FIELDS = `
  images(first: ${IMAGES_FIRST}) {
    edges { node { url altText } }
  }
  options { name values }
  variants(first: ${VARIANTS_FIRST}) {
    edges {
      node {
        id
        title
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        selectedOptions { name value }
        image { url altText }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = (country: string | null) =>
  country
    ? `query ProductByHandle($handle: String!, $country: CountryCode!) ${inContextDirective(country)} {
        product(handle: $handle) {
          ${PRODUCT_FIELDS}
        }
      }`
    : `query ProductByHandle($handle: String!) {
        product(handle: $handle) {
          ${PRODUCT_FIELDS}
        }
      }`;

type RawStorefrontProduct = {
  images?: { edges?: Array<{ node?: { url?: string; altText?: string | null } }> };
  options?: Array<{ name?: string; values?: string[] }>;
  variants?: { edges?: Array<{ node?: StorefrontVariant }> };
};

function parseStorefrontProduct(product: RawStorefrontProduct | null | undefined): StorefrontProductData | null {
  if (!product) {
    return null;
  }

  const images = (product.images?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is { url: string; altText?: string | null } => Boolean(node?.url))
    .map((node) => ({ url: node.url, altText: node.altText }));

  const options = (product.options ?? [])
    .filter((option): option is { name: string; values: string[] } => Boolean(option?.name))
    .map((option) => ({
      name: option.name,
      values: option.values ?? []
    }));

  const variantEdges = product.variants?.edges ?? [];
  const variants = variantEdges
    .map((edge) => edge.node)
    .filter((node): node is StorefrontVariant => Boolean(node?.id));

  return {
    images,
    options,
    variants,
    variantsTruncated: variantEdges.length >= VARIANTS_FIRST
  };
}

function buildProductsBatchQuery(handles: string[], country: string | null): string {
  const productSelections = handles
    .map((_, index) => `p${index}: product(handle: $handle${index}) { ${PRODUCT_FIELDS} }`)
    .join('\n');

  const variableDefs = handles.map((_, index) => `$handle${index}: String!`).join(', ');
  const context = country ? `($country: CountryCode!, ${variableDefs}) ${inContextDirective(country)}` : `(${variableDefs})`;

  return `query ProductsBatch${context} {\n${productSelections}\n}`;
}

async function fetchProductsBatch(handles: string[]): Promise<Map<string, StorefrontProductData | null>> {
  const country = getMarketCountry();
  const query = buildProductsBatchQuery(handles, country);
  const variables: Record<string, unknown> = {};

  handles.forEach((handle, index) => {
    variables[`handle${index}`] = handle;
  });

  if (country) {
    variables.country = country;
  }

  const data = await storefrontFetch<Record<string, RawStorefrontProduct | null>>(query, variables);
  const results = new Map<string, StorefrontProductData | null>();

  handles.forEach((handle, index) => {
    const parsed = parseStorefrontProduct(data[`p${index}`]);
    results.set(handle, parsed);
    writeCachedProduct(handle, parsed);
  });

  return results;
}

export async function fetchProductsStorefrontDataByHandles(
  handles: string[]
): Promise<Map<string, StorefrontProductData | null>> {
  const uniqueHandles = [...new Set(handles.map(sanitizeHandle).filter((handle): handle is string => Boolean(handle)))];

  if (uniqueHandles.length === 0) {
    return new Map();
  }

  if (!isStorefrontConfigured()) {
    return new Map(uniqueHandles.map((handle) => [handle, null]));
  }

  const results = new Map<string, StorefrontProductData | null>();
  const handlesToFetch: string[] = [];

  for (const handle of uniqueHandles) {
    const cached = readCachedProduct(handle);
    if (cached !== undefined) {
      results.set(handle, cached);
    } else {
      handlesToFetch.push(handle);
    }
  }

  if (handlesToFetch.length === 0) {
    return results;
  }

  try {
    for (let index = 0; index < handlesToFetch.length; index += STOREFRONT_BATCH_SIZE) {
      const batch = handlesToFetch.slice(index, index + STOREFRONT_BATCH_SIZE);
      const batchResults = await fetchProductsBatch(batch);
      batchResults.forEach((value, handle) => results.set(handle, value));
    }
  } catch (error) {
    console.error('[shopify-storefront] batch fetch failed:', error);
    for (const handle of handlesToFetch) {
      if (!results.has(handle)) {
        results.set(handle, null);
      }
    }
  }

  return results;
}

export async function fetchProductStorefrontDataByHandle(
  handle: string
): Promise<StorefrontProductData | null> {
  const safeHandle = sanitizeHandle(handle);
  if (!safeHandle) {
    return null;
  }

  const cached = readCachedProduct(safeHandle);
  if (cached !== undefined) {
    return cached;
  }

  if (!isStorefrontConfigured()) {
    return null;
  }

  try {
    const country = getMarketCountry();
    const data = await storefrontFetch<{ product?: RawStorefrontProduct | null }>(
      PRODUCT_BY_HANDLE_QUERY(country),
      country ? { handle: safeHandle, country } : { handle: safeHandle }
    );

    const parsed = parseStorefrontProduct(data.product);
    writeCachedProduct(safeHandle, parsed);
    return parsed;
  } catch (error) {
    console.error('[shopify-storefront] fetch failed:', error);
    return null;
  }
}

/** @deprecated Use fetchProductStorefrontDataByHandle */
export async function fetchProductVariantsByHandle(
  handle: string
): Promise<StorefrontVariant[]> {
  const data = await fetchProductStorefrontDataByHandle(handle);
  return data?.variants ?? [];
}

/** @deprecated Use fetchProductStorefrontDataByHandle */
export async function fetchProductMediaByHandle(
  handle: string
): Promise<StorefrontProductMedia | null> {
  const data = await fetchProductStorefrontDataByHandle(handle);
  if (!data) return null;
  return { images: data.images, options: data.options };
}

export { CART_LINES_FIRST, VARIANTS_FIRST };
