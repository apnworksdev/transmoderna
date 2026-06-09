export function initWorkAccordion(root: ParentNode = document): void {
  const lists = root.querySelectorAll<HTMLUListElement>('[data-work-accordion]');

  for (const list of lists) {
    const items = list.querySelectorAll<HTMLDetailsElement>('details');

    for (const item of items) {
      item.addEventListener('toggle', () => {
        if (!item.open) {
          return;
        }

        for (const other of items) {
          if (other !== item && other.open) {
            other.open = false;
          }
        }
      });
    }
  }
}
