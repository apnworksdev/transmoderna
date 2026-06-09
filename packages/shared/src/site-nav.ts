export type SiteNavLink = {
  label: string;
  href: string;
};

/** Default main nav when the Header singleton has no menu links yet. */
export const SITE_MENU_FALLBACK_LINKS: SiteNavLink[] = [
  { label: 'Work', href: '/work' },
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Podcasts', href: '/podcasts' },
  { label: 'About', href: '/about' }
];
