import { destroyExhibitionsView, initExhibitionsView } from './exhibitions-view.ts';
import { initAutoplayVideos } from './html-video-autoplay.ts';
import { initHomeIntro } from './home-intro.ts';
import { initLayout } from './layout.ts';
import { initPageTransitions } from './page-transitions.ts';
import { initShopCart } from './shop-cart.ts';
import { initWorkAccordion } from './work-accordion.ts';

export function initApp(): void {
  initLayout();
  initExhibitionsView();
  initWorkAccordion();
  initAutoplayVideos();
  initHomeIntro();
  initShopCart();
}

initPageTransitions();
document.addEventListener('astro:before-preparation', destroyExhibitionsView);
document.addEventListener('astro:page-load', initApp);
