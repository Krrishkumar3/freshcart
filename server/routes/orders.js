const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;

// In-memory orders store
const orders = new Map();

// POST /api/orders — place a new order
router.post('/', (req, res) => {
  const { cartId, items, totals, customer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot place an empty order' });
  }

  if (!customer || !customer.name || !customer.email || !customer.address) {
    return res.status(400).json({ success: false, message: 'Customer details are required (name, email, address)' });
  }

  const order = {
    id: uuidv4(),
    orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
    items,
    subtotal: totals.subtotal,
    tax: totals.tax,
    delivery: totals.delivery,
    total: totals.total,
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address
    },
    status: 'confirmed',
    placedAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
  };

  orders.set(order.id, order);

  res.status(201).json({
    success: true,
    data: order,
    message: `Order ${order.orderNumber} placed successfully!`
  });
});

// GET /api/orders/:id — get order details
router.get('/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// GET /api/orders — list all orders (for demo purposes)
router.get('/', (req, res) => {
  const allOrders = Array.from(orders.values()).sort(
    (a, b) => new Date(b.placedAt) - new Date(a.placedAt)
  );
  res.json({ success: true, data: allOrders, total: allOrders.length });
});

module.exports = router;
