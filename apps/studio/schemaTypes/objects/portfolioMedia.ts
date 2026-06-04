import { defineField, defineType } from 'sanity';

export const portfolioMediaType = defineType({
  name: 'portfolioMedia',
  title: 'Portfolio media',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Media type',
      type: 'string',
      options: {
        list: [
          { title: 'Image', value: 'image' },
          { title: 'Vimeo', value: 'vimeo' }
        ],
        layout: 'radio'
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.kind !== 'image',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'vimeo',
      title: 'Vimeo',
      type: 'vimeoVideo',
      hidden: ({ parent }) => parent?.kind !== 'vimeo'
    })
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const media = value as { kind?: string; image?: unknown; vimeo?: { url?: string } };
      if (!media?.kind) {
        return 'Choose image or Vimeo';
      }
      if (media.kind === 'image' && !media.image) {
        return 'Add an image';
      }
      if (media.kind === 'vimeo' && !media.vimeo?.url) {
        return 'Add a Vimeo URL';
      }
      return true;
    })
});
