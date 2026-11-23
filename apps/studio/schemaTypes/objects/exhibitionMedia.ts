import { isYouTubeUrl } from '@repo/shared';
import { defineField, defineType } from 'sanity';
import { isVimeoUrl } from './vimeoVideo';

export const exhibitionMediaType = defineType({
  name: 'exhibitionMedia',
  title: 'Media',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Media type',
      type: 'string',
      options: {
        list: [
          { title: 'Image', value: 'image' },
          { title: 'Video', value: 'video' }
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
      name: 'videoUrl',
      title: 'Vimeo URL',
      type: 'url',
      description: 'Paste the Vimeo share link (Share → Copy link). Leave empty when using YouTube.',
      hidden: ({ parent }) => parent?.kind !== 'video',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { kind?: string; youtubeUrl?: string };
          if (parent?.kind !== 'video') {
            return true;
          }
          const youtube = parent.youtubeUrl?.trim() ?? '';
          const vimeo = typeof value === 'string' ? value.trim() : '';
          if (vimeo && youtube) {
            return 'Remove this or the YouTube URL — use one host';
          }
          if (!vimeo) {
            return youtube ? true : 'Add a Vimeo URL or a YouTube URL';
          }
          return isVimeoUrl(vimeo) ? true : 'Use a valid vimeo.com URL';
        })
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
      description:
        'Paste a YouTube link (watch, share, Shorts, or youtu.be). The site plays it in the same custom player as Vimeo, without the YouTube interface. Leave the Vimeo URL empty.',
      hidden: ({ parent }) => parent?.kind !== 'video',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { kind?: string; videoUrl?: string };
          if (parent?.kind !== 'video') {
            return true;
          }
          const vimeo = parent.videoUrl?.trim() ?? '';
          const youtube = typeof value === 'string' ? value.trim() : '';
          if (!youtube) {
            return true;
          }
          if (vimeo) {
            return 'Remove this or the Vimeo URL — use one host';
          }
          return isYouTubeUrl(youtube) ? true : 'Use a valid YouTube URL';
        })
    })
  ],
  preview: {
    select: { kind: 'kind', videoUrl: 'videoUrl', youtubeUrl: 'youtubeUrl', media: 'image' },
    prepare({ kind, videoUrl, youtubeUrl, media }) {
      const vimeo = typeof videoUrl === 'string' ? videoUrl.trim() : '';
      const youtube = typeof youtubeUrl === 'string' ? youtubeUrl.trim() : '';
      return {
        title: kind === 'video' ? youtube || vimeo || 'Video' : 'Image',
        media
      };
    }
  }
});
