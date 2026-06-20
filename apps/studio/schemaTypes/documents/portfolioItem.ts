import { ImagesIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';
import { isVimeoUrl } from '../objects/vimeoVideo';

export const portfolioItemType = defineType({
  name: 'portfolioItem',
  title: 'Portfolio item',
  type: 'document',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      description: 'Optional category or descriptor shown on the carousel thumbnail (e.g. "AV SHOW").'
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.min(1900).max(2100)
    }),
    defineField({
      name: 'thumbnailImage',
      title: 'Thumbnail image',
      type: 'image',
      description: 'Shown on the portfolio listing carousel.',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
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
      description: 'Paste the Vimeo share link (Share → Copy link). Played on the portfolio single page.',
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (!value) {
            return 'Add a Vimeo URL';
          }
          return isVimeoUrl(value) ? true : 'Use a valid vimeo.com URL';
        })
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      initialValue: 0,
      description: 'Used when items are not listed on the portfolio page singleton.'
    })
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }]
    }
  ],
  preview: {
    select: { title: 'title', subtitle: 'subtitle', media: 'thumbnailImage' },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle,
        media
      };
    }
  }
});
