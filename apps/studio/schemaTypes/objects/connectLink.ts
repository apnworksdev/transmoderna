import { defineField, defineType } from 'sanity';

export const connectLinkType = defineType({
  name: 'connectLink',
  title: 'Connect link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      description: 'Web URL, or mailto:/tel: link.',
      validation: (Rule) => Rule.required()
    })
  ],
  preview: {
    select: { title: 'label', subtitle: 'url' }
  }
});
