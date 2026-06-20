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
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [{ type: 'connectLink' }]
    })
  ]
});
