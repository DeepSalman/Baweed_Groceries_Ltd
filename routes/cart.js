const express = require('express');
const db      = require('../db/connection');
const router  = express.Router();

function getCart(req) {
    if (!req.session.cart) req.session.cart = [];
    return req.session.cart;
}

function cartTotal(cart) {
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2);
}

// GET /api/cart
router.get('/', (req, res) => {
    const cart = getCart(req);
    res.json({ items: cart, total: cartTotal(cart) });
});

// POST /api/cart/add
router.post('/add', async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'Product ID required' });

    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [product_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const product = rows[0];
        if (product.stock_quantity === 0)
            return res.status(400).json({ error: 'Product is out of stock' });

        const cart   = getCart(req);
        const qty    = parseInt(quantity);
        const index  = cart.findIndex(i => i.product_id === parseInt(product_id));

        if (index > -1) {
            const newQty = cart[index].quantity + qty;
            if (newQty > product.stock_quantity)
                return res.status(400).json({ error: `Only ${product.stock_quantity} units in stock` });
            cart[index].quantity = newQty;
        } else {
            if (qty > product.stock_quantity)
                return res.status(400).json({ error: `Only ${product.stock_quantity} units in stock` });
            cart.push({
                product_id: product.id,
                name:       product.name,
                price:      parseFloat(product.price),
                quantity:   qty,
                image:      product.image || null
            });
        }

        res.json({ success: true, items: cart, total: cartTotal(cart), message: `${product.name} added to cart` });

    } catch (err) {
        console.error('Cart add error:', err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// PUT /api/cart/update  { product_id, quantity }
router.put('/update', (req, res) => {
    const { product_id, quantity } = req.body;
    if (!product_id || quantity === undefined)
        return res.status(400).json({ error: 'product_id and quantity are required' });

    const cart  = getCart(req);
    const index = cart.findIndex(i => i.product_id === parseInt(product_id));
    if (index === -1) return res.status(404).json({ error: 'Item not in cart' });

    if (parseInt(quantity) <= 0) {
        cart.splice(index, 1);
    } else {
        cart[index].quantity = parseInt(quantity);
    }

    res.json({ success: true, items: cart, total: cartTotal(cart) });
});

// DELETE /api/cart/remove/:product_id
router.delete('/remove/:product_id', (req, res) => {
    const cart  = getCart(req);
    const index = cart.findIndex(i => i.product_id === parseInt(req.params.product_id));
    if (index === -1) return res.status(404).json({ error: 'Item not in cart' });

    cart.splice(index, 1);
    res.json({ success: true, items: cart, total: cartTotal(cart) });
});

// DELETE /api/cart/clear
router.delete('/clear', (req, res) => {
    req.session.cart = [];
    res.json({ success: true });
});

module.exports = router;
