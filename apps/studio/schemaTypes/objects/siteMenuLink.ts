import { defineField, defineType } from 'sanity';

export const siteMenuLinkType = defineType({
  name: 'siteMenuLink',
  title: 'Menu link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'href',
      title: 'Path',
      type: 'string',
      description: 'Internal path, e.g. /work',
      validation: (Rule) =>
        Rule.required().regex(/^\/[a-z0-9-/]*$/i, {
          name: 'path',
          invert: false
        })
    }),
    defineField({
      name: 'image',
      title: 'Thumbnail',
      type: 'image',
      description: 'Shown in the full-screen menu.',
      validation: (Rule) => Rule.required(),
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })]
    })
  ],
  preview: {
    select: { title: 'label', subtitle: 'href', media: 'image' }
  }
});
