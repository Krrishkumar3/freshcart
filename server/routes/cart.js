const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load products for reference
const productsPath = path.join(__dirname, '..', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

// In-memory cart store (keyed by session/cart ID)
const carts = new Map();

function getCart(cartId) {
  if (!carts.has(cartId)) {
    carts.set(cartId, { items: [], updatedAt: new Date().toISOString() });
  }
  return carts.get(cartId);
}

function calculateTotals(cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08; // 8% tax
  const delivery = subtotal > 35 ? 0 : 4.99;
  const total = subtotal + tax + delivery;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    delivery: Math.round(delivery * 100) / 100,
    total: Math.round(total * 100) / 100,
    freeDeliveryThreshold: 35,
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

// GET /api/cart/:cartId — get cart contents
router.get('/:cartId', (req, res) => {
  const cart = getCart(req.params.cartId);
  const totals = calculateTotals(cart);
  res.json({ success: true, data: { ...cart, ...totals } });
});

// POST /api/cart/:cartId/add — add item to cart
router.post('/:cartId/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = products.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const cart = getCart(req.params.cartId);
  const existing = cart.items.find(item => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      quantity,
      category: product.category
    });
  }

  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ success: true, data: { ...cart, ...totals }, message: `${product.name} added to cart` });
});

// PUT /api/cart/:cartId/update — update item quantity
router.put('/:cartId/update', (req, res) => {
  const { productId, quantity } = req.body;
  const cart = getCart(req.params.cartId);
  const item = cart.items.find(i => i.productId === productId);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not in cart' });
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter(i => i.productId !== productId);
  } else {
    item.quantity = quantity;
  }

  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ success: true, data: { ...cart, ...totals } });
});

// DELETE /api/cart/:cartId/remove/:productId — remove item from cart
router.delete('/:cartId/remove/:productId', (req, res) => {
  const cart = getCart(req.params.cartId);
  const itemIndex = cart.items.findIndex(i => i.productId === req.params.productId);

  if (itemIndex === -1) {
    return res.status(404).json({ success: false, message: 'Item not in cart' });
  }

  const removed = cart.items.splice(itemIndex, 1)[0];
  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ success: true, data: { ...cart, ...totals }, message: `${removed.name} removed from cart` });
});

// DELETE /api/cart/:cartId/clear — clear entire cart
router.delete('/:cartId/clear', (req, res) => {
  const cart = getCart(req.params.cartId);
  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  const totals = calculateTotals(cart);
  res.json({ success: true, data: { ...cart, ...totals }, message: 'Cart cleared' });
});

module.exports = router;
