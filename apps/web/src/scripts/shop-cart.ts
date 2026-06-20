import { formatEurPrice, parsePriceAmount } from '../lib/shop-format';
import { getSelectedQuantity } from './shop-product';

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

function getShopRoot(): HTMLElement | null {
  return document.querySelector('[data-shop-root]');
}

function readConfig(root: HTMLElement) {
  return {
    domain: root.dataset.shopifyDomain ?? '',
    token: root.dataset.storefrontToken ?? '',
    marketCountry: root.dataset.marketCountry ?? '',
    handle: root.dataset.productHandle ?? '',
    page: root.dataset.shopPage ?? ''
  };
}

async function storefrontFetch(
  endpoint: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Shopify error');
  }
  return json.data;
}

const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
  }
  lines(first: 50) {
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

async function resolveVariantGid(handle: string): Promise<string | undefined> {
  const selected = document.querySelector<HTMLInputElement>('[data-variant-radio]:checked');
  if (selected?.dataset.variantId) {
    return selected.dataset.variantId;
  }

  const res = await fetch(`/api/product-variants?handle=${encodeURIComponent(handle)}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.variants)) {
    return undefined;
  }
  const title = selected?.dataset.variantTitle;
  const match = json.variants.find(
    (v: { id: string; title: string }) => !title || v.title === title
  );
  return match?.id ?? json.variants[0]?.id;
}

function updateCartBadge(totalQuantity?: number): void {
  const badge = document.querySelector<HTMLElement>('[data-cart-count]');
  if (!badge) return;

  if (totalQuantity && totalQuantity > 0) {
    badge.textContent = String(totalQuantity);
    badge.hidden = false;
  } else {
    badge.textContent = '';
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

function updateCartBackground(lines: CartLine[]): void {
  const bgImage = document.querySelector<HTMLImageElement>('[data-cart-bg-image]');
  if (!bgImage) return;

  const imageUrl = lines.find((line) => line.merchandise.image?.url)?.merchandise.image?.url;
  if (imageUrl) {
    bgImage.src = imageUrl;
    bgImage.hidden = false;
  } else {
    bgImage.removeAttribute('src');
    bgImage.hidden = true;
  }
}

function formatLinePrice(line: CartLine): string {
  const amount = parsePriceAmount(line.merchandise.price?.amount);
  if (typeof amount !== 'number') return '—';
  return formatEurPrice(amount * line.quantity);
}

function formatSubtotal(cart: CartData): string {
  const amount = parsePriceAmount(cart.cost?.subtotalAmount?.amount);
  return typeof amount === 'number' ? formatEurPrice(amount) : '—';
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

function renderCartPage(root: HTMLElement, cart: CartData | null): void {
  const layout = root.querySelector<HTMLElement>('[data-cart-layout]');
  const emptyEl = root.querySelector<HTMLElement>('[data-cart-empty]');
  const linesEl = root.querySelector<HTMLElement>('[data-cart-lines]');
  const subtotalEl = root.querySelector<HTMLElement>('[data-cart-subtotal]');

  const lines = (cart?.lines?.edges ?? [])
    .map((edge) => edge.node)
    .filter((node): node is CartLine => Boolean(node?.id));

  if (!linesEl || !layout || !emptyEl) return;

  linesEl.innerHTML = '';

  if (!cart || lines.length === 0) {
    layout.hidden = true;
    emptyEl.hidden = false;
    if (subtotalEl) subtotalEl.textContent = '—';
    updateCheckoutLinks(undefined);
    updateCartBackground([]);
    return;
  }

  layout.hidden = false;
  emptyEl.hidden = true;
  if (subtotalEl) subtotalEl.textContent = formatSubtotal(cart);
  updateCheckoutLinks(cart.checkoutUrl);
  updateCartBackground(lines);

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
        <div class="page-shop-cart-line-row">
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
        <div class="page-shop-cart-line-row">
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
let cartContext: {
  endpoint: string;
  token: string;
  root: HTMLElement;
} | null = null;

async function getOrCreateCart(endpoint: string, token: string): Promise<CartData> {
  const existing = localStorage.getItem(CART_KEY);
  if (existing) {
    try {
      const data = await storefrontFetch(
        endpoint,
        token,
        `query CartGet($id: ID!) { cart(id: $id) { ${CART_FRAGMENT} } }`,
        { id: existing }
      );
      if (data?.cart?.id) return data.cart as CartData;
    } catch {
      localStorage.removeItem(CART_KEY);
    }
  }

  const data = await storefrontFetch(
    endpoint,
    token,
    `mutation { cartCreate { cart { ${CART_FRAGMENT} } userErrors { message } } }`
  );
  const cart = data?.cartCreate?.cart as CartData | undefined;
  if (!cart?.id) throw new Error('Failed to create cart');
  localStorage.setItem(CART_KEY, cart.id);
  return cart;
}

async function fetchCart(endpoint: string, token: string): Promise<CartData | null> {
  const existing = localStorage.getItem(CART_KEY);
  if (!existing) return null;

  const data = await storefrontFetch(
    endpoint,
    token,
    `query CartGet($id: ID!) { cart(id: $id) { ${CART_FRAGMENT} } }`,
    { id: existing }
  );

  return (data?.cart as CartData | null) ?? null;
}

async function refreshCartUI(): Promise<void> {
  if (!cartContext) return;

  const { endpoint, token, root } = cartContext;
  const cart = await fetchCart(endpoint, token);
  updateCartBadge(cart?.totalQuantity);
  updateCheckoutLinks(cart?.checkoutUrl);

  if (root.dataset.shopPage === 'cart') {
    renderCartPage(root, cart);
  }
}

async function updateLineQuantity(lineId: string, quantity: number): Promise<void> {
  if (!cartContext) return;
  const { endpoint, token } = cartContext;
  const cartId = localStorage.getItem(CART_KEY);
  if (!cartId) return;

  if (quantity <= 0) {
    await storefrontFetch(
      endpoint,
      token,
      `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart { ${CART_FRAGMENT} }
          userErrors { message }
        }
      }`,
      { cartId, lineIds: [lineId] }
    );
  } else {
    await storefrontFetch(
      endpoint,
      token,
      `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart { ${CART_FRAGMENT} }
          userErrors { message }
        }
      }`,
      { cartId, lines: [{ id: lineId, quantity }] }
    );
  }

  await refreshCartUI();
}

export function destroyShopCart(): void {
  cleanup?.();
  cleanup = null;
  cartContext = null;
}

export function initShopCart(): (() => void) | null {
  destroyShopCart();

  const root = getShopRoot();
  if (!root) return null;

  const { domain, token, handle, page } = readConfig(root);
  if (!domain || !token) return null;

  const endpoint = `https://${domain}/api/${API_VERSION}/graphql.json`;
  cartContext = { endpoint, token, root };

  const listeners: Array<() => void> = [];

  root.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    const onClick = async (event: Event) => {
      event.preventDefault();
      if (!(btn instanceof HTMLButtonElement)) return;

      const productHandle =
        handle || btn.closest('[data-shop-root]')?.getAttribute('data-product-handle');
      if (!productHandle) return;

      const statusEl = root.querySelector('[data-add-status]');
      const prev = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding…';

      try {
        const merchandiseId = await resolveVariantGid(productHandle);
        if (!merchandiseId) throw new Error('No variant');

        const quantity = getSelectedQuantity(root);
        const cart = await getOrCreateCart(endpoint, token);
        const data = await storefrontFetch(
          endpoint,
          token,
          `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart { ${CART_FRAGMENT} }
              userErrors { message }
            }
          }`,
          { cartId: cart.id, lines: [{ merchandiseId, quantity }] }
        );

        const updated = data?.cartLinesAdd?.cart as CartData | undefined;
        updateCartBadge(updated?.totalQuantity);
        updateCheckoutLinks(updated?.checkoutUrl);
        if (statusEl) statusEl.textContent = 'Added to cart';
        btn.textContent = 'Added';
      } catch (err) {
        console.error('[shop-cart]', err);
        btn.textContent = 'Error';
        if (statusEl) statusEl.textContent = 'Could not add to cart.';
      } finally {
        setTimeout(() => {
          const variant = document.querySelector<HTMLInputElement>('[data-variant-radio]:checked');
          btn.disabled = !variant || variant.disabled;
          btn.textContent = prev ?? 'Add to cart';
        }, 1200);
      }
    };

    btn.addEventListener('click', onClick);
    listeners.push(() => btn.removeEventListener('click', onClick));
  });

  root.querySelectorAll('[data-variant-radio]').forEach((radio) => {
    const onChange = () => {
      const card = radio.closest('[data-product-buy]');
      const priceEl = card?.querySelector('[data-variant-price]');
      const input = radio as HTMLInputElement;
      const amount = input.dataset.price;
      if (priceEl && amount) {
        const parsed = parsePriceAmount(amount);
        priceEl.textContent =
          typeof parsed === 'number' ? formatEurPrice(parsed) : amount;
      }
    };

    radio.addEventListener('change', onChange);
    listeners.push(() => radio.removeEventListener('change', onChange));
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
