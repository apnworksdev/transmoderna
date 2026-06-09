import { HomeIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const homeType = defineType({
  name: 'home',
  title: 'Home',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'introText',
      title: 'Intro text',
      type: 'text',
      rows: 4,
      description:
        'Shown centered on the full-screen video with a typewriter effect after playback starts.'
    }),
    defineField({
      name: 'logo',
      title: 'Footer logo',
      type: 'image',
      description: 'Logo shown at the bottom after the intro sequence.',
      validation: (Rule) => Rule.required(),
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })]
    })
  ],
  preview: {
    prepare() {
      return { title: 'Home' };
    }
  }
});
