const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load products data
const productsPath = path.join(__dirname, '..', 'data', 'products.json');
let products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

// GET /api/products — list all products, with optional category & search filters
router.get('/', (req, res) => {
  let result = [...products];
  const { category, search, sort } = req.query;

  if (category && category !== 'All') {
    result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({ success: true, data: result, total: result.length });
});

// GET /api/products/categories — list unique categories
router.get('/categories', (req, res) => {
  const categories = ['All', ...new Set(products.map(p => p.category))];
  res.json({ success: true, data: categories });
});

// GET /api/products/:id — single product details
router.get('/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

module.exports = router;
