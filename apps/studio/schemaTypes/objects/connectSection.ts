import { defineField, defineType } from 'sanity';

export const connectSectionType = defineType({
  name: 'connectSection',
  title: 'Connect section',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string'
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [{ type: 'connectLink' }]
    })
  ]
});
