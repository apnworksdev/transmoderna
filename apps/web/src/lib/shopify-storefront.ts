const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const marketCountry = import.meta.env.PUBLIC_SHOPIFY_MARKET_COUNTRY;
const apiVersion = '2024-01';

const VARIANTS_FIRST = 250;
const IMAGES_FIRST = 12;
const CART_LINES_FIRST = 250;

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

const PRODUCT_BY_HANDLE_QUERY = (country: string | null) =>
  country
    ? `query ProductByHandle($handle: String!, $country: CountryCode!) ${inContextDirective(country)} {
        product(handle: $handle) {
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
        }
      }`
    : `query ProductByHandle($handle: String!) {
        product(handle: $handle) {
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
        }
      }`;

export async function fetchProductStorefrontDataByHandle(
  handle: string
): Promise<StorefrontProductData | null> {
  const country = getMarketCountry();
  const data = await storefrontFetch<{
    product?: {
      images?: { edges?: Array<{ node?: { url?: string; altText?: string | null } }> };
      options?: Array<{ name?: string; values?: string[] }>;
      variants?: { edges?: Array<{ node?: StorefrontVariant }> };
    } | null;
  }>(PRODUCT_BY_HANDLE_QUERY(country), country ? { handle, country } : { handle });

  if (!data.product) {
    return null;
  }

  const images = (data.product.images?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is { url: string; altText?: string | null } => Boolean(node?.url))
    .map((node) => ({ url: node.url, altText: node.altText }));

  const options = (data.product.options ?? [])
    .filter((option): option is { name: string; values: string[] } => Boolean(option?.name))
    .map((option) => ({
      name: option.name,
      values: option.values ?? []
    }));

  const variantEdges = data.product.variants?.edges ?? [];
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
