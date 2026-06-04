const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const marketCountry = import.meta.env.PUBLIC_SHOPIFY_MARKET_COUNTRY;
const apiVersion = '2024-01';

export type StorefrontVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price?: { amount: string; currencyCode: string };
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

export async function fetchProductVariantsByHandle(
  handle: string
): Promise<StorefrontVariant[]> {
  const country = typeof marketCountry === 'string' && marketCountry ? marketCountry : null;

  const query = country
    ? `query ProductVariants($handle: String!, $country: CountryCode!) @inContext(country: $country) {
        product(handle: $handle) {
          variants(first: 50) {
            edges {
              node {
                id
                title
                availableForSale
                price { amount currencyCode }
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
