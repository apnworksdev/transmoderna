import {
  getStoredExhibitionsActiveIndex,
  setStoredExhibitionsActiveIndex
} from '../lib/exhibitions-view.ts';
import {
  createImagePreloader,
  prefersReducedMotion,
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

const BACKGROUND_SETTLE_MS = 500;
const SNAP_DELAY_MS = 100;
const WHEEL_GAIN = 0.22;
const MOMENTUM_FRICTION = 0.86;
const MOMENTUM_MIN = 0.25;
const TOUCH_VELOCITY_GAIN = 7;
const SNAP_TRANSITION_MS = 420;
const VISIBLE_RADIUS = 3;
const TOUCH_TAP_THRESHOLD = 8;

function opacityForDistance(distance: number): number {
  const maxDistance = VISIBLE_RADIUS + 0.5;

  if (distance >= maxDistance) {
    return 0;
  }

  if (distance < 0.45) {
    return 1;
  }
  if (distance < 1.15) {
    return 0.4;
  }
  if (distance < 2.15) {
    return 0.25;
  }
  if (distance < 3.15) {
    return 0.1;
  }

  const t = (distance - 3.15) / (maxDistance - 3.15);
  return Math.max(0, 0.1 * (1 - t));
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
  const track = fullView.querySelector<HTMLElement>('[data-exhibitions-full-track]');
  const liveRegion = fullView.querySelector<HTMLElement>('[data-exhibitions-live]');
  const slides = track
    ? Array.from(track.querySelectorAll<HTMLElement>('[data-exhibitions-loop-index]'))
    : [];

  const bgLayers = Array.from(
    fullView.querySelectorAll<HTMLImageElement>('[data-exhibitions-bg-layer]')
  );

  if (!scroller || !track || items.length === 0 || slides.length === 0 || bgLayers.length < 2) {
    return null;
  }

  const total = items.length;
  const loopCopies = slides.length / total;
  if (!Number.isInteger(loopCopies) || loopCopies < 1) {
    return null;
  }

  let itemHeight = 0;
  let activeLayerIndex = 0;
  let scrollY = 0;
  let velocity = 0;
  let momentumFrame = 0;
  let snapTimer = 0;
  let backgroundTimer = 0;
  let isTouching = false;
  let touchMoved = false;
  let touchStartY = 0;
  let touchStartScrollY = 0;
  let lastTouchY = 0;
  let lastTouchTime = 0;
  let touchVelocity = 0;
  let centeredIndex = getStoredExhibitionsActiveIndex(total);
  let layoutFrame = 0;
  const preload = createImagePreloader();
  const reducedMotion = prefersReducedMotion();

  const measure = () => {
    const first = slides[0];
    const second = slides[1];
    if (!first) {
      return;
    }

    if (second) {
      itemHeight = second.offsetTop - first.offsetTop;
    } else {
      itemHeight = first.offsetHeight;
    }

    if (itemHeight <= 0) {
      itemHeight = first.getBoundingClientRect().height || 88;
    }
  };

  const copyHeight = () => total * itemHeight;
  const middleCopyStart = () => copyHeight();
  const middleCopyEnd = () => copyHeight() * 2;

  const normalizeScroll = () => {
    const start = middleCopyStart();
    const end = middleCopyEnd();

    while (scrollY < start) {
      scrollY += copyHeight();
    }
    while (scrollY >= end) {
      scrollY -= copyHeight();
    }
  };

  const getItemIndex = () => wrapIndex(Math.round(scrollY / itemHeight), total);

  const scrollIndexToItemIndex = (scrollIndex: number) => wrapIndex(scrollIndex, total);

  const isScrollingFast = () =>
    momentumFrame !== 0 || Math.abs(velocity) > MOMENTUM_MIN || (isTouching && touchMoved);

  const syncMotionClass = () => {
    fullView.classList.toggle('is-scrolling', isScrollingFast());
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

    for (let offset = -3; offset <= 3; offset += 1) {
      preload(items[wrapIndex(index + offset, total)]?.bgSrc);
    }

    nextLayer.src = src;
    nextLayer.alt = item.bgAlt;
    nextLayer.classList.add('is-active');
    activeLayer.classList.remove('is-active');
    activeLayerIndex = nextLayerIndex;
  };

  const scheduleBackground = (index: number) => {
    window.clearTimeout(backgroundTimer);
    backgroundTimer = window.setTimeout(() => {
      if (centeredIndex === index && !isScrollingFast()) {
        setBackground(index);
      }
    }, BACKGROUND_SETTLE_MS);
  };

  const syncState = (index: number) => {
    if (centeredIndex === index) {
      return;
    }

    centeredIndex = index;
    fullView.dataset.exhibitionsActiveIndex = String(index);
    setStoredExhibitionsActiveIndex(index);

    if (liveRegion) {
      liveRegion.textContent = items[index]?.title ?? '';
    }

    scheduleBackground(index);
  };

  const applyTransform = (animate: boolean) => {
    if (itemHeight <= 0 || scroller.clientHeight <= 0) {
      return;
    }

    normalizeScroll();

    const viewportCenter = scroller.clientHeight / 2;
    const offset = scrollY - viewportCenter + itemHeight / 2;

    track.style.transition =
      animate && !reducedMotion ? `transform ${SNAP_TRANSITION_MS}ms var(--ease, ease)` : 'none';
    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
  };

  const updateSlides = () => {
    if (itemHeight <= 0) {
      return;
    }

    const centerIndex = scrollY / itemHeight;
    const scrolling = isScrollingFast();

    for (const slide of slides) {
      const loopIndex = Number(slide.dataset.exhibitionsLoopIndex);
      if (!Number.isFinite(loopIndex)) {
        continue;
      }

      const distance = Math.abs(loopIndex - centerIndex);
      const itemIndex = scrollIndexToItemIndex(loopIndex);
      const item = items[itemIndex];
      const isCentered = distance < 0.45;
      const isVisible = distance <= VISIBLE_RADIUS + 0.5;

      slide.classList.toggle('is-hidden', !isVisible);

      if (!isVisible) {
        slide.classList.remove('is-active');
        slide.style.opacity = '0';
        continue;
      }

      slide.style.opacity = String(opacityForDistance(distance));

      if (scrolling) {
        slide.classList.remove('is-active');
      } else {
        slide.classList.toggle('is-active', isCentered);
      }

      const link = slide.querySelector<HTMLAnchorElement>('.page-exhibitions-full-slide-link');
      if (link) {
        if (!scrolling && isCentered && item?.href) {
          link.href = item.href;
        } else {
          link.removeAttribute('href');
        }
      }
    }

    syncMotionClass();
    syncState(getItemIndex());
  };

  const render = (animate = false) => {
    applyTransform(animate);
    updateSlides();
  };

  const markReady = () => {
    document.documentElement.classList.remove('exhibitions-list-pending');
    fullView.classList.add('is-ready');
  };

  const layoutFromCenteredIndex = () => {
    const previousItemHeight = itemHeight;
    measure();

    if (itemHeight <= 0 || scroller.clientHeight <= 0) {
      return false;
    }

    if (previousItemHeight > 0 && previousItemHeight !== itemHeight && scrollY > 0) {
      scrollY = (scrollY / previousItemHeight) * itemHeight;
      normalizeScroll();
    } else if (scrollY <= 0) {
      scrollY = (middleCopyStart() + centeredIndex) * itemHeight;
    }

    render(false);
    markReady();
    return true;
  };

  const queueLayout = () => {
    if (layoutFrame) {
      cancelAnimationFrame(layoutFrame);
    }

    let attempts = 0;

    const tryLayout = () => {
      layoutFrame = 0;
      attempts += 1;

      if (layoutFromCenteredIndex()) {
        return;
      }

      if (attempts < 6) {
        layoutFrame = requestAnimationFrame(tryLayout);
        return;
      }

      measure();
      if (itemHeight > 0) {
        scrollY = (middleCopyStart() + centeredIndex) * itemHeight;
        render(false);
      }
      markReady();
    };

    layoutFrame = requestAnimationFrame(tryLayout);
  };

  const stopMomentum = () => {
    if (momentumFrame) {
      cancelAnimationFrame(momentumFrame);
      momentumFrame = 0;
    }
  };

  const finishSnap = () => {
    scrollY = Math.round(scrollY / itemHeight) * itemHeight;
    normalizeScroll();
    render(false);
  };

  const snapScroll = (animate: boolean) => {
    const previousScrollY = scrollY;
    normalizeScroll();

    const snapped = Math.round(scrollY / itemHeight) * itemHeight;
    scrollY = snapped;

    const preNormalizeScrollY = scrollY;
    normalizeScroll();
    const loopJumped =
      itemHeight > 0 && Math.abs(scrollY - preNormalizeScrollY) >= copyHeight() - 1;
    const shouldAnimate =
      animate &&
      !reducedMotion &&
      !loopJumped &&
      Math.abs(snapped - previousScrollY) >= 0.5;

    render(shouldAnimate);
  };

  const scheduleSnap = () => {
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      snapTimer = 0;

      if (isTouching || Math.abs(velocity) > MOMENTUM_MIN) {
        return;
      }

      snapScroll(true);
    }, SNAP_DELAY_MS);
  };

  const runMomentum = () => {
    stopMomentum();

    const step = () => {
      if (Math.abs(velocity) <= MOMENTUM_MIN) {
        velocity = 0;
        momentumFrame = 0;
        scheduleSnap();
        return;
      }

      scrollY += velocity;
      velocity *= MOMENTUM_FRICTION;
      render(false);
      momentumFrame = requestAnimationFrame(step);
    };

    momentumFrame = requestAnimationFrame(step);
  };

  const onWheel = (event: WheelEvent) => {
    if (total < 2) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    window.clearTimeout(snapTimer);
    snapTimer = 0;

    const delta =
      Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) {
      return;
    }

    if (reducedMotion) {
      scrollY += delta > 0 ? itemHeight : -itemHeight;
      finishSnap();
      scheduleBackground(getItemIndex());
      return;
    }

    velocity += delta * WHEEL_GAIN;
    stopMomentum();
    runMomentum();
  };

  const scrollToLoopIndex = (targetLoopIndex: number, animate = true) => {
    if (!Number.isFinite(targetLoopIndex)) {
      return;
    }

    stopMomentum();
    velocity = 0;
    window.clearTimeout(snapTimer);
    snapTimer = 0;
    scrollY = targetLoopIndex * itemHeight;
    render(animate && !reducedMotion);

    if (!animate || reducedMotion) {
      finishSnap();
    }
  };

  const scrollToItemIndex = (targetIndex: number, animate = true) => {
    const goal = wrapIndex(targetIndex, total);
    const currentLoop = scrollY / itemHeight;

    const candidates = [goal, goal + total, goal + total * 2];
    let targetLoopIndex = candidates[0];
    let nearestDistance = Infinity;

    for (const candidate of candidates) {
      const distance = Math.abs(candidate - currentLoop);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        targetLoopIndex = candidate;
      }
    }

    scrollToLoopIndex(targetLoopIndex, animate);
  };

  const onTouchStart = (event: TouchEvent) => {
    isTouching = true;
    touchMoved = false;
    stopMomentum();
    velocity = 0;
    window.clearTimeout(snapTimer);
    snapTimer = 0;
    touchStartY = event.touches[0]?.clientY ?? 0;
    lastTouchY = touchStartY;
    lastTouchTime = performance.now();
    touchStartScrollY = scrollY;
    touchVelocity = 0;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!isTouching) {
      return;
    }

    const touchY = event.touches[0]?.clientY ?? touchStartY;
    if (Math.abs(touchY - touchStartY) > TOUCH_TAP_THRESHOLD) {
      touchMoved = true;
    }

    if (!touchMoved) {
      return;
    }

    event.preventDefault();

    const now = performance.now();
    const elapsed = now - lastTouchTime;

    if (elapsed > 0) {
      touchVelocity = (lastTouchY - touchY) / elapsed;
    }

    lastTouchY = touchY;
    lastTouchTime = now;
    scrollY = touchStartScrollY + (touchStartY - touchY);
    render(false);
  };

  const onTouchEnd = () => {
    const wasDragging = touchMoved;
    isTouching = false;
    touchMoved = false;

    if (!wasDragging) {
      return;
    }

    if (reducedMotion) {
      finishSnap();
      scheduleBackground(getItemIndex());
      return;
    }

    velocity = touchVelocity * TOUCH_VELOCITY_GAIN;
    if (Math.abs(velocity) > MOMENTUM_MIN) {
      runMomentum();
      return;
    }

    scheduleSnap();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (total < 2) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      scrollToItemIndex(wrapIndex(centeredIndex + 1, total));
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollToItemIndex(wrapIndex(centeredIndex - 1, total));
    }
  };

  const onResize = throttleRAF(() => {
    layoutFromCenteredIndex();
  });

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== track || event.propertyName !== 'transform') {
      return;
    }
    track.style.transition = 'none';
    finishSnap();
  };

  const resizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          layoutFromCenteredIndex();
        })
      : null;

  resizeObserver?.observe(scroller);

  const onNavigateClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest<HTMLAnchorElement>('.page-exhibitions-full-slide-link[href]');
    if (!link) {
      return;
    }

    const slide = link.closest<HTMLElement>('.page-exhibitions-full-slide');
    if (!slide?.classList.contains('is-active')) {
      return;
    }

    fullView.classList.add('is-hiding');
  };

  setBackground(centeredIndex);
  queueLayout();

  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('click', onNavigateClick, true);
  scroller.addEventListener('touchstart', onTouchStart, { passive: true });
  scroller.addEventListener('touchmove', onTouchMove, { passive: false });
  scroller.addEventListener('touchend', onTouchEnd, { passive: true });
  scroller.addEventListener('keydown', onKeyDown);
  track.addEventListener('transitionend', onTransitionEnd);
  window.addEventListener('resize', onResize);

  return () => {
    scroller.removeEventListener('wheel', onWheel);
    scroller.removeEventListener('click', onNavigateClick, true);
    scroller.removeEventListener('touchstart', onTouchStart);
    scroller.removeEventListener('touchmove', onTouchMove);
    scroller.removeEventListener('touchend', onTouchEnd);
    scroller.removeEventListener('keydown', onKeyDown);
    track.removeEventListener('transitionend', onTransitionEnd);
    window.removeEventListener('resize', onResize);
    resizeObserver?.disconnect();
    if (layoutFrame) {
      cancelAnimationFrame(layoutFrame);
    }
    stopMomentum();
    window.clearTimeout(snapTimer);
    window.clearTimeout(backgroundTimer);
    fullView.classList.remove('is-ready', 'is-hiding', 'is-scrolling');
    document.documentElement.classList.add('exhibitions-list-pending');
    track.style.transition = '';
    track.style.transform = '';
    for (const slide of slides) {
      slide.style.removeProperty('opacity');
      slide.classList.remove('is-active', 'is-hidden');
    }
  };
}
