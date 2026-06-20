import { MicrophoneIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const podcastType = defineType({
  name: 'podcast',
  title: 'Podcast',
  type: 'document',
  icon: MicrophoneIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'podcaster',
      title: 'Podcaster',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'number',
      title: 'Number',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive()
    }),
    defineField({
      name: 'publishDate',
      title: 'Publish date',
      type: 'date',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'audioFile',
      title: 'Audio file',
      type: 'file',
      options: { accept: 'audio/*' },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'playerBackgroundImage',
      title: 'Player bar background',
      type: 'image',
      description: 'Background image inside the player bar on the single podcast page.',
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
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      initialValue: 0
    })
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrderAsc',
      by: [
        { field: 'sortOrder', direction: 'asc' },
        { field: 'number', direction: 'desc' }
      ]
    }
  ],
  preview: {
    select: { title: 'title', subtitle: 'podcaster', number: 'number' },
    prepare({ title, subtitle, number }) {
      return {
        title,
        subtitle: [subtitle, number != null ? String(number) : null].filter(Boolean).join(' · ')
      };
    }
  }
});
