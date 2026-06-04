import { toHTML, type PortableTextComponents } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';

const components: PortableTextComponents = {};

export function portableTextToHtml(
  blocks: PortableTextBlock[] | null | undefined
): string {
  if (!blocks?.length) {
    return '';
  }
  return toHTML(blocks, { components });
}
