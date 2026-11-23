import { SITE_MENU_FALLBACK_LINKS } from '@repo/shared';
import { defineMiddleware } from 'astro:middleware';
import { isSiteMenuEnabled } from './lib/sanity';

/** Work, Exhibitions, Portfolio, Podcasts, and About stay unreachable until “Show menu pages” is on. */
const HIDDEN_MENU_PREFIXES = SITE_MENU_FALLBACK_LINKS.map((link) => link.href);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isHiddenSection = HIDDEN_MENU_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isHiddenSection || (await isSiteMenuEnabled())) {
    return next();
  }

  return context.redirect('/');
});
