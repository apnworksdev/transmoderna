import { defineArrayMember, defineField, defineType } from 'sanity';

export const shopifyProductType = defineType({
  name: 'shopifyProduct',
  title: 'Shopify',
  type: 'object',
  description: 'Synced from Shopify via Sanity Connect. Do not edit commerce fields manually.',
  readOnly: true,
  options: { collapsed: false, collapsible: true },
  fieldsets: [
    { name: 'status', title: 'Status' },
    { name: 'organization', title: 'Organization', options: { columns: 2 } },
    {
      name: 'variants',
      title: 'Variants',
      options: { collapsed: true, collapsible: true }
    }
  ],
  fields: [
    defineField({ fieldset: 'status', name: 'createdAt', type: 'string' }),
    defineField({ fieldset: 'status', name: 'updatedAt', type: 'string' }),
    defineField({
      fieldset: 'status',
      name: 'status',
      type: 'string',
      options: {
        layout: 'dropdown',
        list: ['active', 'archived', 'draft']
      }
    }),
    defineField({
      fieldset: 'status',
      name: 'isDeleted',
      title: 'Deleted from Shopify?',
      type: 'boolean'
    }),
    defineField({
      name: 'title',
      type: 'string',
      description: 'Title displayed in Shopify'
    }),
    defineField({
      name: 'id',
      title: 'ID',
      type: 'number',
      description: 'Shopify Product ID'
    }),
    defineField({
      name: 'gid',
      title: 'GID',
      type: 'string',
      description: 'Shopify Product GID'
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      description: 'Shopify product handle'
    }),
    defineField({
      name: 'descriptionHtml',
      title: 'HTML description',
      type: 'text',
      rows: 5
    }),
    defineField({ fieldset: 'organization', name: 'productType', type: 'string' }),
    defineField({ fieldset: 'organization', name: 'vendor', type: 'string' }),
    defineField({
      fieldset: 'organization',
      name: 'tags',
      title: 'Tags',
      type: 'string',
      hidden: () => true,
      description: 'Synced from Shopify. Hidden in Studio — not needed for editorial work.'
    }),
    defineField({ name: 'priceRange', type: 'priceRange' }),
    defineField({
      name: 'previewImageUrl',
      title: 'Preview image URL',
      type: 'string'
    }),
    defineField({
      name: 'options',
      type: 'array',
      hidden: () => true,
      of: [{ type: 'option' }]
    }),
    defineField({
      fieldset: 'variants',
      name: 'variants',
      type: 'array',
      hidden: () => true,
      of: [
        defineArrayMember({
          title: 'Variant',
          type: 'reference',
          weak: true,
          to: [{ type: 'productVariant' }]
        })
      ]
    }),
    defineField({ name: 'shop', type: 'shopifyShop' }),
    defineField({
      name: 'shopifyTriggeredAt',
      title: 'Last Shopify sync',
      type: 'string'
    })
  ]
});
