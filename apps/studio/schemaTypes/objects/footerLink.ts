import { LinkIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

const PAGE_NAMES: Record<string, string> = {
  home: 'Home',
  shop: 'Shop',
  workPage: 'Work',
  exhibitionsPage: 'Exhibitions',
  portfolioPage: 'Portfolio',
  podcastPage: 'Podcasts',
  about: 'About',
  legalPage: 'Legal page',
  exhibition: 'Exhibition',
  portfolioItem: 'Portfolio',
  podcast: 'Podcast',
  product: 'Product'
};

type FooterLinkParent = {
  linkType?: 'internal' | 'external';
};

function parentLinkType(context: { parent?: unknown }): FooterLinkParent['linkType'] {
  const parent = context.parent as FooterLinkParent | undefined;
  return parent?.linkType;
}

export const footerLinkType = defineType({
  name: 'footerLink',
  title: 'Footer link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'linkType',
      title: 'Link type',
      type: 'string',
      initialValue: 'internal',
      options: {
        layout: 'radio',
        list: [
          { title: 'Page on this site', value: 'internal' },
          { title: 'External link', value: 'external' }
        ]
      },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'page',
      title: 'Page',
      type: 'reference',
      description:
        'Home, Shop, Work, Exhibitions, Portfolio, Podcasts, About, a legal page, or a single exhibition, portfolio item, podcast, or product.',
      hidden: ({ parent }) => (parent as FooterLinkParent | undefined)?.linkType === 'external',
      to: [
        { type: 'home' },
        { type: 'shop' },
        { type: 'workPage' },
        { type: 'exhibitionsPage' },
        { type: 'portfolioPage' },
        { type: 'podcastPage' },
        { type: 'about' },
        { type: 'legalPage' },
        { type: 'exhibition' },
        { type: 'portfolioItem' },
        { type: 'podcast' },
        { type: 'product' }
      ],
      options: {
        disableNew: true,
        filter:
          '_type != "product" || (store.isDeleted != true && (!defined(store.status) || store.status == "active"))'
      },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (parentLinkType(context) !== 'internal') return true;
          return value ? true : 'Choose a page';
        })
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Web address, for example https://instagram.com/transmoderna.',
      hidden: ({ parent }) => (parent as FooterLinkParent | undefined)?.linkType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (parentLinkType(context) !== 'external') return true;
          if (typeof value !== 'string' || !value.trim()) return 'Add a URL';
          try {
            const url = new URL(value);
            if (url.protocol === 'http:' || url.protocol === 'https:') return true;
          } catch {
            return 'Use a full web address, starting with http:// or https://';
          }
          return 'Use a full web address, starting with http:// or https://';
        })
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description:
        'Text shown in the footer. For a site page, leave this empty to use the page name.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (parentLinkType(context) !== 'external') return true;
          return typeof value === 'string' && value.trim() ? true : 'Add the footer label';
        })
    })
  ],
  preview: {
    select: {
      label: 'label',
      linkType: 'linkType',
      url: 'url',
      pageTitle: 'page.title',
      productTitle: 'page.store.title',
      pageType: 'page._type'
    },
    prepare({ label, linkType, url, pageTitle, productTitle, pageType }) {
      const customLabel = typeof label === 'string' ? label.trim() : '';
      const pageName =
        customLabel || pageTitle || productTitle || PAGE_NAMES[pageType] || 'Untitled link';

      if (linkType === 'external') {
        return {
          title: customLabel || 'External link',
          subtitle: url || 'Add a URL'
        };
      }

      return {
        title: pageName,
        subtitle: PAGE_NAMES[pageType] || 'Page on this site'
      };
    }
  }
});
