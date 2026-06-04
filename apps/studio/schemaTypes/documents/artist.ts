import { UserIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const artistType = defineType({
  name: 'artist',
  title: 'Artist',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      validation: (Rule) => Rule.required()
    })
  ],
  preview: {
    select: { title: 'name', subtitle: 'country' }
  }
});
