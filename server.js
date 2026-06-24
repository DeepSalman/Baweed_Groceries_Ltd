require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret:            process.env.SESSION_SECRET || 'baweed-secret',
    resave:            false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// API routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
// app.use('/api/orders',   require('./routes/orders'));    // Step 5
// app.use('/api/admin',    require('./routes/admin'));     // Step 6

// HTML page routes
app.get('/',                   (req, res) => res.sendFile(path.join(__dirname, 'views/index.html')));
app.get('/login.html',         (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));
app.get('/register.html',      (req, res) => res.sendFile(path.join(__dirname, 'views/register.html')));
app.get('/products.html',      (req, res) => res.sendFile(path.join(__dirname, 'views/products.html')));
app.get('/cart.html',          (req, res) => res.sendFile(path.join(__dirname, 'views/cart.html')));
app.get('/admin/login.html',   (req, res) => res.sendFile(path.join(__dirname, 'views/admin/login.html')));

app.listen(PORT, () => {
    console.log(`Baweed Groceries running at http://localhost:${PORT}`);
});
