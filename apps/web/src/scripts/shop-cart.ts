import { CART_LINES_FIRST } from '../lib/shopify-storefront';
import { formatPrice, parsePriceAmount } from '../lib/shop-format';
import {
  getSelectedQuantity,
  getSelectedVariantId,
  refreshProductBuyUI,
  resolveBuyRoot
} from './shop-product';

const API_VERSION = '2024-01';
const CART_KEY = 'transmoderna_shopify_cart_id';

type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price?: { amount: string; currencyCode: string };
    selectedOptions?: Array<{ name: string; value: string }>;
    image?: { url?: string } | null;
    product?: { title?: string; handle?: string };
  };
};

type CartData = {
  id: string;
  checkoutUrl?: string;
  totalQuantity?: number;
  cost?: {
    subtotalAmount?: { amount: string; currencyCode: string };
  };
  lines?: {
    edges?: Array<{ node?: CartLine }>;
  };
};

type StorefrontConfig = {
  endpoint: string;
  token: string;
  marketCountry: string;
};

function getShopRoot(): HTMLElement | null {
  return document.querySelector('[data-shop-root]');
}

function readConfig(root: HTMLElement): StorefrontConfig & {
  handle: string;
  page: string;
} {
  const domain = root.dataset.shopifyDomain ?? '';
  return {
    endpoint: `https://${domain}/api/${API_VERSION}/graphql.json`,
    token: root.dataset.storefrontToken ?? '',
    marketCountry: root.dataset.marketCountry ?? '',
    handle: root.dataset.productHandle ?? '',
    page: root.dataset.shopPage ?? ''
  };
}

function inContextDirective(marketCountry: string): string {
  return marketCountry ? '@inContext(country: $country)' : '';
}

function withCountryVariables(
  marketCountry: string,
  variables?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!marketCountry) return variables;
  return { ...(variables ?? {}), country: marketCountry };
}

type StorefrontResponse = {
  data?: Record<string, unknown>;
  errors?: Array<{ message?: string }>;
};

function mutationUserErrors(data: Record<string, unknown> | undefined, field: string): string[] {
  const payload = data?.[field] as { userErrors?: Array<{ message?: string }> } | undefined;
  return (payload?.userErrors ?? [])
    .map((error) => error.message?.trim())
    .filter((message): message is string => Boolean(message));
}

async function storefrontFetch(
  config: StorefrontConfig,
  query: string,
  variables?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.token
    },
    body: JSON.stringify({
      query,
      variables: withCountryVariables(config.marketCountry, variables)
    })
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront HTTP ${res.status}`);
  }

  let json: StorefrontResponse;
  try {
    json = (await res.json()) as StorefrontResponse;
  } catch {
    throw new Error('Invalid Shopify Storefront response');
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Shopify error');
  }

  if (!json.data) {
    throw new Error('Empty Shopify Storefront response');
  }

  return json.data;
}

function assertNoUserErrors(data: Record<string, unknown>, field: string): void {
  const messages = mutationUserErrors(data, field);
  if (messages.length > 0) {
    throw new Error(messages.join(' '));
  }
}

const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
  }
  lines(first: ${CART_LINES_FIRST}) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            selectedOptions { name value }
            image { url }
            product { title handle }
          }
        }
      }
    }
  }
`;

function cartGetQuery(marketCountry: string): string {
  if (marketCountry) {
    return `query CartGet($id: ID!, $country: CountryCode!) ${inContextDirective(marketCountry)} {
      cart(id: $id) { ${CART_FRAGMENT} }
    }`;
  }
  return `query CartGet($id: ID!) { cart(id: $id) { ${CART_FRAGMENT} } }`;
}

function cartCreateMutation(marketCountry: string): string {
  if (marketCountry) {
    return `mutation CartCreate($country: CountryCode!) ${inContextDirective(marketCountry)} {
      cartCreate { cart { ${CART_FRAGMENT} } userErrors { message } }
    }`;
  }
  return `mutation { cartCreate { cart { ${CART_FRAGMENT} } userErrors { message } } }`;
}

function cartLinesAddMutation(marketCountry: string): string {
  if (marketCountry) {
    return `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode!) ${inContextDirective(marketCountry)} {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FRAGMENT} }
        userErrors { message field code }
      }
    }`;
  }
  return `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { message field code }
    }
  }`;
}

function cartLinesUpdateMutation(marketCountry: string): string {
  if (marketCountry) {
    return `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode!) ${inContextDirective(marketCountry)} {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FRAGMENT} }
        userErrors { message field code }
      }
    }`;
  }
  return `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FRAGMENT} }
      userErrors { message field code }
    }
  }`;
}

function cartLinesRemoveMutation(marketCountry: string): string {
  if (marketCountry) {
    return `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode!) ${inContextDirective(marketCountry)} {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FRAGMENT} }
        userErrors { message field code }
      }
    }`;
  }
  return `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FRAGMENT} }
      userErrors { message field code }
    }
  }`;
}

function resolveVariantGid(buyRoot: HTMLElement): string | undefined {
  return getSelectedVariantId(buyRoot);
}

function updateCartBadge(totalQuantity?: number): void {
  const badge = document.querySelector<HTMLElement>('[data-cart-count]');
  if (!badge) return;

  if (totalQuantity && totalQuantity > 0) {
    badge.textContent = `(${totalQuantity})`;
    badge.hidden = false;
  } else {
    badge.textContent = '(0)';
    badge.hidden = true;
  }
}

function updateCheckoutLinks(checkoutUrl?: string): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-cart-checkout]').forEach((link) => {
    if (checkoutUrl) {
      link.href = checkoutUrl;
      link.hidden = false;
    } else {
      link.href = '#';
      link.hidden = true;
    }
  });
}

function formatLinePrice(line: CartLine): string {
  const amount = parsePriceAmount(line.merchandise.price?.amount);
  if (typeof amount !== 'number') return '—';
  return formatPrice(amount * line.quantity, line.merchandise.price?.currencyCode ?? 'EUR');
}

function formatSubtotal(cart: CartData): string {
  const amount = parsePriceAmount(cart.cost?.subtotalAmount?.amount);
  const currency = cart.cost?.subtotalAmount?.currencyCode ?? 'EUR';
  return typeof amount === 'number' ? formatPrice(amount, currency) : '—';
}

function primaryOptionBadge(line: CartLine): string {
  const options = line.merchandise.selectedOptions ?? [];
  const size = options.find((option) => option.name.toLowerCase() === 'size');
  return size?.value ?? options[0]?.value ?? '';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function setCartPageState(
  root: HTMLElement,
  state: 'loading' | 'empty' | 'ready' | 'error',
  message?: string
): void {
  const layout = root.querySelector<HTMLElement>('[data-cart-layout]');
  const emptyEl = root.querySelector<HTMLElement>('[data-cart-empty]');
  const errorEl = root.querySelector<HTMLElement>('[data-cart-error]');

  if (layout) layout.hidden = state !== 'ready';
  if (emptyEl) emptyEl.hidden = state !== 'empty';
  if (errorEl) {
    errorEl.hidden = state !== 'error';
    if (state === 'error' && message) {
      errorEl.textContent = message;
    }
  }
}

function renderCartPage(root: HTMLElement, cart: CartData | null): void {
  const linesEl = root.querySelector<HTMLElement>('[data-cart-lines]');
  const subtotalEl = root.querySelector<HTMLElement>('[data-cart-subtotal]');

  const lines = (cart?.lines?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is CartLine => Boolean(node?.id));

  if (!linesEl) return;

  linesEl.innerHTML = '';

  if (!cart || lines.length === 0) {
    setCartPageState(root, 'empty');
    if (subtotalEl) subtotalEl.textContent = '—';
    updateCheckoutLinks(undefined);
    return;
  }

  setCartPageState(root, 'ready');
  if (subtotalEl) subtotalEl.textContent = formatSubtotal(cart);
  updateCheckoutLinks(cart.checkoutUrl);

  lines.forEach((line) => {
    const article = document.createElement('article');
    article.className = 'page-shop-cart-line';
    article.dataset.cartLine = line.id;

    const imageUrl = line.merchandise.image?.url ?? '';
    const title = escapeHtml(line.merchandise.product?.title ?? line.merchandise.title);
    const badge = escapeHtml(primaryOptionBadge(line));

    article.innerHTML = `
      <div class="page-shop-cart-line-media">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy" />` : ''}
      </div>
      <div class="page-shop-cart-line-panel">
        <div class="page-shop-cart-line-row page-shop-cart-line-row-title">
          <h2 class="page-shop-cart-line-title">${title}</h2>
          <div class="page-shop-buy-qty">
            <span>Quantity</span>
            <div class="page-shop-buy-qty-controls">
              <button type="button" class="page-shop-buy-qty-btn" data-cart-qty-minus aria-label="Decrease quantity">−</button>
              <span class="page-shop-buy-qty-value" data-cart-qty-value>${line.quantity}</span>
              <button type="button" class="page-shop-buy-qty-btn" data-cart-qty-plus aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
        <div class="page-shop-cart-line-row page-shop-cart-line-row-price">
          <span class="page-shop-buy-price">${formatLinePrice(line)}</span>
        </div>
        <div class="page-shop-cart-line-footer">
          ${badge ? `<span class="page-shop-cart-line-badge">${badge}</span>` : '<span></span>'}
          <button type="button" class="page-shop-cart-line-remove" data-cart-remove>Remove item</button>
        </div>
      </div>
    `;

    linesEl.appendChild(article);
  });
}

let cleanup: (() => void) | null = null;
let cartContext: (StorefrontConfig & { root: HTMLElement }) | null = null;
let cartCreatePromise: Promise<CartData> | null = null;
let cartMutationInFlight = false;

async function getOrCreateCart(config: StorefrontConfig): Promise<CartData> {
  if (cartCreatePromise) {
    return cartCreatePromise;
  }

  cartCreatePromise = (async () => {
    const existing = localStorage.getItem(CART_KEY);
    if (existing) {
      try {
        const data = await storefrontFetch(config, cartGetQuery(config.marketCountry), { id: existing });
        if (data?.cart && (data.cart as CartData).id) {
          return data.cart as CartData;
        }
      } catch {
        localStorage.removeItem(CART_KEY);
      }
    }

    const data = await storefrontFetch(config, cartCreateMutation(config.marketCountry));
    assertNoUserErrors(data, 'cartCreate');
    const cart = data?.cartCreate as { cart?: CartData } | undefined;
    if (!cart?.cart?.id) throw new Error('Failed to create cart');
    localStorage.setItem(CART_KEY, cart.cart.id);
    return cart.cart;
  })();

  try {
    return await cartCreatePromise;
  } finally {
    cartCreatePromise = null;
  }
}

async function fetchCart(config: StorefrontConfig): Promise<CartData | null> {
  const existing = localStorage.getItem(CART_KEY);
  if (!existing) return null;

  const data = await storefrontFetch(config, cartGetQuery(config.marketCountry), { id: existing });
  return (data?.cart as CartData | null) ?? null;
}

async function refreshCartUI(): Promise<void> {
  if (!cartContext) return;

  const { root, ...config } = cartContext;

  try {
    const cart = await fetchCart(config);
    updateCartBadge(cart?.totalQuantity);
    updateCheckoutLinks(cart?.checkoutUrl);

    if (root.dataset.shopPage === 'cart') {
      renderCartPage(root, cart);
    }
  } catch (error) {
    console.error('[shop-cart]', error);
    if (root.dataset.shopPage === 'cart') {
      setCartPageState(
        root,
        'error',
        'Could not load your cart. Please refresh and try again.'
      );
    }
  }
}

async function updateLineQuantity(lineId: string, quantity: number): Promise<void> {
  if (!cartContext || cartMutationInFlight) return;

  const { ...config } = cartContext;
  const cartId = localStorage.getItem(CART_KEY);
  if (!cartId) return;

  cartMutationInFlight = true;

  try {
    if (quantity <= 0) {
      const data = await storefrontFetch(config, cartLinesRemoveMutation(config.marketCountry), {
        cartId,
        lineIds: [lineId]
      });
      assertNoUserErrors(data, 'cartLinesRemove');
    } else {
      const data = await storefrontFetch(config, cartLinesUpdateMutation(config.marketCountry), {
        cartId,
        lines: [{ id: lineId, quantity }]
      });
      assertNoUserErrors(data, 'cartLinesUpdate');
    }

    await refreshCartUI();
  } catch (error) {
    console.error('[shop-cart]', error);
    if (cartContext.root.dataset.shopPage === 'cart') {
      setCartPageState(
        cartContext.root,
        'error',
        error instanceof Error ? error.message : 'Could not update cart.'
      );
    }
  } finally {
    cartMutationInFlight = false;
  }
}

export function destroyShopCart(): void {
  cleanup?.();
  cleanup = null;
  cartContext = null;
  cartCreatePromise = null;
  cartMutationInFlight = false;
}

export function initShopCart(): (() => void) | null {
  destroyShopCart();

  const root = getShopRoot();
  if (!root) return null;

  const config = readConfig(root);
  if (!config.token || !config.endpoint.includes('://')) return null;

  cartContext = { ...config, root };

  if (root.dataset.shopPage === 'cart') {
    setCartPageState(root, 'loading');
  }

  const listeners: Array<() => void> = [];

  root.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    const onClick = async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;

      const buyRoot = resolveBuyRoot(btn);
      if (!buyRoot) return;

      const statusEl = buyRoot.querySelector('[data-add-status]');
      const prev = btn.dataset.defaultLabel ?? btn.textContent ?? 'Add to cart';
      btn.disabled = true;
      btn.textContent = 'Adding…';

      try {
        const merchandiseId = resolveVariantGid(buyRoot);
        if (!merchandiseId) throw new Error('Select a valid variant');

        const quantity = getSelectedQuantity(buyRoot);
        const cart = await getOrCreateCart(config);
        const data = await storefrontFetch(config, cartLinesAddMutation(config.marketCountry), {
          cartId: cart.id,
          lines: [{ merchandiseId, quantity }]
        });
        assertNoUserErrors(data, 'cartLinesAdd');

        const updated = (data.cartLinesAdd as { cart?: CartData } | undefined)?.cart;
        updateCartBadge(updated?.totalQuantity);
        updateCheckoutLinks(updated?.checkoutUrl);
        if (statusEl) statusEl.textContent = 'Added to cart';
        btn.textContent = 'Added';
      } catch (err) {
        console.error('[shop-cart]', err);
        btn.textContent = 'Error';
        if (statusEl) {
          statusEl.textContent =
            err instanceof Error ? err.message : 'Could not add to cart.';
        }
      } finally {
        setTimeout(() => {
          refreshProductBuyUI(buyRoot);
          if (btn.textContent === 'Adding…' || btn.textContent === 'Added' || btn.textContent === 'Error') {
            btn.textContent = prev;
          }
        }, 1200);
      }
    };

    btn.addEventListener('click', onClick);
    listeners.push(() => btn.removeEventListener('click', onClick));
  });

  const onRootClick = async (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const lineEl = target.closest<HTMLElement>('[data-cart-line]');
    if (!lineEl) return;

    const lineId = lineEl.dataset.cartLine;
    if (!lineId) return;

    const qtyEl = lineEl.querySelector('[data-cart-qty-value]');
    const currentQty = Number.parseInt(qtyEl?.textContent ?? '1', 10) || 1;

    if (target.matches('[data-cart-qty-minus]')) {
      await updateLineQuantity(lineId, currentQty - 1);
    } else if (target.matches('[data-cart-qty-plus]')) {
      await updateLineQuantity(lineId, currentQty + 1);
    } else if (target.matches('[data-cart-remove]')) {
      await updateLineQuantity(lineId, 0);
    }
  };

  root.addEventListener('click', onRootClick);
  listeners.push(() => root.removeEventListener('click', onRootClick));

  void refreshCartUI();

  cleanup = () => {
    listeners.forEach((remove) => remove());
  };

  return cleanup;
}
