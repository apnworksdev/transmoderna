import { BasketIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const productType = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'store',
      title: 'Shopify',
      type: 'shopifyProduct',
      description: 'Populated by Shopify / Sanity Connect sync.'
    }),
    defineField({
      name: 'body',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Editorial description for the site (optional; Shopify HTML is under store.descriptionHtml).'
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'SEO title', type: 'string' }),
        defineField({ name: 'description', title: 'SEO description', type: 'text', rows: 3 })
      ]
    })
  ],
  orderings: [
    {
      name: 'titleAsc',
      title: 'Title (A–Z)',
      by: [{ field: 'store.title', direction: 'asc' }]
    },
    {
      name: 'priceAsc',
      title: 'Price (lowest first)',
      by: [{ field: 'store.priceRange.minVariantPrice', direction: 'asc' }]
    }
  ],
  preview: {
    select: {
      isDeleted: 'store.isDeleted',
      previewImageUrl: 'store.previewImageUrl',
      priceRange: 'store.priceRange',
      status: 'store.status',
      title: 'store.title',
      slug: 'store.slug.current'
    },
    prepare({ isDeleted, previewImageUrl, priceRange, status, title, slug }) {
      const min = priceRange?.minVariantPrice;
      let subtitle =
        typeof min === 'number' && min > 0 ? String(min) : slug ?? undefined;
      if (status && status !== 'active') {
        subtitle = '(Unavailable in Shopify)';
      }
      if (isDeleted) {
        subtitle = '(Deleted from Shopify)';
      }

      return {
        title: title ?? 'Product',
        subtitle,
        media: previewImageUrl ? previewImageUrl : undefined
      };
    }
  }
});
