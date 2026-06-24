const express = require('express');
const db      = require('../db/connection');
const router  = express.Router();

// GET /api/products — all products, optional ?search=
router.get('/', async (req, res) => {
    const { search } = req.query;
    try {
        let rows;
        if (search) {
            [rows] = await db.execute(
                'SELECT * FROM products WHERE name LIKE ? ORDER BY name',
                [`%${search}%`]
            );
        } else {
            [rows] = await db.execute('SELECT * FROM products ORDER BY name');
        }
        res.json({ products: rows });
    } catch (err) {
        console.error('Products fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ product: rows[0] });
    } catch (err) {
        console.error('Product fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

module.exports = router;
