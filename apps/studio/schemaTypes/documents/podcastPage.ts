import { MicrophoneIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const podcastPageType = defineType({
  name: 'podcastPage',
  title: 'Podcasts page',
  type: 'document',
  icon: MicrophoneIcon,
  fields: [
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
      description: 'Background image for the single podcast page.',
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
      name: 'podcasts',
      title: 'Podcasts',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'podcast' }] }],
      options: { sortable: true },
      description: 'Choose podcast episodes and drag to set the order shown on the podcasts page.'
    })
  ],
  preview: {
    prepare() {
      return { title: 'Podcasts page' };
    }
  }
});
