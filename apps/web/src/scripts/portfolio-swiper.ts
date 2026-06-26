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

const SLOT_TRANSFORMS: Record<number, string> = {
  [-5]: 'translate(calc(-50% - var(--portfolio-x-5)), -50%)',
  [-4]: 'translate(calc(-50% - var(--portfolio-x-4)), -50%)',
  [-3]: 'translate(calc(-50% - var(--portfolio-x-3)), -50%)',
  [-2]: 'translate(calc(-50% - var(--portfolio-x-2)), -50%)',
  [-1]: 'translate(calc(-50% - var(--portfolio-x-1)), -50%)',
  0: 'translate(-50%, -50%)',
  1: 'translate(calc(-50% + var(--portfolio-x-1)), -50%)',
  2: 'translate(calc(-50% + var(--portfolio-x-2)), -50%)',
  3: 'translate(calc(-50% + var(--portfolio-x-3)), -50%)',
  4: 'translate(calc(-50% + var(--portfolio-x-4)), -50%)',
  5: 'translate(calc(-50% + var(--portfolio-x-5)), -50%)'
};

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

function transformForSlotOffset(offset: number): string {
  if (offset <= -5) {
    return SLOT_TRANSFORMS[-5];
  }
  if (offset >= 5) {
    return SLOT_TRANSFORMS[5];
  }
  return SLOT_TRANSFORMS[offset] ?? SLOT_TRANSFORMS[0];
}

function dimForSlotOffset(offset: number): string {
  const distance = Math.min(Math.abs(offset), 4);
  if (distance === 0) {
    return 'var(--portfolio-dim-center)';
  }
  if (distance === 1) {
    return 'var(--portfolio-dim-1)';
  }
  if (distance === 2) {
    return 'var(--portfolio-dim-2)';
  }
  if (distance === 3) {
    return 'var(--portfolio-dim-3)';
  }
  return 'var(--portfolio-dim-4)';
}

function setRevealWidth(inner: HTMLElement | null, isCenter: boolean) {
  if (!inner) {
    return;
  }
  inner.style.width = isCenter ? 'var(--portfolio-center-w)' : 'var(--portfolio-pill-w)';
}

function setFigureDim(figure: HTMLElement | null, offset: number) {
  if (!figure) {
    return;
  }
  figure.style.setProperty('--portfolio-dim', dimForSlotOffset(offset));
}

export function resetPortfolioSwiperDom(root: ParentNode = document): void {
  const swiperRoot = root.querySelector<HTMLElement>('[data-portfolio-swiper]');
  if (!swiperRoot) {
    return;
  }

  swiperRoot.classList.remove(
    'is-entering-next',
    'is-entering-prev',
    'is-animating-next',
    'is-animating-prev',
    'is-jump-prep',
    'is-jumping',
    'is-resetting',
    'is-edge-reveal'
  );

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
  swiperRoot.classList.remove(
    'is-entering-next',
    'is-entering-prev',
    'is-animating-next',
    'is-animating-prev',
    'is-jump-prep',
    'is-jumping',
    'is-resetting',
    'is-edge-reveal'
  );

  swiperRoot.querySelectorAll<HTMLElement>('[data-portfolio-slot]').forEach((slot) => {
    if (slot.classList.contains('page-portfolio-slide--enter')) {
      slot.hidden = true;
      slot.setAttribute('aria-hidden', 'true');
    }
  });
}

function finishPortfolioReset(swiperRoot: HTMLElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      swiperRoot.classList.remove('is-resetting');
      swiperRoot.classList.add('is-edge-reveal');
      window.setTimeout(() => {
        swiperRoot.classList.remove('is-edge-reveal');
      }, 280);
    });
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

  const setSlotContent = (slot: HTMLElement, item: PortfolioCarouselItem, isActive: boolean) => {
    applyPortfolioSlotContent(slot, item, isActive);
  };

  const fillSlots = () => {
    SLOT_OFFSETS.forEach((offset, slotIndex) => {
      const slot = slots[slotIndex];
      const item = items[wrapIndex(activeIndex + offset, total)];
      if (slot && item) {
        setSlotContent(slot, item, offset === 0);
      }
    });

    swiperRoot.dataset.portfolioActiveIndex = String(activeIndex);
    setStoredPortfolioActiveIndex(activeIndex);

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

  const hideAllEnterSlots = () => {
    for (const slot of allEnterSlots) {
      hideEnterSlot(slot);
    }
  };

  const showEnterSlot = (slot: HTMLElement | null, item: PortfolioCarouselItem) => {
    if (!slot) {
      return;
    }
    setSlotContent(slot, item, false);
    slot.hidden = false;
    slot.setAttribute('aria-hidden', 'false');
  };

  const snapAfterAnimation = () => {
    hideAllEnterSlots();
    swiperRoot.classList.add('is-resetting');
    swiperRoot.classList.remove('is-animating-next', 'is-animating-prev');
    clearJumpStyles();
    fillSlots();
    finishPortfolioReset(swiperRoot);
  };

  const clearJumpStyles = () => {
    const animatedSlots = [...slots, ...allEnterSlots];

    for (const slot of animatedSlots) {
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
    }

    swiperRoot.classList.remove('is-jump-prep', 'is-jumping');
  };

  const applyJumpStylesToSlot = (
    slot: HTMLElement,
    endOffset: number,
    options: { isCenter?: boolean; zIndex?: string } = {}
  ) => {
    slot.style.transform = transformForSlotOffset(endOffset);
    slot.style.zIndex = options.zIndex ?? (endOffset === 0 ? '6' : '');
    slot.classList.toggle('is-jump-target', options.isCenter ?? endOffset === 0);
    const inner = slot.querySelector<HTMLElement>('.page-portfolio-slide-inner');
    const figure = slot.querySelector<HTMLElement>('.page-portfolio-slide-figure');
    setRevealWidth(inner, endOffset === 0);
    setFigureDim(figure, endOffset);
  };

  const applyJumpEndStyles = (steps: number, direction: 'next' | 'prev') => {
    const shift = direction === 'next' ? -steps : steps;

    for (const slot of slots) {
      const rawOffset = slot.dataset.portfolioSlot;
      if (!rawOffset) {
        continue;
      }

      const slotOffset = Number.parseInt(rawOffset, 10);
      if (!Number.isFinite(slotOffset)) {
        continue;
      }

      applyJumpStylesToSlot(slot, slotOffset + shift);
    }
  };

  const setupJumpEnterSlots = (steps: number, direction: 'next' | 'prev') => {
    hideAllEnterSlots();

    const newActiveIndex =
      direction === 'next'
        ? wrapIndex(activeIndex + steps, total)
        : wrapIndex(activeIndex - steps, total);

    const enterPool = direction === 'next' ? enterRightSlots : enterLeftSlots;

    for (let i = 0; i < steps; i += 1) {
      const slot = enterPool[i];
      if (!slot) {
        break;
      }

      const endOffset =
        direction === 'next' ? WINDOW_RADIUS - steps + 1 + i : -WINDOW_RADIUS + i;
      const startOffset = direction === 'next' ? endOffset + steps : endOffset - steps;
      const item = items[wrapIndex(newActiveIndex + endOffset, total)];

      if (!item) {
        continue;
      }

      preload(item.thumbSrc);
      showEnterSlot(slot, item);
      applyJumpStylesToSlot(slot, startOffset, { zIndex: '1' });
    }
  };

  const applyJumpEnterEndStyles = (steps: number, direction: 'next' | 'prev') => {
    const enterPool = direction === 'next' ? enterRightSlots : enterLeftSlots;

    for (let i = 0; i < steps; i += 1) {
      const slot = enterPool[i];
      if (!slot || slot.hidden) {
        continue;
      }

      const endOffset =
        direction === 'next' ? WINDOW_RADIUS - steps + 1 + i : -WINDOW_RADIUS + i;
      applyJumpStylesToSlot(slot, endOffset, { zIndex: '1' });
    }
  };

  const runDirectJumpAnimation = async (steps: number, direction: 'next' | 'prev') => {
    setupJumpEnterSlots(steps, direction);
    swiperRoot.classList.add('is-jump-prep');
    await nextFrame();
    swiperRoot.classList.remove('is-jump-prep');
    swiperRoot.classList.add('is-jumping');
    await nextFrame();
    applyJumpEndStyles(steps, direction);
    applyJumpEnterEndStyles(steps, direction);
    await waitTransition(track, {
      slideClass: 'page-portfolio-slide',
      figureClass: 'page-portfolio-slide-inner',
      propertyNames: ['transform', 'width'],
      timeoutMs: 700
    });
  };

  const runSlideAnimation = async (direction: 'next' | 'prev') => {
    const prepClass = direction === 'next' ? 'is-entering-next' : 'is-entering-prev';
    const animClass = direction === 'next' ? 'is-animating-next' : 'is-animating-prev';
    const enterSlot = direction === 'next' ? enterRightSlots[0] : enterLeftSlots[0];
    const incomingIndex =
      direction === 'next'
        ? wrapIndex(activeIndex + INCOMING_OFFSET, total)
        : wrapIndex(activeIndex - INCOMING_OFFSET, total);
    const incoming = items[incomingIndex];

    if (!incoming) {
      return;
    }

    hideAllEnterSlots();
    showEnterSlot(enterSlot, incoming);
    swiperRoot.classList.add(prepClass);
    await nextFrame();
    swiperRoot.classList.remove(prepClass);
    swiperRoot.classList.add(animClass);
    await waitTransition(track, {
      slideClass: 'page-portfolio-slide',
      figureClass: 'page-portfolio-slide-inner',
      propertyNames: ['transform', 'width'],
      timeoutMs: 700
    });
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

    if (steps === 1) {
      await runSlideAnimation(direction > 0 ? 'next' : 'prev');
    } else {
      await runDirectJumpAnimation(steps, direction > 0 ? 'next' : 'prev');
    }

    activeIndex = nextIndex;
    snapAfterAnimation();
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
    swiperRoot.classList.add('is-resetting');
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
    swiperRoot.classList.remove(
      'is-entering-next',
      'is-entering-prev',
      'is-animating-next',
      'is-animating-prev',
      'is-jump-prep',
      'is-jumping',
      'is-resetting',
      'is-edge-reveal'
    );
    clearJumpStyles();
    hideAllEnterSlots();
  };
}

export function destroyPortfolioSwiper(root: ParentNode = document): void {
  resetPortfolioSwiperDom(root);
}
