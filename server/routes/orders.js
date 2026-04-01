require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const uuidv4 = crypto.randomUUID;
const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Automatically create the table if it does not exist
  pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      items JSONB NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL,
      tax NUMERIC(10, 2) NOT NULL,
      delivery NUMERIC(10, 2) NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20),
      customer_address TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'confirmed',
      placed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      estimated_delivery TIMESTAMP WITH TIME ZONE
    );
  `).then(() => console.log('✅ PostgreSQL: Orders table initialized.'))
    .catch(err => console.error('❌ PostgreSQL Initialization Error:', err));
} else {
  console.warn('⚠️ No DATABASE_URL provided. App will use memory store instead of PostgreSQL.');
}

// In-memory fallback if no DB
const memoryOrders = new Map();

// POST /api/orders — place a new order
router.post('/', async (req, res) => {
  const { cartId, items, totals, customer } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cannot place an empty order' });
  }

  if (!customer || !customer.name || !customer.email || !customer.address) {
    return res.status(400).json({ success: false, message: 'Customer details are required (name, email, address)' });
  }

  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const placedAt = new Date();
  const estimatedDelivery = new Date(placedAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours

  try {
    if (pool) {
      // Save to Neon PostgreSQL
      const query = `
        INSERT INTO orders (
          id, order_number, items, subtotal, tax, delivery, total,
          customer_name, customer_email, customer_phone, customer_address,
          status, placed_at, estimated_delivery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;
      const values = [
        orderId, orderNumber, JSON.stringify(items), totals.subtotal, totals.tax,
        totals.delivery, totals.total, customer.name, customer.email, customer.phone || '',
        customer.address, 'confirmed', placedAt, estimatedDelivery
      ];

      const result = await pool.query(query, values);
      return res.status(201).json({
        success: true,
        data: result.rows[0],
        message: `Order ${orderNumber} placed successfully in PostgreSQL!`
      });
    } else {
      // Fallback to memory
      const order = {
        id: orderId,
        orderNumber,
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
        placedAt: placedAt.toISOString(),
        estimatedDelivery: estimatedDelivery.toISOString()
      };
      
      memoryOrders.set(order.id, order);
      return res.status(201).json({
        success: true,
        data: order,
        message: `Order ${order.orderNumber} placed successfully in memory!`
      });
    }
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ success: false, message: 'Failed to process order.' });
  }
});

// GET /api/orders/:id — get order details
router.get('/:id', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const order = memoryOrders.get(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, data: order });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/orders — list all orders (for demo purposes)
router.get('/', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT * FROM orders ORDER BY placed_at DESC');
      return res.json({ success: true, data: result.rows, total: result.rows.length });
    } else {
      const allOrders = Array.from(memoryOrders.values()).sort(
        (a, b) => new Date(b.placedAt) - new Date(a.placedAt)
      );
      return res.json({ success: true, data: allOrders, total: allOrders.length });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;
