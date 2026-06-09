import { CaseIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const workType = defineType({
  name: 'work',
  title: 'Work',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1900).max(2100)
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 6
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      of: [{ type: 'workMedia' }]
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
        { field: 'year', direction: 'desc' }
      ]
    }
  ],
  preview: {
    select: { title: 'title', subtitle: 'year' },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? String(subtitle) : undefined };
    }
  }
});
