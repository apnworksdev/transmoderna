import { defineField, defineType } from 'sanity';

/** Shopify store metadata written by Sanity Connect. */
export const shopifyShopType = defineType({
  name: 'shopifyShop',
  title: 'Shop',
  type: 'object',
  readOnly: true,
  fields: [defineField({ name: 'domain', title: 'Domain', type: 'string' })]
});
