import { defineField, defineType } from 'sanity';

export const inventoryType = defineType({
  name: 'inventory',
  title: 'Inventory',
  type: 'object',
  readOnly: true,
  options: { columns: 3 },
  fields: [
    defineField({ name: 'isAvailable', title: 'Available', type: 'boolean' }),
    defineField({ name: 'management', type: 'string' }),
    defineField({ name: 'policy', type: 'string' })
  ]
});
