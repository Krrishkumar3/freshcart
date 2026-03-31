/* ===================================
   FreshCart — Main Application Logic
   Agent 3 (Frontend) + Agent 4 (Integration)
   =================================== */

const API = '';
const CART_ID = localStorage.getItem('freshcart_id') || generateCartId();

function generateCartId() {
  const id = 'cart_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('freshcart_id', id);
  return id;
}

// ─── State ───
let state = {
  products: [],
  categories: [],
  activeCategory: 'All',
  sort: '',
  searchQuery: '',
  cart: { items: [], subtotal: 0, tax: 0, delivery: 0, total: 0, itemCount: 0 },
};

// ─── DOM References ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  productsGrid: $('#productsGrid'),
  categoryPills: $('#categoryPills'),
  sortSelect: $('#sortSelect'),
  searchInput: $('#searchInput'),
  productCount: $('#productCount'),
  cartToggle: $('#cartToggle'),
  cartBadge: $('#cartBadge'),
  cartOverlay: $('#cartOverlay'),
  cartSidebar: $('#cartSidebar'),
  cartClose: $('#cartClose'),
  cartItems: $('#cartItems'),
  cartEmpty: $('#cartEmpty'),
  cartItemCount: $('#cartItemCount'),
  cartSubtotal: $('#cartSubtotal'),
  cartTax: $('#cartTax'),
  cartDelivery: $('#cartDelivery'),
  cartTotal: $('#cartTotal'),
  cartSummary: $('#cartSummary'),
  deliveryProgress: $('#deliveryProgress'),
  deliveryText: $('#deliveryText'),
  deliveryBarFill: $('#deliveryBarFill'),
  checkoutBtn: $('#checkoutBtn'),
  checkoutModal: $('#checkoutModal'),
  modalClose: $('#modalClose'),
  modalBody: $('#modalBody'),
  checkoutForm: $('#checkoutForm'),
  themeToggle: $('#themeToggle'),
  toastContainer: $('#toastContainer'),
};

// ─── API Helpers ───
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    showToast('Network error. Please try again.', 'error');
    return { success: false };
  }
}

// ─── Products ───
async function loadProducts() {
  const params = new URLSearchParams();
  if (state.activeCategory !== 'All') params.set('category', state.activeCategory);
  if (state.searchQuery) params.set('search', state.searchQuery);
  if (state.sort) params.set('sort', state.sort);

  const res = await api(`/api/products?${params}`);
  if (res.success) {
    state.products = res.data;
    renderProducts();
  }
}

async function loadCategories() {
  const res = await api('/api/products/categories');
  if (res.success) {
    state.categories = res.data;
    renderCategories();
  }
}

function renderProducts() {
  const grid = els.productsGrid;
  els.productCount.textContent = `${state.products.length} product${state.products.length !== 1 ? 's' : ''}`;

  if (state.products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">🔍</div>
        <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">No products found</h3>
        <p style="color: var(--color-text-muted); font-size: 0.9rem;">Try a different search or category</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.products.map((p, i) => {
    const stars = renderStars(p.rating);
    const inCart = state.cart.items.find(item => item.productId === p.id);
    return `
      <div class="product-card" style="animation-delay: ${i * 0.05}s" id="product-${p.id}">
        <div class="product-card-image">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23f0f4f1%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2260%22>🥬</text></svg>'">
        </div>
        <div class="product-card-body">
          <div class="product-category">${p.category}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-description">${p.description}</div>
          <div class="product-rating">
            <div class="stars">${stars}</div>
            <span class="rating-text">${p.rating} (${p.reviews})</span>
          </div>
        </div>
        <div class="product-card-footer">
          <div>
            <span class="product-price">$${p.price.toFixed(2)}</span>
            <span class="product-unit"> ${p.unit}</span>
          </div>
          <button class="add-to-cart-btn ${inCart ? 'added' : ''}" 
                  onclick="addToCart('${p.id}')" 
                  id="add-btn-${p.id}">
            ${inCart ? '✓ Added' : '+ Add'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '★';
  if (half) html += '★';
  for (let i = full + (half ? 1 : 0); i < 5; i++) html += '☆';
  return html;
}

function renderCategories() {
  els.categoryPills.innerHTML = state.categories.map(cat => `
    <button class="category-pill ${cat === state.activeCategory ? 'active' : ''}" 
            onclick="setCategory('${cat}')"
            id="cat-${cat.replace(/\s/g, '-')}">
      ${getCategoryEmoji(cat)} ${cat}
    </button>
  `).join('');
}

function getCategoryEmoji(cat) {
  const emojis = { All: '🏪', Fruits: '🍎', Vegetables: '🥦', Dairy: '🥛', Bakery: '🍞', Seafood: '🐟', Meat: '🥩' };
  return emojis[cat] || '📦';
}

function setCategory(cat) {
  state.activeCategory = cat;
  renderCategories();
  loadProducts();
}

// ─── Cart ───
async function loadCart() {
  const res = await api(`/api/cart/${CART_ID}`);
  if (res.success) {
    state.cart = res.data;
    updateCartUI();
  }
}

async function addToCart(productId) {
  const btn = $(`#add-btn-${productId}`);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '✓ Added';
  }

  const res = await api(`/api/cart/${CART_ID}/add`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity: 1 }),
  });

  if (res.success) {
    state.cart = res.data;
    updateCartUI();
    showToast(res.message, 'success');
  }
  
  // Reset button after 1.5s
  setTimeout(() => {
    if (btn && !state.cart.items.find(i => i.productId === productId)) {
      btn.classList.remove('added');
      btn.innerHTML = '+ Add';
    }
  }, 1500);
}

async function updateQuantity(productId, quantity) {
  const res = await api(`/api/cart/${CART_ID}/update`, {
    method: 'PUT',
    body: JSON.stringify({ productId, quantity }),
  });

  if (res.success) {
    state.cart = res.data;
    updateCartUI();
    renderCartItems();
    renderProducts(); // refresh add buttons
  }
}

async function removeFromCart(productId) {
  const res = await api(`/api/cart/${CART_ID}/remove/${productId}`, { method: 'DELETE' });
  if (res.success) {
    state.cart = res.data;
    updateCartUI();
    renderCartItems();
    renderProducts();
    showToast(res.message, 'success');
  }
}

function updateCartUI() {
  const count = state.cart.itemCount || 0;
  els.cartBadge.textContent = count;
  els.cartBadge.classList.toggle('hidden', count === 0);
  els.cartItemCount.textContent = count;

  const hasItems = state.cart.items && state.cart.items.length > 0;
  els.cartEmpty.style.display = hasItems ? 'none' : 'flex';
  els.cartSummary.style.display = hasItems ? 'block' : 'none';
  els.deliveryProgress.style.display = hasItems ? 'block' : 'none';

  if (hasItems) {
    els.cartSubtotal.textContent = `$${state.cart.subtotal.toFixed(2)}`;
    els.cartTax.textContent = `$${state.cart.tax.toFixed(2)}`;
    
    if (state.cart.delivery === 0) {
      els.cartDelivery.innerHTML = '<span class="free">FREE</span>';
    } else {
      els.cartDelivery.textContent = `$${state.cart.delivery.toFixed(2)}`;
    }
    
    els.cartTotal.textContent = `$${state.cart.total.toFixed(2)}`;

    // Delivery progress
    const threshold = state.cart.freeDeliveryThreshold || 35;
    const progress = Math.min((state.cart.subtotal / threshold) * 100, 100);
    els.deliveryBarFill.style.width = `${progress}%`;
    
    if (state.cart.subtotal >= threshold) {
      els.deliveryText.innerHTML = '🎉 You qualify for <strong>FREE delivery</strong>!';
    } else {
      const remaining = (threshold - state.cart.subtotal).toFixed(2);
      els.deliveryText.innerHTML = `Add <strong>$${remaining}</strong> more for free delivery`;
    }
  }

  renderCartItems();
}

function renderCartItems() {
  if (!state.cart.items || state.cart.items.length === 0) return;

  const itemsHtml = state.cart.items.map(item => `
    <div class="cart-item" id="cart-item-${item.productId}">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f4f1%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2230%22>🥬</text></svg>'">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-unit">${item.unit}</div>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button class="qty-btn" onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          </div>
          <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.productId}')">Remove</button>
      </div>
    </div>
  `).join('');

  // Keep empty div but add items before it
  const existingItems = els.cartItems.querySelectorAll('.cart-item');
  existingItems.forEach(el => el.remove());
  els.cartItems.insertAdjacentHTML('afterbegin', itemsHtml);
}

// ─── Cart Sidebar Toggle ───
function openCart() {
  els.cartSidebar.classList.add('open');
  els.cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  els.cartSidebar.classList.remove('open');
  els.cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Checkout ───
function openCheckout() {
  closeCart();
  setTimeout(() => {
    els.checkoutModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }, 200);
}

function closeCheckout() {
  els.checkoutModal.classList.remove('open');
  document.body.style.overflow = '';
}

async function placeOrder(e) {
  e.preventDefault();
  
  const customer = {
    name: $('#customerName').value,
    email: $('#customerEmail').value,
    phone: $('#customerPhone').value,
    address: $('#customerAddress').value,
  };

  const btn = $('#placeOrderBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Placing order...';

  const res = await api('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      cartId: CART_ID,
      items: state.cart.items,
      totals: {
        subtotal: state.cart.subtotal,
        tax: state.cart.tax,
        delivery: state.cart.delivery,
        total: state.cart.total,
      },
      customer,
    }),
  });

  if (res.success) {
    // Clear cart on server
    await api(`/api/cart/${CART_ID}/clear`, { method: 'DELETE' });
    state.cart = { items: [], subtotal: 0, tax: 0, delivery: 0, total: 0, itemCount: 0 };
    updateCartUI();
    renderProducts();

    // Show success
    const order = res.data;
    const deliveryTime = new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    els.modalBody.innerHTML = `
      <div class="order-success">
        <div class="order-success-icon">✅</div>
        <h2>Order Placed!</h2>
        <div class="order-number">${order.orderNumber}</div>
        <p>Thank you, ${customer.name}! Your fresh groceries are on their way.</p>
        <div class="delivery-estimate">🕐 Estimated delivery by ${deliveryTime}</div>
        <br>
        <button class="continue-shopping-btn" onclick="closeCheckoutAndReset()">
          ← Continue Shopping
        </button>
      </div>
    `;

    showToast(`Order ${order.orderNumber} confirmed! 🎉`, 'success');
  } else {
    btn.disabled = false;
    btn.textContent = '🛍️ Place Order';
    showToast(res.message || 'Failed to place order', 'error');
  }
}

function closeCheckoutAndReset() {
  closeCheckout();
  // Reset modal to form after closing
  setTimeout(() => {
    els.modalBody.innerHTML = `
      <form id="checkoutForm" onsubmit="placeOrder(event)">
        <div class="form-group">
          <label for="customerName">Full Name</label>
          <input type="text" id="customerName" placeholder="John Doe" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="customerEmail">Email</label>
            <input type="email" id="customerEmail" placeholder="john@example.com" required>
          </div>
          <div class="form-group">
            <label for="customerPhone">Phone</label>
            <input type="tel" id="customerPhone" placeholder="(555) 123-4567">
          </div>
        </div>
        <div class="form-group">
          <label for="customerAddress">Delivery Address</label>
          <textarea id="customerAddress" placeholder="123 Main St, Apt 4B, New York, NY 10001" required></textarea>
        </div>
        <button type="submit" class="place-order-btn" id="placeOrderBtn">
          🛍️ Place Order
        </button>
      </form>
    `;
  }, 400);
}

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Theme Toggle ───
function initTheme() {
  const saved = localStorage.getItem('freshcart_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  els.themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('freshcart_theme', next);
  els.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ─── Search (debounced) ───
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    loadProducts();
  }, 350);
}

// ─── Event Listeners ───
function initEvents() {
  els.cartToggle.addEventListener('click', openCart);
  els.cartOverlay.addEventListener('click', closeCart);
  els.cartClose.addEventListener('click', closeCart);
  els.checkoutBtn.addEventListener('click', openCheckout);
  els.modalClose.addEventListener('click', closeCheckout);
  els.themeToggle.addEventListener('click', toggleTheme);
  els.searchInput.addEventListener('input', handleSearch);
  
  els.sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    loadProducts();
  });

  els.checkoutForm.addEventListener('submit', placeOrder);

  // Close modal on overlay click
  els.checkoutModal.addEventListener('click', (e) => {
    if (e.target === els.checkoutModal) closeCheckout();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeCheckout();
    }
  });
}

// ─── Initialize ───
async function init() {
  initTheme();
  initEvents();
  await Promise.all([loadCategories(), loadProducts(), loadCart()]);
}

// Start app
document.addEventListener('DOMContentLoaded', init);

// Make functions globally accessible for inline event handlers
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.setCategory = setCategory;
window.closeCheckoutAndReset = closeCheckoutAndReset;
window.placeOrder = placeOrder;
