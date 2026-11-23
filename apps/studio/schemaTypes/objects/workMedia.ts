import { isYouTubeUrl } from '@repo/shared';
import { defineField, defineType } from 'sanity';
import { isVimeoUrl } from './vimeoVideo';

export const workMediaType = defineType({
  name: 'workMedia',
  title: 'Work media',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Vimeo URL',
      type: 'url',
      description:
        'Optional. Paste the Vimeo share link (Share → Copy link). The site plays it in the custom player — not the Vimeo embed. Leave this empty to use a YouTube URL or an image instead.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const youtube = (context.parent as { youtubeUrl?: string } | undefined)?.youtubeUrl?.trim();
          if (typeof value === 'string' && value.trim() && youtube) {
            return 'Remove this or the YouTube URL — use one host';
          }
          if (!value) {
            return true;
          }
          return isVimeoUrl(value) ? true : 'Use a valid vimeo.com URL';
        })
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
      description:
        'Optional. Paste a YouTube link (watch, share, Shorts, or youtu.be). The site plays it in the same custom player as Vimeo, without the YouTube interface. Use this or a Vimeo URL, not both.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const vimeo = (context.parent as { url?: string } | undefined)?.url?.trim();
          if (typeof value === 'string' && value.trim() && vimeo) {
            return 'Remove this or the Vimeo URL — use one host';
          }
          if (!value) {
            return true;
          }
          return isYouTubeUrl(value) ? true : 'Use a valid YouTube URL';
        })
    }),
    defineField({
      name: 'poster',
      title: 'Video poster',
      type: 'image',
      options: { hotspot: true },
      description:
        'Shown before the video plays (especially important in Safari). Recommended when a Vimeo or YouTube URL is set.',
      hidden: ({ parent }) => !parent?.url?.trim() && !parent?.youtubeUrl?.trim(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Used when no Vimeo or YouTube URL is set.',
      hidden: ({ parent }) => Boolean(parent?.url?.trim() || parent?.youtubeUrl?.trim()),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string'
        })
      ]
    }),
    defineField({
      name: 'footnote',
      title: 'Footnote',
      type: 'text',
      rows: 4
    })
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const media = value as { url?: string; youtubeUrl?: string; image?: unknown };
      const vimeo = media?.url?.trim() ?? '';
      const youtube = media?.youtubeUrl?.trim() ?? '';
      if (vimeo && youtube) {
        return 'Use either a Vimeo URL or a YouTube URL, not both';
      }
      if (vimeo || youtube || media?.image) {
        return true;
      }
      return 'Add a Vimeo URL, a YouTube URL, or an image';
    }),
  preview: {
    select: {
      url: 'url',
      youtubeUrl: 'youtubeUrl',
      footnote: 'footnote',
      image: 'image',
      poster: 'poster'
    },
    prepare({ url, youtubeUrl, footnote, image, poster }) {
      const vimeo = typeof url === 'string' ? url.trim() : '';
      const youtube = typeof youtubeUrl === 'string' ? youtubeUrl.trim() : '';
      const videoUrl = youtube || vimeo;
      return {
        title: videoUrl || (image ? 'Image' : 'Work media'),
        subtitle: typeof footnote === 'string' ? footnote : undefined,
        media: videoUrl ? poster || image : image
      };
    }
  }
});
