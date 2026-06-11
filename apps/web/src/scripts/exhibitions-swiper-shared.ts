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

export function waitTransition(element: HTMLElement, timeoutMs = 800): Promise<void> {
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
      if (!target.classList.contains('page-exhibitions-thumbnail-slide')) {
        return;
      }
      if (event.propertyName === 'transform') {
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

  const onTouchStart = (event: TouchEvent) => {
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

    if (deltaY > 0) {
      goTo(getActiveIndex() + 1);
    } else {
      goTo(getActiveIndex() - 1);
    }
  };

  return { onTouchStart, onTouchEnd };
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
