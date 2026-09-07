import { defineMiddleware } from 'astro:middleware';
import { SITE_MENU_FALLBACK_LINKS } from '@repo/shared';

/** Shop-only launch: send Work / Exhibitions / Portfolio / Podcasts / About home. Remove this file when the rest of the site goes live. */
const SHOP_ONLY_REDIRECT_PREFIXES = SITE_MENU_FALLBACK_LINKS.map((link) => link.href);

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;
  const shouldRedirect = SHOP_ONLY_REDIRECT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (shouldRedirect) {
    return context.redirect('/');
  }

  return next();
});
