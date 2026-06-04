export const productDocumentId = (shopifyProductId: number) =>
  `shopifyProduct-${shopifyProductId}`;

export const variantDocumentId = (variantId: number) =>
  `shopifyProductVariant-${variantId}`;

export const brandDocumentId = (slug: string) => `brand-${slug}`;

export const tagDocumentId = (slug: string) => `tag-${slug}`;
