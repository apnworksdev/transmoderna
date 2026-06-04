import { ImagesIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const portfolioItemType = defineType({
  name: 'portfolioItem',
  title: 'Portfolio item',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'portfolioMedia',
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
      by: [{ field: 'sortOrder', direction: 'asc' }]
    }
  ],
  preview: {
    select: { title: 'title', media: 'media.image' }
  }
});
