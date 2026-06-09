import { toHTML, type PortableTextComponents } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';

const components: PortableTextComponents = {};

export function portableTextToPlain(
  blocks: PortableTextBlock[] | null | undefined
): string {
  if (!blocks?.length) {
    return '';
  }

  return blocks
    .filter((block) => block?._type === 'block')
    .map((block) =>
      (block.children ?? [])
        .map((child) => (typeof child?.text === 'string' ? child.text : ''))
        .join('')
    )
    .join('\n\n')
    .trim();
}

export function normalizePlainText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return portableTextToPlain(value as PortableTextBlock[]);
  }

  return '';
}

export function portableTextToHtml(
  blocks: PortableTextBlock[] | null | undefined
): string {
  if (!blocks?.length) {
    return '';
  }
  return toHTML(blocks, { components });
}
