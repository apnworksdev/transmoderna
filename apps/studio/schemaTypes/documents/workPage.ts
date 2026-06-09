import { CaseIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const workPageType = defineType({
  name: 'workPage',
  title: 'Work page',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
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
      name: 'workItems',
      title: 'Work items',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'work' }] }],
      options: { sortable: true },
      description: 'Choose work items and drag to set the order shown on the work page.'
    }),
    defineField({
      name: 'clients',
      title: 'Clients',
      type: 'array',
      of: [{ type: 'client' }],
      options: { sortable: true }
    })
  ],
  preview: {
    prepare() {
      return { title: 'Work page' };
    }
  }
});
