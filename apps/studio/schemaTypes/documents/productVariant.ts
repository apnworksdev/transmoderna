import { CopyIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const productVariantType = defineType({
  name: 'productVariant',
  title: 'Product variant',
  type: 'document',
  icon: CopyIcon,
  fields: [
    defineField({
      name: 'store',
      title: 'Shopify',
      type: 'shopifyProductVariant',
      description: 'Variant data from Shopify (read-only)'
    })
  ],
  preview: {
    select: {
      isDeleted: 'store.isDeleted',
      sku: 'store.sku',
      status: 'store.status',
      title: 'store.title'
    },
    prepare({ isDeleted, sku, status, title }) {
      const subtitle = [
        sku,
        status && status !== 'active' ? `(${status})` : null,
        isDeleted ? '(deleted)' : null
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        title: title ?? 'Variant',
        subtitle: subtitle || undefined
      };
    }
  }
});
