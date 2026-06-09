const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initLayout(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-site-menu-toggle]');
  const label = document.querySelector<HTMLElement>('[data-site-menu-toggle-label]');
  const container = document.querySelector<HTMLElement>('[data-site-menu-container]');
  const menu = document.querySelector<HTMLElement>('[data-site-menu]');

  if (!toggle || !label || !container || !menu) {
    return;
  }

  let trapHandler: ((event: KeyboardEvent) => void) | null = null;

  const getFocusables = () =>
    Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('hidden') && el.offsetParent !== null
    );

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Close' : 'Menu';
    container.hidden = !open;
    container.classList.toggle('is-open', open);
    document.body.classList.toggle('site-menu-open', open);

    if (trapHandler) {
      container.removeEventListener('keydown', trapHandler);
      trapHandler = null;
    }

    if (open) {
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
    } else {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
    }
  });
}
