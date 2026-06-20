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
      title: 'Page background image',
      type: 'image',
      description: 'Full-page background on single podcast pages (behind the player bar).',
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
