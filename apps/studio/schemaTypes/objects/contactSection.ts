import { defineField, defineType } from 'sanity';

export const contactSectionType = defineType({
  name: 'contactSection',
  title: 'Contact section',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string'
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }]
    })
  ]
});
