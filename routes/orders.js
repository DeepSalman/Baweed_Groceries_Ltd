const express = require('express');
const db      = require('../db/connection');
const router  = express.Router();

// POST /api/orders — place a new order
router.post('/', async (req, res) => {
    const { shipping, payment } = req.body;
    const cart = req.session.cart || [];

    if (cart.length === 0)
        return res.status(400).json({ error: 'Your cart is empty' });

    if (!shipping?.full_name || !shipping?.email || !shipping?.address || !shipping?.city || !shipping?.postcode)
        return res.status(400).json({ error: 'All shipping fields are required' });

    if (!['card_before', 'cash_after', 'card_after'].includes(payment?.method))
        return res.status(400).json({ error: 'Please select a payment method' });

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const user  = req.session.user || null;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Verify stock for every cart item (lock rows to avoid race conditions)
        for (const item of cart) {
            const [rows] = await conn.execute(
                'SELECT stock_quantity, name FROM products WHERE id = ? FOR UPDATE',
                [item.product_id]
            );
            if (!rows.length || rows[0].stock_quantity < item.quantity)
                throw { status: 400, message: `${item.name} no longer has sufficient stock` };
        }

        // Insert order
        const [orderResult] = await conn.execute(
            `INSERT INTO orders
               (user_id, guest_name, guest_email, guest_phone,
                payment_method, payment_status,
                shipping_address, shipping_city, shipping_postcode, total_amount)
             VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?)`,
            [
                user ? user.id    : null,
                user ? null       : shipping.full_name,
                user ? null       : shipping.email,
                user ? null       : (shipping.phone || null),
                payment.method,
                shipping.address,
                shipping.city,
                shipping.postcode,
                total.toFixed(2)
            ]
        );

        const orderId = orderResult.insertId;

        // Insert line items + deduct stock
        for (const item of cart) {
            await conn.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            await conn.execute(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // --- Card payment (pay before delivery) ---
        if (payment.method === 'card_before') {
            if (!payment.card_number || !payment.cvv || !payment.expiry_month || !payment.expiry_year)
                throw { status: 400, message: 'Please enter your card details' };

            const [cards] = await conn.execute(
                `SELECT * FROM cards
                 WHERE card_number = ? AND cvv = ?
                   AND expiry_month = ? AND expiry_year = ?`,
                [payment.card_number.replace(/\s/g, ''), payment.cvv,
                 parseInt(payment.expiry_month), parseInt(payment.expiry_year)]
            );

            if (!cards.length)
                throw { status: 400, message: 'Card not recognised. Please check your details.' };

            const card = cards[0];
            if (parseFloat(card.balance) < parseFloat(total.toFixed(2)))
                throw { status: 400, message: `Insufficient balance. Card has £${parseFloat(card.balance).toFixed(2)} available.` };

            // Deduct balance
            await conn.execute('UPDATE cards SET balance = balance - ? WHERE id = ?',
                [total.toFixed(2), card.id]);

            // Record completed payment
            await conn.execute(
                `INSERT INTO payments (order_id, card_id, payment_method, amount, status, paid_at)
                 VALUES (?, ?, 'card', ?, 'completed', NOW())`,
                [orderId, card.id, total.toFixed(2)]
            );

            await conn.execute("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);

        } else {
            // Cash or card on delivery — record as pending
            const payMethod = payment.method === 'cash_after' ? 'cash' : 'card';
            await conn.execute(
                `INSERT INTO payments (order_id, card_id, payment_method, amount, status)
                 VALUES (?, NULL, ?, ?, 'pending')`,
                [orderId, payMethod, total.toFixed(2)]
            );
        }

        await conn.commit();
        req.session.cart = [];

        res.json({ success: true, order_id: orderId });

    } catch (err) {
        await conn.rollback();
        console.error('Order error:', err);
        if (err.status) return res.status(err.status).json({ error: err.message });
        res.status(500).json({ error: 'Failed to place order. Please try again.' });
    } finally {
        conn.release();
    }
});

// GET /api/orders/my/list — logged-in customer order history
router.get('/my/list', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
    try {
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user.id]
        );
        res.json({ orders });
    } catch (err) {
        console.error('My orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id — order detail for receipt
router.get('/:id', async (req, res) => {
    try {
        const [orders] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!orders.length) return res.status(404).json({ error: 'Order not found' });

        const order = orders[0];
        const user  = req.session.user;

        // Only allow: guest (no user_id on order), logged-in owner, or admin
        if (user && user.role !== 'admin' && order.user_id && order.user_id !== user.id)
            return res.status(403).json({ error: 'Access denied' });

        const [items] = await db.execute(
            `SELECT oi.*, p.name AS product_name
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?`,
            [req.params.id]
        );

        res.json({ order, items });
    } catch (err) {
        console.error('Order fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

module.exports = router;
