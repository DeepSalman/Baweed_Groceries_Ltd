require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'baweed_groceries',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promisify so we can use async/await with SQL queries
const db = pool.promise();

module.exports = db;
