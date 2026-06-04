import { publicEnvSchema, serverEnvSchema } from '@repo/shared';

function readServerEnvRecord(): Record<string, string | undefined> {
  return {
    SANITY_STUDIO_PROJECT_ID: import.meta.env.SANITY_STUDIO_PROJECT_ID,
    SANITY_STUDIO_DATASET: import.meta.env.SANITY_STUDIO_DATASET,
    SANITY_API_WRITE_TOKEN: import.meta.env.SANITY_API_WRITE_TOKEN,
    SANITY_API_READ_TOKEN: import.meta.env.SANITY_API_READ_TOKEN,
    SANITY_STUDIO_SHOPIFY_DOMAIN: import.meta.env.SANITY_STUDIO_SHOPIFY_DOMAIN,
    SANITY_STUDIO_SHOPIFY_ADMIN_ACCESS_TOKEN:
      import.meta.env.SANITY_STUDIO_SHOPIFY_ADMIN_ACCESS_TOKEN
  };
}

function readPublicEnvRecord(): Record<string, string | undefined> {
  return {
    PUBLIC_SANITY_PROJECT_ID: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
    PUBLIC_SANITY_DATASET: import.meta.env.PUBLIC_SANITY_DATASET,
    PUBLIC_SANITY_API_VERSION: import.meta.env.PUBLIC_SANITY_API_VERSION,
    PUBLIC_SHOPIFY_DOMAIN: import.meta.env.PUBLIC_SHOPIFY_DOMAIN,
    PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN:
      import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    PUBLIC_SHOPIFY_MARKET_COUNTRY: import.meta.env.PUBLIC_SHOPIFY_MARKET_COUNTRY
  };
}

export function getServerEnv() {
  return serverEnvSchema.parse(readServerEnvRecord());
}

export function getPublicEnv() {
  return publicEnvSchema.parse(readPublicEnvRecord());
}

export function hasPublicSanityEnv(): boolean {
  const id = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  return typeof id === 'string' && id.length > 0 && id !== 'ci-placeholder';
}
