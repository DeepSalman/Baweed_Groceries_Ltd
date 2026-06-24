const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db/connection');
const router  = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password)
        return res.status(400).json({ error: 'Full name, email and password are required' });

    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0)
            return res.status(409).json({ error: 'An account with this email already exists' });

        const hashed = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email.toLowerCase(), hashed, phone || null, 'customer']
        );

        req.session.user = { id: result.insertId, full_name, email: email.toLowerCase(), role: 'customer' };
        res.json({ success: true, redirect: '/products.html' });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (rows.length === 0)
            return res.status(401).json({ error: 'Invalid email or password' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ error: 'Invalid email or password' });

        req.session.user = {
            id:        user.id,
            full_name: user.full_name,
            email:     user.email,
            role:      user.role
        };

        const redirect = user.role === 'admin' ? '/admin/dashboard.html' : '/products.html';
        res.json({ success: true, redirect, role: user.role });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// GET /api/auth/me  — used by pages to check if user is logged in
router.get('/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ user: null });
    res.json({ user: req.session.user });
});

module.exports = router;
