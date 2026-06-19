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
  getDirection,
  nextFrame,
  prefersReducedMotion,
  throttleRAF,
  waitTransition,
  wrapIndex
} from './exhibitions-swiper-shared.ts';

type SwiperCleanup = () => void;

export type ExhibitionThumbnailItem = {
  title: string;
  href: string | null;
  thumbSrc?: string;
  thumbAlt: string;
};

const WINDOW_RADIUS = 2;
const SLOT_OFFSETS = [-2, -1, 0, 1, 2] as const;

export function initExhibitionsThumbnailSwiper(root: ParentNode = document): SwiperCleanup | null {
  const thumbnailView = root.querySelector<HTMLElement>('[data-exhibitions-thumbnail]');
  if (!thumbnailView) {
    return null;
  }

  let items: ExhibitionThumbnailItem[] = [];
  try {
    items = JSON.parse(thumbnailView.dataset.exhibitionsItems ?? '[]') as ExhibitionThumbnailItem[];
  } catch {
    items = [];
  }

  const scroller = thumbnailView.querySelector<HTMLElement>('[data-exhibitions-thumbnail-scroller]');
  const track = thumbnailView.querySelector<HTMLElement>('[data-exhibitions-thumbnail-track]');
  const liveRegion = thumbnailView.querySelector<HTMLElement>('[data-exhibitions-thumb-live]');
  const slots = SLOT_OFFSETS.map((offset) =>
    thumbnailView.querySelector<HTMLElement>(`[data-exhibitions-thumb-slot="${offset}"]`)
  ).filter((slot): slot is HTMLElement => Boolean(slot));
  const enterRight = thumbnailView.querySelector<HTMLElement>(
    '[data-exhibitions-thumb-slot="enter-right"]'
  );
  const enterLeft = thumbnailView.querySelector<HTMLElement>(
    '[data-exhibitions-thumb-slot="enter-left"]'
  );

  if (!scroller || !track || items.length === 0 || slots.length !== SLOT_OFFSETS.length) {
    return null;
  }

  const total = items.length;
  let activeIndex = getStoredExhibitionsActiveIndex(total);
  let isAnimating = false;
  const preload = createImagePreloader();

  const preloadAround = (index: number) => {
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) {
      preload(items[wrapIndex(index + offset, total)]?.thumbSrc);
    }
    preload(items[wrapIndex(index - 3, total)]?.thumbSrc);
    preload(items[wrapIndex(index + 3, total)]?.thumbSrc);
  };

  const setSlotContent = (slot: HTMLElement, item: ExhibitionThumbnailItem, isActive: boolean) => {
    const link = slot.querySelector<HTMLAnchorElement>('.page-exhibitions-thumbnail-slide-link');
    const image = slot.querySelector<HTMLImageElement>('.page-exhibitions-thumbnail-slide-image');
    const title = slot.querySelector<HTMLElement>('.page-exhibitions-thumbnail-slide-title');

    slot.classList.toggle('is-active', isActive);

    if (image) {
      if (item.thumbSrc) {
        image.src = item.thumbSrc;
        image.alt = item.thumbAlt;
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.hidden = true;
      }
    }

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

    thumbnailView.dataset.exhibitionsActiveIndex = String(activeIndex);
    setStoredExhibitionsActiveIndex(activeIndex);

    if (liveRegion) {
      liveRegion.textContent = items[activeIndex]?.title ?? '';
    }
  };

  const hideEnterSlot = (slot: HTMLElement | null) => {
    if (!slot) {
      return;
    }
    slot.hidden = true;
    slot.setAttribute('aria-hidden', 'true');
  };

  const showEnterSlot = (slot: HTMLElement | null, item: ExhibitionThumbnailItem) => {
    if (!slot) {
      return;
    }
    setSlotContent(slot, item, false);
    slot.hidden = false;
    slot.setAttribute('aria-hidden', 'false');
  };

  const snapAfterAnimation = () => {
    hideEnterSlot(enterRight);
    hideEnterSlot(enterLeft);
    thumbnailView.classList.add('is-resetting');
    fillSlots();
    requestAnimationFrame(() => {
      thumbnailView.classList.remove('is-resetting');
    });
  };

  const runSlideAnimation = async (direction: 'next' | 'prev') => {
    const prepClass = direction === 'next' ? 'is-entering-next' : 'is-entering-prev';
    const animClass = direction === 'next' ? 'is-animating-next' : 'is-animating-prev';
    const enterSlot = direction === 'next' ? enterRight : enterLeft;
    const incomingIndex =
      direction === 'next'
        ? wrapIndex(activeIndex + 3, total)
        : wrapIndex(activeIndex - 3, total);
    const incoming = items[incomingIndex];

    if (!incoming) {
      return;
    }

    showEnterSlot(enterSlot, incoming);
    thumbnailView.classList.add(prepClass);
    await nextFrame();
    thumbnailView.classList.remove(prepClass);
    thumbnailView.classList.add(animClass);
    await waitTransition(track);
    thumbnailView.classList.remove(animClass);
  };

  const goToInstant = (index: number) => {
    const nextIndex = wrapIndex(index, total);
    if (nextIndex === activeIndex) {
      return;
    }

    activeIndex = nextIndex;
    preloadAround(activeIndex);
    fillSlots();
  };

  const goToAnimated = async (index: number) => {
    const nextIndex = wrapIndex(index, total);
    if (nextIndex === activeIndex || isAnimating) {
      return;
    }

    isAnimating = true;
    preloadAround(nextIndex);

    while (activeIndex !== nextIndex) {
      const direction = getDirection(activeIndex, nextIndex, total);
      if (direction === 0) {
        break;
      }

      await runSlideAnimation(direction > 0 ? 'next' : 'prev');
      activeIndex = wrapIndex(activeIndex + direction, total);
      snapAfterAnimation();
    }

    isAnimating = false;
  };

  const goTo = (index: number) => {
    if (prefersReducedMotion()) {
      goToInstant(index);
      return;
    }
    void goToAnimated(index);
  };

  const navigation = {
    total,
    getActiveIndex: () => activeIndex,
    goTo,
    isBlocked: () => isAnimating
  };

  const wheel = createWheelNavigation(navigation);
  const touch = createTouchNavigation(navigation);
  const keys = createKeyNavigation(navigation);
  const slideClick = createSlideClickNavigation({
    ...navigation,
    slotOffsetAttribute: 'data-exhibitions-thumb-slot',
    consumeSuppressedClick: touch.consumeSuppressedClick,
    getSlots: () => slots,
    nearestAxis: 'x'
  });

  const onResize = throttleRAF(() => {
    if (!isAnimating) {
      fillSlots();
    }
  });

  scroller.addEventListener('wheel', wheel.onWheel, { passive: false });
  scroller.addEventListener('touchstart', touch.onTouchStart, { passive: true });
  scroller.addEventListener('touchend', touch.onTouchEnd, { passive: true });
  scroller.addEventListener('click', slideClick.onClick);
  window.addEventListener('resize', onResize);
  scroller.addEventListener('keydown', keys.onKeyDown);

  preloadAround(activeIndex);
  fillSlots();

  return () => {
    scroller.removeEventListener('wheel', wheel.onWheel);
    scroller.removeEventListener('touchstart', touch.onTouchStart);
    scroller.removeEventListener('touchend', touch.onTouchEnd);
    scroller.removeEventListener('click', slideClick.onClick);
    window.removeEventListener('resize', onResize);
    scroller.removeEventListener('keydown', keys.onKeyDown);
    wheel.destroy();
    thumbnailView.classList.remove(
      'is-entering-next',
      'is-entering-prev',
      'is-animating-next',
      'is-animating-prev',
      'is-resetting'
    );
    hideEnterSlot(enterRight);
    hideEnterSlot(enterLeft);
  };
}
