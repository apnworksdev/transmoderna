import { defineField, defineType } from 'sanity';

export const exhibitionTextType = defineType({
  name: 'exhibitionText',
  title: 'Text',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string'
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 6
    }),
    defineField({
      name: 'footnote',
      title: 'Footnote',
      type: 'text',
      rows: 3
    })
  ],
  preview: {
    select: { title: 'title', content: 'content' },
    prepare({ title, content }) {
      return {
        title: title || 'Text block',
        subtitle: typeof content === 'string' ? content : undefined
      };
    }
  }
});
