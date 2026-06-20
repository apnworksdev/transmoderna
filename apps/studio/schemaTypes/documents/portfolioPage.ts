import { PresentationIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const portfolioPageType = defineType({
  name: 'portfolioPage',
  title: 'Portfolio page',
  type: 'document',
  icon: PresentationIcon,
  fields: [
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
      description: 'Background for the portfolio listing page.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'portfolioItems',
      title: 'Portfolio items',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'portfolioItem' }] }],
      options: { sortable: true },
      description: 'Choose portfolio items and drag to set the order shown on the portfolio page.'
    })
  ],
  preview: {
    prepare() {
      return { title: 'Portfolio page' };
    }
  }
});
