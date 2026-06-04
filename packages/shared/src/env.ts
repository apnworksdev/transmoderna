import { z } from 'zod';

export const serverEnvSchema = z.object({
  SANITY_STUDIO_PROJECT_ID: z.string().min(1),
  SANITY_STUDIO_DATASET: z.string().default('production'),
  SANITY_API_WRITE_TOKEN: z.string().min(1).optional(),
  SANITY_API_READ_TOKEN: z.string().optional(),
  SANITY_STUDIO_SHOPIFY_DOMAIN: z.string().optional(),
  SANITY_STUDIO_SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional()
});

export const publicEnvSchema = z.object({
  PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
  PUBLIC_SANITY_DATASET: z.string().default('production'),
  PUBLIC_SANITY_API_VERSION: z.string().default('2025-08-15'),
  PUBLIC_SHOPIFY_DOMAIN: z.string().optional(),
  PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().optional(),
  PUBLIC_SHOPIFY_MARKET_COUNTRY: z.string().optional()
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
