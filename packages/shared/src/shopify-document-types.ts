export const SHOPIFY_DOCUMENT_TYPES = [
  'product',
  'productVariant',
  'collection'
] as const;

export type ShopifyDocumentType = (typeof SHOPIFY_DOCUMENT_TYPES)[number];
