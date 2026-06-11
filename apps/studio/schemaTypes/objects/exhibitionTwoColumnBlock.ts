import { defineField, defineType } from 'sanity';

function columnIsEmpty(column: { contentType?: string } | undefined): boolean {
  return !column?.contentType || column.contentType === 'empty';
}

export const exhibitionTwoColumnBlockType = defineType({
  name: 'exhibitionTwoColumnBlock',
  title: 'Two column',
  type: 'object',
  fields: [
    defineField({
      name: 'left',
      title: 'Left column',
      type: 'exhibitionColumn'
    }),
    defineField({
      name: 'right',
      title: 'Right column',
      type: 'exhibitionColumn'
    })
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const block = value as {
        left?: { contentType?: string };
        right?: { contentType?: string };
      };
      if (columnIsEmpty(block?.left) && columnIsEmpty(block?.right)) {
        return 'At least one column must have content';
      }
      return true;
    }),
  preview: {
    select: { left: 'left.contentType', right: 'right.contentType' },
    prepare({ left, right }) {
      return {
        title: 'Two column',
        subtitle: `Left: ${left ?? 'empty'} · Right: ${right ?? 'empty'}`
      };
    }
  }
});
