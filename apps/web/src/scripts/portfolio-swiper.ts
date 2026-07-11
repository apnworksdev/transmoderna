import {
  getStoredPortfolioActiveIndex,
  setStoredPortfolioActiveIndex
} from '../lib/portfolio-view.ts';
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

export type PortfolioCarouselItem = {
  title: string;
  subtitle?: string;
  year?: number;
  href: string | null;
  thumbSrc?: string;
  thumbAlt: string;
};

const WINDOW_RADIUS = 4;
const SLOT_OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const INCOMING_OFFSET = WINDOW_RADIUS + 1;

const ENTER_RIGHT_SLOTS = ['enter-right', 'enter-right-2', 'enter-right-3', 'enter-right-4'] as const;
const ENTER_LEFT_SLOTS = ['enter-left', 'enter-left-2', 'enter-left-3', 'enter-left-4'] as const;

const CHAINED_SLIDE_DURATION_MS = 560;
const SINGLE_SLIDE_TIMEOUT_MS = 900;
const CHAINED_SLIDE_TIMEOUT_MS = 760;

const ANIMATION_CLASSES = [
  'is-entering-next',
  'is-entering-prev',
  'is-animating-next',
  'is-animating-prev',
  'is-jump-prep',
  'is-jumping',
  'is-resetting',
  'is-final-snap'
] as const;

function formatCarouselLabel(item: PortfolioCarouselItem): string {
  const subtitle = item.subtitle?.trim();
  if (subtitle) {
    return `${item.title}, ${subtitle}`;
  }
  return item.title;
}

function applyPortfolioSlotContent(
  slot: HTMLElement,
  item: PortfolioCarouselItem,
  isActive: boolean
): void {
  const link = slot.querySelector<HTMLAnchorElement>('.page-portfolio-slide-link');
  const image = slot.querySelector<HTMLImageElement>('.page-portfolio-slide-image');
  const label = slot.querySelector<HTMLElement>('.page-portfolio-slide-label');
  const year = slot.querySelector<HTMLElement>('.page-portfolio-slide-year');

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

  if (label) {
    label.textContent = formatCarouselLabel(item);
  }

  if (year) {
    if (item.year != null) {
      year.textContent = String(item.year);
      year.hidden = false;
    } else {
      year.textContent = '';
      year.hidden = true;
    }
  }

  if (link) {
    if (item.href && isActive) {
      link.href = item.href;
      link.hidden = false;
    } else {
      link.removeAttribute('href');
      link.hidden = !item.href;
    }
  }
}

export function hydratePortfolioIndexCarousel(root: ParentNode = document): number | null {
  const swiperRoot = root.querySelector<HTMLElement>('[data-portfolio-swiper]');
  if (!swiperRoot) {
    return null;
  }

  let items: PortfolioCarouselItem[] = [];
  try {
    items = JSON.parse(swiperRoot.dataset.portfolioItems ?? '[]') as PortfolioCarouselItem[];
  } catch {
    return null;
  }

  const total = items.length;
  if (total === 0) {
    return null;
  }

  const activeIndex = getStoredPortfolioActiveIndex(total);

  for (const offset of SLOT_OFFSETS) {
    const slot = swiperRoot.querySelector<HTMLElement>(`[data-portfolio-slot="${offset}"]`);
    if (!slot) {
      return null;
    }

    const item = items[wrapIndex(activeIndex + offset, total)];
    if (item) {
      applyPortfolioSlotContent(slot, item, offset === 0);
    }
  }

  const liveRegion = swiperRoot.querySelector<HTMLElement>('[data-portfolio-live]');
  if (liveRegion) {
    liveRegion.textContent = items[activeIndex]?.title ?? '';
  }

  swiperRoot.dataset.portfolioActiveIndex = String(activeIndex);
  swiperRoot.dataset.portfolioHydrated = 'true';

  return activeIndex;
}

function countSteps(from: number, to: number, total: number): number {
  const direction = getDirection(from, to, total);
  if (direction === 0) {
    return 0;
  }

  let steps = 0;
  let cursor = from;

  while (cursor !== to) {
    cursor = wrapIndex(cursor + direction, total);
    steps += 1;
  }

  return steps;
}

function finishPortfolioReset(swiperRoot: HTMLElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      swiperRoot.classList.remove('is-resetting', 'is-final-snap');
    });
  });
}

export function resetPortfolioSwiperDom(root: ParentNode = document): void {
  const swiperRoot = root.querySelector<HTMLElement>('[data-portfolio-swiper]');
  if (!swiperRoot) {
    return;
  }

  swiperRoot.classList.remove(...ANIMATION_CLASSES);

  swiperRoot.querySelectorAll<HTMLElement>('[data-portfolio-slot]').forEach((slot) => {
    slot.style.transform = '';
    slot.style.zIndex = '';
    slot.classList.remove('is-jump-target');

    const inner = slot.querySelector<HTMLElement>('.page-portfolio-slide-inner');
    const figure = slot.querySelector<HTMLElement>('.page-portfolio-slide-figure');
    if (inner) {
      inner.style.width = '';
    }
    if (figure) {
      figure.style.opacity = '';
      figure.style.removeProperty('--portfolio-dim');
    }

    if (slot.classList.contains('page-portfolio-slide--enter')) {
      slot.hidden = true;
      slot.setAttribute('aria-hidden', 'true');
    }
  });
}

function clearPortfolioAnimationState(swiperRoot: HTMLElement): void {
  swiperRoot.classList.remove(...ANIMATION_CLASSES);

  swiperRoot.querySelectorAll<HTMLElement>('[data-portfolio-slot]').forEach((slot) => {
    if (slot.classList.contains('page-portfolio-slide--enter')) {
      slot.hidden = true;
      slot.setAttribute('aria-hidden', 'true');
    }
  });
}

export function initPortfolioSwiper(root: ParentNode = document): SwiperCleanup | null {
  const swiperRoot = root.querySelector<HTMLElement>('[data-portfolio-swiper]');
  if (!swiperRoot) {
    return null;
  }

  const alreadyHydrated = swiperRoot.dataset.portfolioHydrated === 'true';
  if (alreadyHydrated) {
    clearPortfolioAnimationState(swiperRoot);
  } else {
    resetPortfolioSwiperDom(root);
  }

  let items: PortfolioCarouselItem[] = [];
  try {
    items = JSON.parse(swiperRoot.dataset.portfolioItems ?? '[]') as PortfolioCarouselItem[];
  } catch {
    items = [];
  }

  const scroller = swiperRoot.querySelector<HTMLElement>('[data-portfolio-scroller]');
  const track = swiperRoot.querySelector<HTMLElement>('[data-portfolio-track]');
  const liveRegion = swiperRoot.querySelector<HTMLElement>('[data-portfolio-live]');
  const slots = SLOT_OFFSETS.map((offset) =>
    swiperRoot.querySelector<HTMLElement>(`[data-portfolio-slot="${offset}"]`)
  ).filter((slot): slot is HTMLElement => Boolean(slot));
  const enterRightSlots = ENTER_RIGHT_SLOTS.map((name) =>
    swiperRoot.querySelector<HTMLElement>(`[data-portfolio-slot="${name}"]`)
  ).filter((slot): slot is HTMLElement => Boolean(slot));
  const enterLeftSlots = ENTER_LEFT_SLOTS.map((name) =>
    swiperRoot.querySelector<HTMLElement>(`[data-portfolio-slot="${name}"]`)
  ).filter((slot): slot is HTMLElement => Boolean(slot));
  const allEnterSlots = [...enterRightSlots, ...enterLeftSlots];

  if (!scroller || !track || items.length === 0 || slots.length !== SLOT_OFFSETS.length) {
    return null;
  }

  const total = items.length;
  const storedIndex = Number.parseInt(swiperRoot.dataset.portfolioActiveIndex ?? '', 10);
  let activeIndex = Number.isFinite(storedIndex)
    ? wrapIndex(storedIndex, total)
    : getStoredPortfolioActiveIndex(total);
  let isAnimating = false;
  const preload = createImagePreloader();

  const preloadAround = (index: number) => {
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) {
      preload(items[wrapIndex(index + offset, total)]?.thumbSrc);
    }
    for (let offset = -INCOMING_OFFSET; offset <= INCOMING_OFFSET; offset += 1) {
      preload(items[wrapIndex(index + offset, total)]?.thumbSrc);
    }
  };

  const fillSlots = () => {
    SLOT_OFFSETS.forEach((offset, slotIndex) => {
      const slot = slots[slotIndex];
      const item = items[wrapIndex(activeIndex + offset, total)];
      if (slot && item) {
        applyPortfolioSlotContent(slot, item, offset === 0);
      }
    });

    swiperRoot.dataset.portfolioActiveIndex = String(activeIndex);
    setStoredPortfolioActiveIndex(activeIndex);

    if (liveRegion) {
      liveRegion.textContent = items[activeIndex]?.title ?? '';
    }
  };

  const hideAllEnterSlots = () => {
    for (const slot of allEnterSlots) {
      slot.hidden = true;
      slot.setAttribute('aria-hidden', 'true');
    }
  };

  const snapAfterAnimation = () => {
    swiperRoot.classList.add('is-resetting');
    fillSlots();
    swiperRoot.classList.remove('is-animating-next', 'is-animating-prev', 'is-jump-prep', 'is-jumping');
    hideAllEnterSlots();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        swiperRoot.classList.remove('is-resetting', 'is-final-snap');
      });
    });
  };

  const runSlideAnimation = async (direction: 'next' | 'prev', timeoutMs: number) => {
    const prepClass = direction === 'next' ? 'is-entering-next' : 'is-entering-prev';
    const animClass = direction === 'next' ? 'is-animating-next' : 'is-animating-prev';
    const enterSlot = direction === 'next' ? enterRightSlots[0] : enterLeftSlots[0];
    const incomingIndex =
      direction === 'next'
        ? wrapIndex(activeIndex + INCOMING_OFFSET, total)
        : wrapIndex(activeIndex - INCOMING_OFFSET, total);
    const incoming = items[incomingIndex];

    if (!incoming || !enterSlot) {
      return;
    }

    hideAllEnterSlots();
    applyPortfolioSlotContent(enterSlot, incoming, false);
    enterSlot.hidden = false;
    enterSlot.setAttribute('aria-hidden', 'false');

    swiperRoot.classList.add(prepClass);
    await nextFrame();
    swiperRoot.classList.remove(prepClass);
    swiperRoot.classList.add(animClass);
    await Promise.all([
      waitTransition(track, {
        slideClass: 'page-portfolio-slide',
        figureClass: 'page-portfolio-slide-inner',
        propertyNames: ['transform', 'width'],
        timeoutMs
      }),
      waitTransition(enterSlot, {
        slideClass: 'page-portfolio-slide',
        propertyNames: ['transform', 'opacity'],
        timeoutMs
      })
    ]);
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

    const direction = getDirection(activeIndex, nextIndex, total);
    if (direction === 0) {
      isAnimating = false;
      return;
    }

    const steps = countSteps(activeIndex, nextIndex, total);
    const slideDirection = direction > 0 ? 'next' : 'prev';
    const chained = steps > 1;

    if (chained) {
      swiperRoot.style.setProperty('--portfolio-slide-duration', `${CHAINED_SLIDE_DURATION_MS}ms`);
    }

    try {
      for (let step = 0; step < steps; step += 1) {
        await runSlideAnimation(
          slideDirection,
          chained ? CHAINED_SLIDE_TIMEOUT_MS : SINGLE_SLIDE_TIMEOUT_MS
        );
        activeIndex = wrapIndex(activeIndex + direction, total);
        snapAfterAnimation();
      }
    } finally {
      swiperRoot.style.removeProperty('--portfolio-slide-duration');
      isAnimating = false;
    }
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
    slotOffsetAttribute: 'data-portfolio-slot',
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

  if (!alreadyHydrated) {
    swiperRoot.classList.add('is-resetting', 'is-final-snap');
    fillSlots();
    swiperRoot.dataset.portfolioHydrated = 'true';
    finishPortfolioReset(swiperRoot);
  }

  return () => {
    scroller.removeEventListener('wheel', wheel.onWheel);
    scroller.removeEventListener('touchstart', touch.onTouchStart);
    scroller.removeEventListener('touchend', touch.onTouchEnd);
    scroller.removeEventListener('click', slideClick.onClick);
    window.removeEventListener('resize', onResize);
    scroller.removeEventListener('keydown', keys.onKeyDown);
    wheel.destroy();
    swiperRoot.classList.remove(...ANIMATION_CLASSES);
    swiperRoot.style.removeProperty('--portfolio-slide-duration');
    hideAllEnterSlots();
  };
}

export function destroyPortfolioSwiper(root: ParentNode = document): void {
  resetPortfolioSwiperDom(root);
}
