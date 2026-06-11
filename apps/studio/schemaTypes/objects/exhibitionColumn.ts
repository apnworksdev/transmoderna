import { defineField, defineType } from 'sanity';
import {
  columnContentType,
  validateExhibitionMedia,
  validateExhibitionText
} from './exhibitionMediaValidation';

export const exhibitionColumnType = defineType({
  name: 'exhibitionColumn',
  title: 'Column',
  type: 'object',
  fields: [
    defineField({
      name: 'contentType',
      title: 'Content',
      type: 'string',
      options: {
        list: [
          { title: 'Empty', value: 'empty' },
          { title: 'Media', value: 'media' },
          { title: 'Text', value: 'text' }
        ],
        layout: 'radio'
      },
      initialValue: 'empty'
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'exhibitionMedia',
      hidden: ({ parent }) => parent?.contentType !== 'media',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (columnContentType(context) !== 'media') {
            return true;
          }
          return validateExhibitionMedia(value);
        })
    }),
    defineField({
      name: 'text',
      title: 'Text',
      type: 'exhibitionText',
      hidden: ({ parent }) => parent?.contentType !== 'text',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (columnContentType(context) !== 'text') {
            return true;
          }
          return validateExhibitionText(value);
        })
    })
  ],
  preview: {
    select: { contentType: 'contentType', title: 'text.title' },
    prepare({ contentType, title }) {
      if (contentType === 'media') {
        return { title: 'Media' };
      }
      if (contentType === 'text') {
        return { title: title || 'Text' };
      }
      return { title: 'Empty' };
    }
  }
});
