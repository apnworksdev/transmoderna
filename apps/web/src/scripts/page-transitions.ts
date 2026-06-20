type TransitionBeforePreparationEvent = Event & {
  from: URL;
  to: URL;
  newDocument: Document;
  loader: () => Promise<void>;
};

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

function isPortfolioIndexReturn(from: URL, to: URL): boolean {
  return to.pathname === '/portfolio' && from.pathname.startsWith('/portfolio/') && from.pathname !== '/portfolio';
}

export function resetDocumentTransitionState(): void {
  document.documentElement.classList.remove('is-page-navigating');
  document.body.style.removeProperty('opacity');
  document.body.style.removeProperty('cursor');
  document.documentElement.style.removeProperty('cursor');
}

async function fetchFreshDocument(url: URL): Promise<Document> {
  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(`Failed to load ${url.href}`);
  }

  const html = await response.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

export function initPageTransitions(): void {
  const markNavigating = () => {
    document.documentElement.classList.add('is-page-navigating');
  };

  const unmarkNavigating = () => {
    resetDocumentTransitionState();
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

  document.addEventListener('astro:before-preparation', (event) => {
    unmarkNavigating();

    const transitionEvent = event as TransitionBeforePreparationEvent;
    if (!isPortfolioIndexReturn(transitionEvent.from, transitionEvent.to)) {
      return;
    }

    transitionEvent.loader = async () => {
      transitionEvent.newDocument = await fetchFreshDocument(transitionEvent.to);
    };
  });

  document.addEventListener('astro:after-swap', unmarkNavigating);
  document.addEventListener('astro:page-load', unmarkNavigating);
}
