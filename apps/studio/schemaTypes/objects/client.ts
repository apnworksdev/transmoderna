import { defineField, defineType } from 'sanity';

export const clientType = defineType({
  name: 'client',
  title: 'Client',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required()
    })
  ],
  preview: {
    select: { title: 'name' }
  }
});
