type SwiperCleanup = () => void;

export type ExhibitionFullItem = {
  title: string;
  href: string | null;
  bgSrc?: string;
  bgAlt: string;
};

const WINDOW_RADIUS = 3;
const WHEEL_THRESHOLD = 60;
const WHEEL_DECAY_MS = 150;
const SLOT_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function throttleRAF(fn: () => void): () => void {
  let frame = 0;
  return () => {
    if (frame) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn();
    });
  };
}

export function initExhibitionsFullSwiper(root: ParentNode = document): SwiperCleanup | null {
  const fullView = root.querySelector<HTMLElement>('[data-exhibitions-full]');
  if (!fullView) {
    return null;
  }

  let items: ExhibitionFullItem[] = [];
  try {
    items = JSON.parse(fullView.dataset.exhibitionsItems ?? '[]') as ExhibitionFullItem[];
  } catch {
    items = [];
  }

  const scroller = fullView.querySelector<HTMLElement>('[data-exhibitions-full-scroller]');
  const liveRegion = fullView.querySelector<HTMLElement>('[data-exhibitions-live]');
  const slots = SLOT_OFFSETS.map((offset) =>
    fullView.querySelector<HTMLElement>(`[data-exhibitions-slot="${offset}"]`)
  ).filter((slot): slot is HTMLElement => Boolean(slot));

  const bgLayers = Array.from(
    fullView.querySelectorAll<HTMLImageElement>('[data-exhibitions-bg-layer]')
  );

  if (!scroller || items.length === 0 || slots.length !== SLOT_OFFSETS.length || bgLayers.length < 2) {
    return null;
  }

  const total = items.length;
  let activeIndex = 0;
  let activeLayerIndex = 0;
  let wheelAccumulator = 0;
  let wheelDecayTimer = 0;
  let touchStartY = 0;
  const preloaded = new Set<string>();

  const preload = (src: string | undefined) => {
    if (!src || preloaded.has(src)) {
      return;
    }
    const image = new Image();
    image.src = src;
    preloaded.add(src);
  };

  const preloadAround = (index: number) => {
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) {
      preload(items[wrapIndex(index + offset, total)]?.bgSrc);
    }
  };

  const setSlotContent = (slot: HTMLElement, item: ExhibitionFullItem, isActive: boolean) => {
    const link = slot.querySelector<HTMLAnchorElement>('.page-exhibitions-full-slide-link');
    const title = slot.querySelector<HTMLElement>('.page-exhibitions-full-slide-title');

    slot.classList.toggle('is-active', isActive);

    if (title) {
      title.textContent = item.title;
    }

    if (link) {
      if (item.href) {
        link.href = item.href;
        link.hidden = false;
      } else {
        link.removeAttribute('href');
        link.hidden = true;
      }
    }
  };

  const fillSlots = () => {
    SLOT_OFFSETS.forEach((offset, slotIndex) => {
      const slot = slots[slotIndex];
      const item = items[wrapIndex(activeIndex + offset, total)];
      if (slot && item) {
        setSlotContent(slot, item, offset === 0);
      }
    });

    fullView.dataset.exhibitionsActiveIndex = String(activeIndex);

    if (liveRegion) {
      liveRegion.textContent = items[activeIndex]?.title ?? '';
    }
  };

  const setBackground = (index: number) => {
    const item = items[index];
    const src = item?.bgSrc;
    if (!src) {
      return;
    }

    const nextLayerIndex = activeLayerIndex === 0 ? 1 : 0;
    const activeLayer = bgLayers[activeLayerIndex];
    const nextLayer = bgLayers[nextLayerIndex];

    if (!activeLayer || !nextLayer) {
      return;
    }

    preloadAround(index);

    nextLayer.src = src;
    nextLayer.alt = item.bgAlt;
    nextLayer.classList.add('is-active');
    activeLayer.classList.remove('is-active');
    activeLayerIndex = nextLayerIndex;
  };

  const goTo = (index: number) => {
    const nextIndex = wrapIndex(index, total);
    if (nextIndex === activeIndex) {
      return;
    }

    activeIndex = nextIndex;
    setBackground(activeIndex);
    fillSlots();
  };

  const resetWheelAccumulator = () => {
    window.clearTimeout(wheelDecayTimer);
    wheelDecayTimer = window.setTimeout(() => {
      wheelAccumulator = 0;
    }, WHEEL_DECAY_MS);
  };

  const onWheel = (event: WheelEvent) => {
    if (total < 2) {
      return;
    }

    event.preventDefault();
    wheelAccumulator += event.deltaY;
    resetWheelAccumulator();

    if (wheelAccumulator >= WHEEL_THRESHOLD) {
      goTo(activeIndex + 1);
      wheelAccumulator = 0;
      window.clearTimeout(wheelDecayTimer);
      return;
    }

    if (wheelAccumulator <= -WHEEL_THRESHOLD) {
      goTo(activeIndex - 1);
      wheelAccumulator = 0;
      window.clearTimeout(wheelDecayTimer);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    touchStartY = event.touches[0]?.clientY ?? 0;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (total < 2) {
      return;
    }

    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
    const deltaY = touchStartY - touchEndY;

    if (Math.abs(deltaY) < 40) {
      return;
    }

    if (deltaY > 0) {
      goTo(activeIndex + 1);
    } else {
      goTo(activeIndex - 1);
    }
  };

  const onResize = throttleRAF(() => {
    fillSlots();
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (total < 2) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  };

  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('touchstart', onTouchStart, { passive: true });
  scroller.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('resize', onResize);
  scroller.addEventListener('keydown', onKeyDown);

  const firstSrc = items[0]?.bgSrc;
  if (firstSrc && bgLayers[0]) {
    bgLayers[0].src = firstSrc;
    bgLayers[0].alt = items[0]?.bgAlt ?? '';
    bgLayers[0].classList.add('is-active');
    preloadAround(0);
  }

  fillSlots();

  return () => {
    scroller.removeEventListener('wheel', onWheel);
    scroller.removeEventListener('touchstart', onTouchStart);
    scroller.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', onResize);
    scroller.removeEventListener('keydown', onKeyDown);
    window.clearTimeout(wheelDecayTimer);
  };
}
