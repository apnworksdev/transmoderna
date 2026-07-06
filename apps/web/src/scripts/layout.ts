const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MENU_TRANSITION_MS = 600;

function clearBodyScrollLockStyles(): void {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
}

export function initLayout(): (() => void) | null {
  const toggle = document.querySelector<HTMLButtonElement>('[data-site-menu-toggle]');
  const label = document.querySelector<HTMLElement>('[data-site-menu-toggle-label]');
  const container = document.querySelector<HTMLElement>('[data-site-menu-container]');
  const menu = document.querySelector<HTMLElement>('[data-site-menu]');

  if (!toggle || !label || !container || !menu) {
    return null;
  }

  if (toggle.getAttribute('aria-expanded') !== 'true') {
    document.documentElement.classList.remove('site-menu-open');
    document.body.classList.remove('site-menu-open');
    clearBodyScrollLockStyles();
  }

  let trapHandler: ((event: KeyboardEvent) => void) | null = null;
  let closeTimeout: number | null = null;
  let scrollLockY = 0;
  let isScrollLocked = false;
  let touchMoveHandler: ((event: TouchEvent) => void) | null = null;
  let wheelHandler: ((event: WheelEvent) => void) | null = null;

  const getFocusables = () =>
    Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('hidden') && el.offsetParent !== null
    );

  const lockScroll = () => {
    scrollLockY = window.scrollY;
    isScrollLocked = true;
    document.documentElement.classList.add('site-menu-open');
    document.body.classList.add('site-menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    touchMoveHandler = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && menu.contains(target)) {
        return;
      }
      event.preventDefault();
    };

    wheelHandler = (event: WheelEvent) => {
      const target = event.target;
      if (target instanceof Node && menu.contains(target)) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('wheel', wheelHandler, { passive: false });
  };

  const unlockScroll = () => {
    const wasLocked = isScrollLocked;
    isScrollLocked = false;

    document.documentElement.classList.remove('site-menu-open');
    document.body.classList.remove('site-menu-open');
    clearBodyScrollLockStyles();

    if (wasLocked) {
      window.scrollTo(0, scrollLockY);
    }

    if (touchMoveHandler) {
      document.removeEventListener('touchmove', touchMoveHandler);
      touchMoveHandler = null;
    }

    if (wheelHandler) {
      document.removeEventListener('wheel', wheelHandler);
      wheelHandler = null;
    }
  };

  const setOpen = (open: boolean) => {
    if (closeTimeout) {
      window.clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    label.textContent = open ? 'Close' : 'Menu';

    if (open) {
      lockScroll();
    } else {
      unlockScroll();
    }

    if (trapHandler) {
      container.removeEventListener('keydown', trapHandler);
      trapHandler = null;
    }

    if (open) {
      container.hidden = false;
      requestAnimationFrame(() => {
        container.classList.add('is-open');

        const focusables = getFocusables();
        const first = focusables[0];
        const last = focusables.at(-1);

        if (first) {
          first.focus();
        }

        if (first && last) {
          trapHandler = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') {
              return;
            }

            const items = getFocusables();
            const firstItem = items[0];
            const lastItem = items.at(-1);
            if (!firstItem || !lastItem) {
              return;
            }

            if (event.shiftKey && document.activeElement === firstItem) {
              event.preventDefault();
              lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
              event.preventDefault();
              firstItem.focus();
            }
          };

          container.addEventListener('keydown', trapHandler);
        }
      });
    } else {
      container.classList.remove('is-open');
      closeTimeout = window.setTimeout(() => {
        if (toggle.getAttribute('aria-expanded') !== 'true') {
          container.hidden = true;
        }
        closeTimeout = null;
      }, MENU_TRANSITION_MS);
      toggle.focus();
    }
  };

  const onToggleClick = () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  };

  const onEscapeKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
    }
  };

  const menuLinks = Array.from(menu.querySelectorAll('a'));
  const onMenuLinkClick = () => setOpen(false);

  toggle.addEventListener('click', onToggleClick);
  document.addEventListener('keydown', onEscapeKeydown);
  menuLinks.forEach((link) => link.addEventListener('click', onMenuLinkClick));

  return () => {
    if (closeTimeout) {
      window.clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    toggle.removeEventListener('click', onToggleClick);
    document.removeEventListener('keydown', onEscapeKeydown);
    menuLinks.forEach((link) => link.removeEventListener('click', onMenuLinkClick));

    if (trapHandler) {
      container.removeEventListener('keydown', trapHandler);
      trapHandler = null;
    }

    unlockScroll();
  };
}
