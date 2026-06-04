import { defineField, defineType } from 'sanity';

export const optionType = defineType({
  name: 'option',
  title: 'Product option',
  type: 'object',
  readOnly: true,
  fields: [
    defineField({ name: 'name', type: 'string' }),
    defineField({
      name: 'values',
      type: 'array',
      of: [{ type: 'string' }]
    })
  ],
  preview: {
    select: { name: 'name' },
    prepare({ name }) {
      return { title: name ?? 'Option' };
    }
  }
});
