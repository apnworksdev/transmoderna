import { MenuIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const siteHeaderType = defineType({
  name: 'siteHeader',
  title: 'Header',
  type: 'document',
  icon: MenuIcon,
  fields: [
    defineField({
      name: 'logo',
      title: 'Header logo',
      type: 'image',
      description:
        'Center logo in the navigation bar. SVG, PNG, or JPG — SVG is served as-is without resizing.',
      options: { accept: 'image/*' },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })]
    }),
    defineField({
      name: 'menuLinks',
      title: 'Menu links',
      type: 'array',
      description: 'Up to five links shown in the full-screen menu, each with a thumbnail.',
      of: [{ type: 'siteMenuLink' }],
      validation: (Rule) => Rule.min(1).max(5)
    })
  ],
  preview: {
    prepare() {
      return { title: 'Header' };
    }
  }
});
