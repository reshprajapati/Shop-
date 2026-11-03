const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const storeInfo = {
  name: 'Sanjib kirana store',
  address: 'Suryabintyak, BKT',
  phone: '+977-98XXXXXXXX',
  email: 'hello@sanjibkirana.com',
  hours: '6:00 AM - 9:00 PM',
};

const categories = [
  { id: 'fresh', name: 'Fresh Fruits', icon: '🍎' },
  { id: 'veggies', name: 'Vegetables', icon: '🥬' },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'grains', name: 'Grains & Rice', icon: '🌾' },
  { id: 'snacks', name: 'Snacks', icon: '🥨' },
];

const products = [
  {
    id: 1,
    name: 'Organic Apples',
    category: 'fresh',
    price: 180,
    unit: '1kg',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80',
    tag: 'Popular',
    description: 'Crisp, juicy, and farm-fresh apples picked for the day.',
  },
  {
    id: 2,
    name: 'Spinach Leaves',
    category: 'veggies',
    price: 70,
    unit: '500g',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80',
    tag: 'Fresh',
    description: 'Green spinach bundles loaded with flavor and nutrients.',
  },
  {
    id: 3,
    name: 'Whole Milk',
    category: 'dairy',
    price: 95,
    unit: '1L',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
    tag: 'Best Seller',
    description: 'Pure farm milk for your morning coffee and desserts.',
  },
  {
    id: 4,
    name: 'Basmati Rice',
    category: 'grains',
    price: 260,
    unit: '5kg',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
    tag: 'Premium',
    description: 'Long-grain basmati rice known for aroma and texture.',
  },
  {
    id: 5,
    name: 'Masala Noodles',
    category: 'snacks',
    price: 120,
    unit: 'Pack',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80',
    tag: 'Quick Bite',
    description: 'Instant spicy noodles for a warm and savory snack.',
  },
  {
    id: 6,
    name: 'Bananas',
    category: 'fresh',
    price: 95,
    unit: '1 dozen',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80',
    tag: 'Daily Choice',
    description: 'Naturally sweet bananas perfect for breakfast or smoothies.',
  },
  {
    id: 7,
    name: 'Tomato Basket',
    category: 'veggies',
    price: 85,
    unit: '1kg',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=80',
    tag: 'Local',
    description: 'Fresh red tomatoes ideal for curries, salads, and juices.',
  },
  {
    id: 8,
    name: 'Paneer Cubes',
    category: 'dairy',
    price: 220,
    unit: '400g',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
    tag: 'House Favorite',
    description: 'Soft and rich paneer for curries, snacks, and grilling.',
  },
];

const dataDirectory = path.join(__dirname, 'data');
const productsFile = path.join(dataDirectory, 'products.json');
const ordersFile = path.join(dataDirectory, 'orders.json');

fs.mkdirSync(dataDirectory, { recursive: true });

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

let currentProducts = readJsonFile(productsFile, products);
let orders = readJsonFile(ordersFile, []);

function saveJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function secureEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return res.status(401).json({ error: 'Admin authentication is required.' });
  }

  try {
    req.admin = jwt.verify(token, secret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Admin session is invalid or has expired.' });
  }
}

app.get('/api/store', (req, res) => {
  res.json({ store: storeInfo, categories });
});

app.get('/api/products', (req, res) => {
  res.json({ products: currentProducts });
});

app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  const name = typeof customer?.name === 'string' ? customer.name.trim() : '';
  const phone = typeof customer?.phone === 'string' ? customer.phone.trim() : '';
  const address = typeof customer?.address === 'string' ? customer.address.trim() : '';

  if (!name || name.length > 100 || !phone || phone.length > 30 || !address || address.length > 300) {
    return res.status(400).json({ error: 'Enter a valid name, phone number, and delivery address.' });
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Your order must contain at least one item.' });
  }

  const orderItems = [];
  for (const item of items) {
    const product = currentProducts.find((entry) => entry.id === Number(item?.productId));
    const quantity = Number(item?.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'One or more order items are invalid.' });
    }

    orderItems.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      price: product.price,
      quantity,
    });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 999 ? 0 : 35;
  const order = {
    id: crypto.randomUUID(),
    customer: { name, phone, address },
    items: orderItems,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    status: 'Received',
    createdAt: new Date().toISOString(),
  };

  orders.unshift(order);
  saveJsonFile(ordersFile, orders);
  return res.status(201).json({ order: { id: order.id, total: order.total, status: order.status } });
});

app.post('/api/admin/login', (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminEmail || !adminPassword || !jwtSecret) {
    return res.status(503).json({ error: 'Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET.' });
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!secureEquals(email.toLowerCase(), adminEmail.trim().toLowerCase()) || !secureEquals(password, adminPassword)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const token = jwt.sign({ email: adminEmail }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  res.json({ orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const validStatuses = ['Received', 'Preparing', 'Out for delivery', 'Completed', 'Cancelled'];
  const { status } = req.body || {};

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Choose a valid order status.' });
  }

  const order = orders.find((entry) => entry.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  order.status = status;
  saveJsonFile(ordersFile, orders);
  return res.json({ order });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const { name, category, price, unit, description, image, tag } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedCategory = categories.find((entry) => entry.id === category)?.id;
  const normalizedPrice = Number(price);

  if (
    !normalizedName ||
    normalizedName.length > 100 ||
    !normalizedCategory ||
    !Number.isFinite(normalizedPrice) ||
    normalizedPrice <= 0 ||
    normalizedPrice > 1000000 ||
    typeof unit !== 'string' ||
    !unit.trim() ||
    typeof description !== 'string' ||
    !description.trim()
  ) {
    return res.status(400).json({ error: 'Enter a product name, category, positive price, unit, and description.' });
  }

  const product = {
    id: currentProducts.reduce((maxId, entry) => Math.max(maxId, Number(entry.id) || 0), 0) + 1,
    name: normalizedName,
    category: normalizedCategory,
    price: normalizedPrice,
    unit: unit.trim(),
    description: description.trim(),
    image:
      typeof image === 'string' && image.trim()
        ? image.trim()
        : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    tag: typeof tag === 'string' && tag.trim() ? tag.trim() : 'New',
    rating: 5,
  };

  currentProducts.push(product);
  saveJsonFile(productsFile, currentProducts);
  return res.status(201).json({ product });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const product = currentProducts.find((entry) => entry.id === Number(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const { name, category, price, unit, description } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedCategory = categories.find((entry) => entry.id === category)?.id;
  const normalizedPrice = Number(price);
  const normalizedUnit = typeof unit === 'string' ? unit.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';

  if (
    !normalizedName ||
    normalizedName.length > 100 ||
    !normalizedCategory ||
    !Number.isFinite(normalizedPrice) ||
    normalizedPrice <= 0 ||
    normalizedPrice > 1000000 ||
    !normalizedUnit ||
    normalizedUnit.length > 30 ||
    !normalizedDescription ||
    normalizedDescription.length > 300
  ) {
    return res.status(400).json({ error: 'Enter a product name, category, positive price, unit, and description.' });
  }

  Object.assign(product, {
    name: normalizedName,
    category: normalizedCategory,
    price: normalizedPrice,
    unit: normalizedUnit,
    description: normalizedDescription,
  });
  saveJsonFile(productsFile, currentProducts);
  return res.json({ product });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  const productIndex = currentProducts.findIndex((entry) => entry.id === productId);

  if (productIndex < 0) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  currentProducts.splice(productIndex, 1);
  saveJsonFile(productsFile, currentProducts);
  return res.status(204).end();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', store: storeInfo.name });
});

app.listen(PORT, () => {
  console.log(`Sanjib kirana store API running on http://localhost:${PORT}`);
});
