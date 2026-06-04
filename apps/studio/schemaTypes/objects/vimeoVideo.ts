import { defineField, defineType } from 'sanity';

function isVimeoUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'vimeo.com' || host.endsWith('.vimeo.com') || host === 'player.vimeo.com';
  } catch {
    return false;
  }
}

export const vimeoVideoType = defineType({
  name: 'vimeoVideo',
  title: 'Vimeo video',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Vimeo URL',
      type: 'url',
      validation: (Rule) =>
        Rule.required().custom((value) =>
          isVimeoUrl(value) ? true : 'Use a valid vimeo.com URL'
        )
    }),
    defineField({
      name: 'title',
      title: 'Video title',
      type: 'string'
    }),
    defineField({
      name: 'description',
      title: 'Video description',
      type: 'array',
      of: [{ type: 'block' }]
    })
  ]
});
