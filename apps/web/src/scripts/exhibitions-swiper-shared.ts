export const SWIPER_WHEEL_THRESHOLD = 60;
export const SWIPER_WHEEL_DECAY_MS = 150;
export const SWIPER_TOUCH_THRESHOLD = 40;

export function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function getDirection(from: number, to: number, total: number): number {
  let diff = to - from;
  if (diff > total / 2) {
    diff -= total;
  }
  if (diff < -total / 2) {
    diff += total;
  }
  if (diff > 0) {
    return 1;
  }
  if (diff < 0) {
    return -1;
  }
  return 0;
}

export function throttleRAF(fn: () => void): () => void {
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

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function waitTransition(
  element: HTMLElement,
  options: {
    timeoutMs?: number;
    slideClass?: string;
    figureClass?: string;
    propertyNames?: string[];
  } = {}
): Promise<void> {
  const {
    timeoutMs = 800,
    slideClass = 'page-exhibitions-thumbnail-slide',
    figureClass,
    propertyNames = ['transform']
  } = options;

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      element.removeEventListener('transitionend', onEnd);
      resolve();
    };

    const onEnd = (event: TransitionEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const matchesSlide = target.classList.contains(slideClass);
      const matchesFigure = figureClass ? target.classList.contains(figureClass) : false;
      if (!matchesSlide && !matchesFigure) {
        return;
      }

      if (propertyNames.includes(event.propertyName)) {
        finish();
      }
    };

    element.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, timeoutMs);
  });
}

export function createImagePreloader() {
  const preloaded = new Set<string>();

  return (src: string | undefined) => {
    if (!src || preloaded.has(src)) {
      return;
    }
    const image = new Image();
    image.src = src;
    preloaded.add(src);
  };
}

type NavigationControllerOptions = {
  total: number;
  getActiveIndex: () => number;
  goTo: (index: number) => void;
  isBlocked?: () => boolean;
};

export function createWheelNavigation({
  total,
  getActiveIndex,
  goTo,
  isBlocked
}: NavigationControllerOptions) {
  let wheelAccumulator = 0;
  let wheelDecayTimer = 0;

  const resetWheelAccumulator = () => {
    window.clearTimeout(wheelDecayTimer);
    wheelDecayTimer = window.setTimeout(() => {
      wheelAccumulator = 0;
    }, SWIPER_WHEEL_DECAY_MS);
  };

  const onWheel = (event: WheelEvent) => {
    if (total < 2 || isBlocked?.()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const delta =
      Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) {
      return;
    }

    wheelAccumulator += delta;
    resetWheelAccumulator();

    if (wheelAccumulator >= SWIPER_WHEEL_THRESHOLD) {
      goTo(getActiveIndex() + 1);
      wheelAccumulator = 0;
      window.clearTimeout(wheelDecayTimer);
      return;
    }

    if (wheelAccumulator <= -SWIPER_WHEEL_THRESHOLD) {
      goTo(getActiveIndex() - 1);
      wheelAccumulator = 0;
      window.clearTimeout(wheelDecayTimer);
    }
  };

  const destroy = () => {
    window.clearTimeout(wheelDecayTimer);
  };

  return { onWheel, destroy };
}

export function createTouchNavigation({
  total,
  getActiveIndex,
  goTo,
  isBlocked
}: NavigationControllerOptions) {
  let touchStartX = 0;
  let touchStartY = 0;
  let suppressClick = false;

  const onTouchStart = (event: TouchEvent) => {
    suppressClick = false;
    if (isBlocked?.()) {
      return;
    }
    touchStartX = event.touches[0]?.clientX ?? 0;
    touchStartY = event.touches[0]?.clientY ?? 0;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (total < 2 || isBlocked?.()) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      if (Math.abs(deltaX) < SWIPER_TOUCH_THRESHOLD) {
        return;
      }
      suppressClick = true;
      if (deltaX > 0) {
        goTo(getActiveIndex() + 1);
      } else {
        goTo(getActiveIndex() - 1);
      }
      return;
    }

    if (Math.abs(deltaY) < SWIPER_TOUCH_THRESHOLD) {
      return;
    }

    suppressClick = true;
    if (deltaY > 0) {
      goTo(getActiveIndex() + 1);
    } else {
      goTo(getActiveIndex() - 1);
    }
  };

  const consumeSuppressedClick = () => {
    if (!suppressClick) {
      return false;
    }
    suppressClick = false;
    return true;
  };

  return { onTouchStart, onTouchEnd, consumeSuppressedClick };
}

type KeyNavigationOptions = NavigationControllerOptions & {
  nextKeys?: string[];
  prevKeys?: string[];
};

export function createKeyNavigation({
  total,
  getActiveIndex,
  goTo,
  isBlocked,
  nextKeys = ['ArrowRight', 'ArrowDown'],
  prevKeys = ['ArrowLeft', 'ArrowUp']
}: KeyNavigationOptions) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (total < 2 || isBlocked?.()) {
      return;
    }

    if (nextKeys.includes(event.key)) {
      event.preventDefault();
      goTo(getActiveIndex() + 1);
      return;
    }

    if (prevKeys.includes(event.key)) {
      event.preventDefault();
      goTo(getActiveIndex() - 1);
    }
  };

  return { onKeyDown };
}

type SlideClickNavigationOptions = NavigationControllerOptions & {
  slotOffsetAttribute: string;
  ignoredSlotOffsets?: string[];
  consumeSuppressedClick?: () => boolean;
  getSlots: () => HTMLElement[];
  nearestAxis: 'x' | 'y';
};

export function findNearestSlideByAxis(
  clientX: number,
  clientY: number,
  slots: HTMLElement[],
  axis: 'x' | 'y'
): HTMLElement | null {
  let nearest: HTMLElement | null = null;
  let nearestDistance = Infinity;

  for (const slot of slots) {
    if (slot.hidden) {
      continue;
    }

    const rect = slot.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }

    const center = axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const pointer = axis === 'x' ? clientX : clientY;
    const distance = Math.abs(pointer - center);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = slot;
    }
  }

  return nearest;
}

export function createSlideClickNavigation({
  total,
  slotOffsetAttribute,
  ignoredSlotOffsets = ['enter-right', 'enter-left'],
  getActiveIndex,
  goTo,
  isBlocked,
  consumeSuppressedClick,
  getSlots,
  nearestAxis
}: SlideClickNavigationOptions) {
  const onClick = (event: MouseEvent) => {
    if (consumeSuppressedClick?.()) {
      return;
    }

    if (total < 2 || isBlocked?.()) {
      return;
    }

    const slots = getSlots().filter((slot) => {
      const rawOffset = slot.getAttribute(slotOffsetAttribute);
      return rawOffset && !ignoredSlotOffsets.includes(rawOffset);
    });

    const nearest = findNearestSlideByAxis(event.clientX, event.clientY, slots, nearestAxis);
    if (!(nearest instanceof HTMLElement)) {
      return;
    }

    if (nearest.classList.contains('is-active')) {
      return;
    }

    const rawOffset = nearest.getAttribute(slotOffsetAttribute);
    if (!rawOffset) {
      return;
    }

    const offset = Number.parseInt(rawOffset, 10);
    if (!Number.isFinite(offset)) {
      return;
    }

    event.preventDefault();
    goTo(wrapIndex(getActiveIndex() + offset, total));
  };

  return { onClick };
}
