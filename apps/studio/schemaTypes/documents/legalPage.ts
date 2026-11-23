import { DocumentTextIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const legalPageType = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Page heading. The footer uses this unless that footer link has its own label.',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in the page address, for example /legal/privacy-policy.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          const slug =
            value && typeof value === 'object' && 'current' in value ? value.current : undefined;
          if (!slug || typeof slug !== 'string') return true;

          const id = context.document?._id?.replace(/^drafts\./, '');
          if (!id) return true;

          const client = context.getClient({ apiVersion: '2025-02-19' });
          const count = await client.fetch<number>(
            `count(*[_type == "legalPage" && slug.current == $slug && !(_id in [$id, $draftId])])`,
            { slug, id, draftId: `drafts.${id}` }
          );

          return count === 0 ? true : 'Another legal page already uses this slug';
        })
    }),
    defineField({
      name: 'body',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Subheading', value: 'h3' }
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' }
          ]
        }
      ]
    })
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current' },
    prepare({ title, slug }) {
      return {
        title: title || 'Untitled legal page',
        subtitle: slug ? `/${slug}` : 'Set a slug'
      };
    }
  }
});
