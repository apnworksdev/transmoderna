import { PresentationIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const exhibitionsPageType = defineType({
  name: 'exhibitionsPage',
  title: 'Exhibitions page',
  type: 'document',
  icon: PresentationIcon,
  fields: [
    defineField({
      name: 'thumbnailBackgroundImage',
      title: 'Thumbnail view background',
      type: 'image',
      description: 'Background image for the thumbnail view mode.',
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
      name: 'fullBackgroundImage',
      title: 'Full view background',
      type: 'image',
      description: 'Background image for the full view mode.',
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
      name: 'exhibitions',
      title: 'Exhibitions',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'exhibition' }] }],
      options: { sortable: true },
      description: 'Choose exhibitions and drag to set the order shown on the exhibitions page.'
    })
  ],
  preview: {
    prepare() {
      return { title: 'Exhibitions page' };
    }
  }
});
