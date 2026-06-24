const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const db         = require('../db/connection');
const { requireAdmin } = require('../middleware/auth');
const router     = express.Router();

// Image upload config
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../public/uploads'),
    filename:    (req, file, cb) =>
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) =>
        cb(null, ['.jpg','.jpeg','.png','.webp'].includes(
            path.extname(file.originalname).toLowerCase())),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(requireAdmin);   // all admin routes require admin session

// ── Dashboard stats ──────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [[orders]]    = await db.execute(
            `SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS revenue FROM orders`);
        const [[customers]] = await db.execute(
            `SELECT COUNT(*) AS total FROM users WHERE role = 'customer'`);
        const [[low]]       = await db.execute(
            `SELECT COUNT(*) AS total FROM products WHERE stock_quantity < 20`);
        const [recent]      = await db.execute(
            `SELECT o.id, o.total_amount, o.status, o.payment_status, o.created_at,
                    COALESCE(u.full_name, o.guest_name) AS customer_name
             FROM orders o LEFT JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC LIMIT 5`);
        res.json({
            total_orders:    orders.total,
            total_revenue:   parseFloat(orders.revenue).toFixed(2),
            total_customers: customers.total,
            low_stock_count: low.total,
            recent_orders:   recent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// ── Products ─────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM products ORDER BY name');
    res.json({ products: rows });
});

router.post('/products', upload.single('image'), async (req, res) => {
    const { name, price, stock_quantity, description } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    try {
        const [r] = await db.execute(
            'INSERT INTO products (name, price, stock_quantity, description, image) VALUES (?,?,?,?,?)',
            [name, parseFloat(price), parseInt(stock_quantity)||0, description||null, req.file?.filename||null]);
        res.json({ success: true, id: r.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Product name already exists' });
        res.status(500).json({ error: 'Failed to add product' });
    }
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
    const { name, price, stock_quantity, description } = req.body;
    try {
        const fields = req.file
            ? ['name=?','price=?','stock_quantity=?','description=?','image=?']
            : ['name=?','price=?','stock_quantity=?','description=?'];
        const values = req.file
            ? [name, parseFloat(price), parseInt(stock_quantity), description||null, req.file.filename, req.params.id]
            : [name, parseFloat(price), parseInt(stock_quantity), description||null, req.params.id];
        await db.execute(`UPDATE products SET ${fields.join(',')} WHERE id=?`, values);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM products WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2')
            return res.status(409).json({ error: 'Cannot delete — product has linked orders or suppliers' });
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ── Suppliers ────────────────────────────────────────────────────
router.get('/suppliers', async (req, res) => {
    const [rows] = await db.execute(
        `SELECT s.*, p.name AS product_name
         FROM suppliers s JOIN products p ON p.id = s.product_id
         ORDER BY s.full_name`);
    res.json({ suppliers: rows });
});

router.post('/suppliers', async (req, res) => {
    const { full_name, address, email, phone, product_id } = req.body;
    if (!full_name||!address||!email||!phone||!product_id)
        return res.status(400).json({ error: 'All fields are required' });
    try {
        const [r] = await db.execute(
            'INSERT INTO suppliers (full_name,address,email,phone,product_id) VALUES (?,?,?,?,?)',
            [full_name, address, email, phone, product_id]);
        res.json({ success: true, id: r.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already registered' });
        res.status(500).json({ error: 'Failed to add supplier' });
    }
});

router.put('/suppliers/:id', async (req, res) => {
    const { full_name, address, email, phone, product_id } = req.body;
    try {
        await db.execute(
            'UPDATE suppliers SET full_name=?,address=?,email=?,phone=?,product_id=? WHERE id=?',
            [full_name, address, email, phone, product_id, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

router.delete('/suppliers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM suppliers WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2')
            return res.status(409).json({ error: 'Cannot delete — supplier has delivery records' });
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

// ── Inventory ────────────────────────────────────────────────────
router.get('/inventory', async (req, res) => {
    try {
        const [summary] = await db.execute(`
            SELECT p.id, p.name, p.price, p.stock_quantity AS total_available,
                   COALESCE(inv_agg.total_received, 0)          AS total_received,
                   COALESCE(sold_agg.total_sold, 0)             AS total_sold,
                   COALESCE(sold_agg.total_sales_amount, 0)     AS total_sales_amount
            FROM products p
            LEFT JOIN (
                SELECT product_id, SUM(quantity_received) AS total_received
                FROM inventory GROUP BY product_id
            ) inv_agg ON inv_agg.product_id = p.id
            LEFT JOIN (
                SELECT oi.product_id,
                       SUM(oi.quantity)                AS total_sold,
                       SUM(oi.quantity * oi.unit_price) AS total_sales_amount
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status != 'cancelled'
                GROUP BY oi.product_id
            ) sold_agg ON sold_agg.product_id = p.id
            ORDER BY p.name`);

        const [deliveries] = await db.execute(`
            SELECT i.*, s.full_name AS supplier_name, p.name AS product_name
            FROM inventory i
            JOIN suppliers s ON s.id = i.supplier_id
            JOIN products  p ON p.id = i.product_id
            ORDER BY i.date_received DESC LIMIT 50`);

        res.json({ summary, deliveries });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load inventory' });
    }
});

router.post('/inventory', async (req, res) => {
    const { supplier_id, product_id, quantity_received, unit_cost, date_received, notes } = req.body;
    if (!supplier_id||!product_id||!quantity_received||!unit_cost||!date_received)
        return res.status(400).json({ error: 'All required fields must be filled' });
    try {
        await db.execute(
            'INSERT INTO inventory (supplier_id,product_id,quantity_received,unit_cost,date_received,notes) VALUES (?,?,?,?,?,?)',
            [supplier_id, product_id, parseInt(quantity_received), parseFloat(unit_cost), date_received, notes||null]);
        await db.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=?',
            [parseInt(quantity_received), product_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record delivery' });
    }
});

// ── Invoices ─────────────────────────────────────────────────────
router.get('/invoices', async (req, res) => {
    try {
        const [invoices] = await db.execute(`
            SELECT inv.*, s.full_name AS supplier_name, p.name AS product_name
            FROM invoices inv
            JOIN suppliers s ON s.id = inv.supplier_id
            JOIN products  p ON p.id = s.product_id
            ORDER BY inv.invoice_month DESC, s.full_name`);
        res.json({ invoices });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load invoices' });
    }
});

router.post('/invoices/generate', async (req, res) => {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'Month is required (YYYY-MM)' });
    try {
        const [rows] = await db.execute(`
            SELECT s.id AS supplier_id,
                   SUM(i.quantity_received)              AS total_items,
                   SUM(i.quantity_received * i.unit_cost) AS total_amount
            FROM suppliers s
            JOIN inventory i ON i.supplier_id = s.id
            WHERE DATE_FORMAT(i.date_received, '%Y-%m') = ?
            GROUP BY s.id`, [month]);

        if (!rows.length)
            return res.status(404).json({ error: `No supplier deliveries recorded for ${month}` });

        for (const row of rows) {
            const [existing] = await db.execute(
                'SELECT id FROM invoices WHERE supplier_id=? AND invoice_month=?',
                [row.supplier_id, month]);
            if (existing.length) {
                await db.execute(
                    'UPDATE invoices SET total_items=?, total_amount=? WHERE id=?',
                    [row.total_items, parseFloat(row.total_amount).toFixed(2), existing[0].id]);
            } else {
                await db.execute(
                    'INSERT INTO invoices (supplier_id,invoice_month,total_items,total_amount) VALUES (?,?,?,?)',
                    [row.supplier_id, month, row.total_items, parseFloat(row.total_amount).toFixed(2)]);
            }
        }
        res.json({ success: true, count: rows.length, message: `${rows.length} invoice(s) generated for ${month}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate invoices' });
    }
});

router.put('/invoices/:id/pay', async (req, res) => {
    try {
        await db.execute('UPDATE invoices SET paid=TRUE, paid_at=NOW() WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark as paid' });
    }
});

// ── Orders (admin view) ──────────────────────────────────────────
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, COALESCE(u.full_name, o.guest_name)  AS customer_name,
                        COALESCE(u.email,     o.guest_email) AS customer_email
            FROM orders o LEFT JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC`);
        for (const o of orders) {
            const [items] = await db.execute(
                `SELECT p.name, oi.quantity, oi.unit_price
                 FROM order_items oi JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = ?`, [o.id]);
            o.items = items;
        }
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

router.put('/orders/:id/status', async (req, res) => {
    const valid = ['pending','processing','dispatched','delivered','cancelled'];
    if (!valid.includes(req.body.status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        await db.execute('UPDATE orders SET status=? WHERE id=?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
