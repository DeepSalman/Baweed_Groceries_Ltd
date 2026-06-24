require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function init() {
    let connection;
    try {
        // Connect without a database first so we can create it
        connection = await mysql.createConnection({
            host:               process.env.DB_HOST     || 'localhost',
            user:               process.env.DB_USER     || 'root',
            password:           process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('Connected to MySQL...');

        await connection.query('CREATE DATABASE IF NOT EXISTS baweed_groceries');
        await connection.query('USE baweed_groceries');
        console.log('Database ready...');

        // Create all tables
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await connection.query(schema);
        console.log('Tables created...');

        // Insert sample data (products, suppliers, inventory, cards)
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        await connection.query(seed);
        console.log('Sample data inserted...');

        // Create admin account with hashed password
        const adminHash = await bcrypt.hash('admin123', 10);
        await connection.execute(
            'INSERT IGNORE INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            ['Admin User', 'admin@baweed.com', adminHash, '07000000001', 'admin']
        );

        // Create test customer account with hashed password
        const customerHash = await bcrypt.hash('customer123', 10);
        await connection.execute(
            'INSERT IGNORE INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            ['Test Customer', 'customer@test.com', customerHash, '07000000002', 'customer']
        );

        console.log('User accounts created...');
        console.log('\n=============================');
        console.log('  Setup complete!');
        console.log('=============================');
        console.log('  Admin:    admin@baweed.com');
        console.log('  Password: admin123');
        console.log('-----------------------------');
        console.log('  Customer: customer@test.com');
        console.log('  Password: customer123');
        console.log('=============================\n');

    } catch (err) {
        console.error('\nSetup failed:', err.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

init();
