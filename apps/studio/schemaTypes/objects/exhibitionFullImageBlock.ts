import { defineField, defineType } from 'sanity';
import { validateExhibitionMedia } from './exhibitionMediaValidation';

export const exhibitionFullImageBlockType = defineType({
  name: 'exhibitionFullImageBlock',
  title: 'Full image',
  type: 'object',
  fields: [
    defineField({
      name: 'media',
      title: 'Media',
      type: 'exhibitionMedia',
      validation: (Rule) => Rule.custom((value) => validateExhibitionMedia(value))
    })
  ],
  preview: {
    select: { kind: 'media.kind', videoUrl: 'media.videoUrl', media: 'media.image' },
    prepare({ kind, videoUrl, media }) {
      return {
        title: kind === 'video' ? 'Full video' : 'Full image',
        subtitle: kind === 'video' && typeof videoUrl === 'string' ? videoUrl : undefined,
        media
      };
    }
  }
});
