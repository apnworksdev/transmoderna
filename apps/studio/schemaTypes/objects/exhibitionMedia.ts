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
      description: 'Paste the Vimeo share link (Share → Copy link).',
      hidden: ({ parent }) => parent?.kind !== 'video',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { kind?: string };
          if (parent?.kind !== 'video') {
            return true;
          }
          if (!value) {
            return 'Add a Vimeo URL';
          }
          return isVimeoUrl(value) ? true : 'Use a valid vimeo.com URL';
        })
    })
  ],
  preview: {
    select: { kind: 'kind', videoUrl: 'videoUrl', media: 'image' },
    prepare({ kind, videoUrl, media }) {
      return {
        title:
          kind === 'video'
            ? typeof videoUrl === 'string' && videoUrl.trim()
              ? videoUrl
              : 'Video'
            : 'Image',
        media
      };
    }
  }
});
