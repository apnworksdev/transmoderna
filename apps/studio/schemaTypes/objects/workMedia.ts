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
        'Optional. Paste the Vimeo share link (Share → Copy link). The site plays it in a normal HTML video player — not the Vimeo embed UI. If set, video is shown instead of the image.',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!value) {
            return true;
          }
          return isVimeoUrl(value) ? true : 'Use a valid vimeo.com URL';
        })
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Used when no Vimeo URL is set.',
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
      const media = value as { url?: string; image?: unknown };
      if (media?.url?.trim() || media?.image) {
        return true;
      }
      return 'Add a Vimeo URL or an image';
    }),
  preview: {
    select: { url: 'url', footnote: 'footnote', media: 'image' },
    prepare({ url, footnote, media }) {
      return {
        title: typeof url === 'string' && url.trim() ? url : media ? 'Image' : 'Work media',
        subtitle: typeof footnote === 'string' ? footnote : undefined,
        media
      };
    }
  }
});
