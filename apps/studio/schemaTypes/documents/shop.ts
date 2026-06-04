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
      title: 'Featured products',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      options: { sortable: true },
      description:
        'Optional curated order. Leave empty to show all synced products alphabetically.'
    })
  ],
  preview: {
    prepare() {
      return { title: 'Shop' };
    }
  }
});
