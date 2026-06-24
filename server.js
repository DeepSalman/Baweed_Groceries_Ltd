require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'baweed-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Routes will be mounted here in later steps
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/products', require('./routes/products'));
// app.use('/api/orders', require('./routes/orders'));
// app.use('/api/admin', require('./routes/admin'));

app.listen(PORT, () => {
    console.log(`Baweed Groceries running at http://localhost:${PORT}`);
});
