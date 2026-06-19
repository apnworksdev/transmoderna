import {
  getStoredExhibitionsActiveIndex,
  setStoredExhibitionsActiveIndex
} from '../lib/exhibitions-view.ts';
import {
  createImagePreloader,
  createKeyNavigation,
  createSlideClickNavigation,
  createTouchNavigation,
  createWheelNavigation,
  throttleRAF,
  wrapIndex
} from './exhibitions-swiper-shared.ts';

type SwiperCleanup = () => void;

export type ExhibitionFullItem = {
  title: string;
  href: string | null;
  bgSrc?: string;
  bgAlt: string;
};

const WINDOW_RADIUS = 3;
const SLOT_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;

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
  let activeIndex = getStoredExhibitionsActiveIndex(total);
  let activeLayerIndex = 0;
  const preload = createImagePreloader();

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
        if (isActive) {
          link.href = item.href;
        } else {
          link.removeAttribute('href');
        }
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
    setStoredExhibitionsActiveIndex(activeIndex);

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

  const navigation = {
    total,
    getActiveIndex: () => activeIndex,
    goTo
  };

  const wheel = createWheelNavigation(navigation);
  const touch = createTouchNavigation(navigation);
  const keys = createKeyNavigation(navigation);
  const slideClick = createSlideClickNavigation({
    ...navigation,
    slotOffsetAttribute: 'data-exhibitions-slot',
    consumeSuppressedClick: touch.consumeSuppressedClick,
    getSlots: () => slots,
    nearestAxis: 'y'
  });

  const onResize = throttleRAF(() => {
    fillSlots();
  });

  scroller.addEventListener('wheel', wheel.onWheel, { passive: false });
  scroller.addEventListener('touchstart', touch.onTouchStart, { passive: true });
  scroller.addEventListener('touchend', touch.onTouchEnd, { passive: true });
  scroller.addEventListener('click', slideClick.onClick);
  window.addEventListener('resize', onResize);
  scroller.addEventListener('keydown', keys.onKeyDown);

  const initialItem = items[activeIndex];
  if (initialItem?.bgSrc && bgLayers[0]) {
    bgLayers[0].src = initialItem.bgSrc;
    bgLayers[0].alt = initialItem.bgAlt;
    bgLayers[0].classList.add('is-active');
    preloadAround(activeIndex);
  }

  fillSlots();

  return () => {
    scroller.removeEventListener('wheel', wheel.onWheel);
    scroller.removeEventListener('touchstart', touch.onTouchStart);
    scroller.removeEventListener('touchend', touch.onTouchEnd);
    scroller.removeEventListener('click', slideClick.onClick);
    window.removeEventListener('resize', onResize);
    scroller.removeEventListener('keydown', keys.onKeyDown);
    wheel.destroy();
  };
}
