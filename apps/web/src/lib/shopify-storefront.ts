const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const marketCountry = import.meta.env.PUBLIC_SHOPIFY_MARKET_COUNTRY;
const apiVersion = '2024-01';

export type StorefrontVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price?: { amount: string; currencyCode: string };
  selectedOptions?: Array<{ name: string; value: string }>;
  image?: { url?: string; altText?: string | null } | null;
};

export type StorefrontProductMedia = {
  images: Array<{ url: string; altText?: string | null }>;
  options: Array<{ name: string; values: string[] }>;
};

export function isStorefrontConfigured(): boolean {
  return Boolean(
    typeof domain === 'string' &&
      domain.length > 0 &&
      typeof token === 'string' &&
      token.length > 0
  );
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

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Shopify Storefront error');
  }

  if (!json.data) {
    throw new Error('Empty Storefront API response');
  }

  return json.data;
}

function inContextDirective(country: string | null): string {
  return country ? '@inContext(country: $country)' : '';
}

export async function fetchProductVariantsByHandle(
  handle: string
): Promise<StorefrontVariant[]> {
  const country = typeof marketCountry === 'string' && marketCountry ? marketCountry : null;

  const query = country
    ? `query ProductVariants($handle: String!, $country: CountryCode!) ${inContextDirective(country)} {
        product(handle: $handle) {
          variants(first: 50) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
                selectedOptions { name value }
                image { url altText }
              }
            }
          }
        }
      }`
    : `query ProductVariants($handle: String!) {
        product(handle: $handle) {
          variants(first: 50) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
                selectedOptions { name value }
                image { url altText }
              }
            }
          }
        }
      }`;

  const data = await storefrontFetch<{
    product?: {
      variants?: {
        edges?: Array<{ node?: StorefrontVariant }>;
      };
    } | null;
  }>(query, country ? { handle, country } : { handle });

  return (data.product?.variants?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is StorefrontVariant => Boolean(node?.id));
}

export async function fetchProductMediaByHandle(
  handle: string
): Promise<StorefrontProductMedia | null> {
  const country = typeof marketCountry === 'string' && marketCountry ? marketCountry : null;

  const query = country
    ? `query ProductMedia($handle: String!, $country: CountryCode!) ${inContextDirective(country)} {
        product(handle: $handle) {
          images(first: 12) {
            edges {
              node { url altText }
            }
          }
          options {
            name
            values
          }
        }
      }`
    : `query ProductMedia($handle: String!) {
        product(handle: $handle) {
          images(first: 12) {
            edges {
              node { url altText }
            }
          }
          options {
            name
            values
          }
        }
      }`;

  const data = await storefrontFetch<{
    product?: {
      images?: { edges?: Array<{ node?: { url?: string; altText?: string | null } }> };
      options?: Array<{ name?: string; values?: string[] }>;
    } | null;
  }>(query, country ? { handle, country } : { handle });

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

  return { images, options };
}
