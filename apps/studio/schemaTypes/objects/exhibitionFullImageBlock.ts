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
    select: {
      kind: 'media.kind',
      videoUrl: 'media.videoUrl',
      youtubeUrl: 'media.youtubeUrl',
      media: 'media.image'
    },
    prepare({ kind, videoUrl, youtubeUrl, media }) {
      const vimeo = typeof videoUrl === 'string' ? videoUrl.trim() : '';
      const youtube = typeof youtubeUrl === 'string' ? youtubeUrl.trim() : '';
      return {
        title: kind === 'video' ? 'Full video' : 'Full image',
        subtitle: kind === 'video' ? youtube || vimeo || undefined : undefined,
        media
      };
    }
  }
});
