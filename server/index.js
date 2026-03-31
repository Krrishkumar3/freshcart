const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get('{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n🥬 FreshCart Grocery API running at http://localhost:${PORT}`);
  console.log(`📦 API endpoints:`);
  console.log(`   GET    /api/products          — List products`);
  console.log(`   GET    /api/products/categories — List categories`);
  console.log(`   GET    /api/products/:id       — Get product`);
  console.log(`   GET    /api/cart/:cartId       — Get cart`);
  console.log(`   POST   /api/cart/:cartId/add   — Add to cart`);
  console.log(`   PUT    /api/cart/:cartId/update — Update quantity`);
  console.log(`   DELETE /api/cart/:cartId/remove/:productId — Remove item`);
  console.log(`   POST   /api/orders             — Place order`);
  console.log(`   GET    /api/orders/:id         — Get order\n`);
});
