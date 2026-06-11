import { PresentationIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const exhibitionType = defineType({
  name: 'exhibition',
  title: 'Exhibition',
  type: 'document',
  icon: PresentationIcon,
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
      name: 'thumbnailImage',
      title: 'Thumbnail image',
      type: 'image',
      description: 'Shown on the exhibitions listing page in thumbnail view.',
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
      name: 'fullImage',
      title: 'Full image',
      type: 'image',
      description: 'Shown on the exhibitions listing page in full image view.',
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
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' }
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string'
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      validation: (Rule) => Rule.integer().min(1900).max(2100)
    }),
    defineField({
      name: 'artists',
      title: 'Artists',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'artist' }] }]
    }),
    defineField({
      name: 'content',
      title: 'Page content',
      type: 'array',
      of: [{ type: 'exhibitionFullImageBlock' }, { type: 'exhibitionTwoColumnBlock' }],
      description: 'Blocks shown on the exhibition single page.'
    })
  ],
  orderings: [
    {
      title: 'Year, newest',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }]
    }
  ],
  preview: {
    select: { title: 'title', media: 'thumbnailImage', subtitle: 'location' }
  }
});
