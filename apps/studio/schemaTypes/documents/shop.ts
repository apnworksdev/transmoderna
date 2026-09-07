import { BasketIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const shopType = defineType({
  name: 'shop',
  title: 'Shop',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Shown at the top of the shop page.'
    }),
    defineField({
      name: 'products',
      title: 'Products',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'product' }],
          options: {
            disableNew: true,
            filter:
              'store.isDeleted != true && (!defined(store.status) || store.status == "active")'
          }
        }
      ],
      options: { sortable: true },
      description:
        'Only these products are shown and loaded on the site, in this order. Sync from Shopify first, then add each product you want live.',
      validation: (Rule) => Rule.unique()
    })
  ],
  preview: {
    prepare() {
      return { title: 'Shop' };
    }
  }
});
