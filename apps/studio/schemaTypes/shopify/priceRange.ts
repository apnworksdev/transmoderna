import { defineField, defineType } from 'sanity';

export const priceRangeType = defineType({
  name: 'priceRange',
  title: 'Price range',
  type: 'object',
  readOnly: true,
  options: { columns: 2 },
  fields: [
    defineField({ name: 'minVariantPrice', title: 'Min price', type: 'number' }),
    defineField({ name: 'maxVariantPrice', title: 'Max price', type: 'number' })
  ]
});
