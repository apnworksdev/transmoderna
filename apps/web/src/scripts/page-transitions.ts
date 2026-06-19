function isInternalNavigationLink(link: HTMLAnchorElement, event: MouseEvent): boolean {
  if (link.target === '_blank' || link.hasAttribute('download') || link.hasAttribute('data-astro-reload')) {
    return false;
  }

  if (link.origin !== window.location.origin) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const url = new URL(link.href);
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash === window.location.hash
  ) {
    return false;
  }

  return true;
}

export function initPageTransitions(): void {
  const markNavigating = () => {
    document.documentElement.classList.add('is-page-navigating');
  };

  const unmarkNavigating = () => {
    document.documentElement.classList.remove('is-page-navigating');
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || !isInternalNavigationLink(link, event)) {
        return;
      }

      markNavigating();
    },
    true
  );

  document.addEventListener('astro:before-preparation', unmarkNavigating);
  document.addEventListener('astro:after-swap', unmarkNavigating);
  document.addEventListener('astro:page-load', unmarkNavigating);
}
