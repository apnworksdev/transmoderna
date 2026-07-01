import { destroyAboutTeam, initAboutTeam } from './about-team.ts';
import { destroyAboutClock, initAboutClock } from './about-clock.ts';
import { destroyExhibitionsView, initExhibitionsView } from './exhibitions-view.ts';
import { initAutoplayVideos } from './html-video-autoplay.ts';
import { initHomeIntro } from './home-intro.ts';
import { initLayout } from './layout.ts';
import { initPageTransitions, resetDocumentTransitionState } from './page-transitions.ts';
import { destroyPodcastsPlayer, initPodcastsPlayer } from './podcasts-player.ts';
import { destroyPortfolioSwiper, initPortfolioSwiper } from './portfolio-swiper.ts';
import { initPortfolioVideoPlayer } from './portfolio-video-player.ts';
import { destroyShopCart, initShopCart } from './shop-cart.ts';
import {
  destroyShopCardQuickBuy,
  destroyShopProduct,
  initShopCardQuickBuy,
  initShopProduct
} from './shop-product.ts';
import { destroyShopSearch, initShopSearch } from './shop-search.ts';
import { initWorkAccordion } from './work-accordion.ts';

let cleanupPortfolioSwiper: (() => void) | null = null;
let cleanupPortfolioVideoPlayer: (() => void) | null = null;
let cleanupPodcastsPlayer: (() => void) | null = null;
let cleanupShopCart: (() => void) | null = null;
let cleanupShopSearch: (() => void) | null = null;
let cleanupShopProduct: (() => void) | null = null;
let cleanupShopCardQuickBuy: (() => void) | null = null;

export function initApp(): void {
  initLayout();
  initExhibitionsView();
  initWorkAccordion();
  initAutoplayVideos();
  initHomeIntro();
  initAboutTeam();
  initAboutClock();

  cleanupShopCart?.();
  cleanupShopCart = initShopCart();

  cleanupShopSearch?.();
  cleanupShopSearch = initShopSearch();

  cleanupShopProduct?.();
  cleanupShopProduct = initShopProduct();

  cleanupShopCardQuickBuy?.();
  cleanupShopCardQuickBuy = initShopCardQuickBuy();

  cleanupPortfolioSwiper?.();
  cleanupPortfolioSwiper = initPortfolioSwiper();

  cleanupPortfolioVideoPlayer?.();
  cleanupPortfolioVideoPlayer = initPortfolioVideoPlayer();

  cleanupPodcastsPlayer?.();
  cleanupPodcastsPlayer = initPodcastsPlayer();
}

function destroyPortfolioModules(): void {
  cleanupPortfolioSwiper?.();
  cleanupPortfolioSwiper = null;

  cleanupPortfolioVideoPlayer?.();
  cleanupPortfolioVideoPlayer = null;

  destroyPortfolioSwiper();
}

function destroyPodcastsModules(): void {
  cleanupPodcastsPlayer?.();
  cleanupPodcastsPlayer = null;
  destroyPodcastsPlayer();
}

function destroyShopModules(): void {
  cleanupShopCart?.();
  cleanupShopCart = null;
  destroyShopCart();

  cleanupShopSearch?.();
  cleanupShopSearch = null;
  destroyShopSearch();

  cleanupShopProduct?.();
  cleanupShopProduct = null;
  destroyShopProduct();

  cleanupShopCardQuickBuy?.();
  cleanupShopCardQuickBuy = null;
  destroyShopCardQuickBuy();
}

initPageTransitions();
document.addEventListener('astro:before-preparation', () => {
  destroyExhibitionsView();
  destroyPortfolioModules();
  destroyPodcastsModules();
  destroyAboutClock();
  destroyAboutTeam();
  destroyShopModules();
});
document.addEventListener('astro:page-load', initApp);

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) {
    return;
  }

  resetDocumentTransitionState();
  initApp();
});
