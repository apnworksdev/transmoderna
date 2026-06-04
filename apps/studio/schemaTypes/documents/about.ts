import { UsersIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const aboutType = defineType({
  name: 'about',
  title: 'About',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }]
    }),
    defineField({
      name: 'teamMembers',
      title: 'Team members',
      type: 'array',
      of: [{ type: 'teamMember' }]
    }),
    defineField({
      name: 'contact',
      title: 'Contact',
      type: 'contactSection'
    }),
    defineField({
      name: 'connect',
      title: 'Connect',
      type: 'connectSection'
    })
  ],
  preview: {
    prepare() {
      return { title: 'About' };
    }
  }
});
