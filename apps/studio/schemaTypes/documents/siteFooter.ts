import { InsertBelowIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const siteFooterType = defineType({
  name: 'siteFooter',
  title: 'Footer',
  type: 'document',
  icon: InsertBelowIcon,
  fields: [
    defineField({
      name: 'links',
      title: 'Footer links',
      type: 'array',
      description:
        'Links shown in the site footer. Add a page on this site or an external URL, then drag to set the order.',
      of: [{ type: 'footerLink' }],
      options: { sortable: true }
    })
  ],
  preview: {
    prepare() {
      return { title: 'Footer' };
    }
  }
});
