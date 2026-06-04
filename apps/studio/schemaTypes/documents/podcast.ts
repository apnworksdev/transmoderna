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
      name: 'url',
      title: 'Listen URL',
      type: 'url',
      validation: (Rule) => Rule.required()
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
