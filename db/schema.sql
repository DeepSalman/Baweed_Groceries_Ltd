-- ============================================================
-- Baweed Groceries Ltd - Database Schema
-- Normalized to 3NF
-- ============================================================

-- Users: customers and admin accounts
CREATE TABLE IF NOT EXISTS users (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    full_name    VARCHAR(100)  NOT NULL,
    email        VARCHAR(100)  NOT NULL UNIQUE,
    password     VARCHAR(255)  NOT NULL,
    phone        VARCHAR(20),
    role         ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products: vegetables available for sale
CREATE TABLE IF NOT EXISTS products (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    name           VARCHAR(100)   NOT NULL UNIQUE,
    price          DECIMAL(10,2)  NOT NULL,
    stock_quantity INT            NOT NULL DEFAULT 0,
    image          VARCHAR(255)   DEFAULT NULL,
    description    TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers: each supplier supplies exactly one product type
CREATE TABLE IF NOT EXISTS suppliers (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    full_name  VARCHAR(100)  NOT NULL,
    address    VARCHAR(255)  NOT NULL,
    email      VARCHAR(100)  NOT NULL UNIQUE,
    phone      VARCHAR(20)   NOT NULL,
    product_id INT           NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Inventory: records of goods received from each supplier
CREATE TABLE IF NOT EXISTS inventory (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id       INT           NOT NULL,
    product_id        INT           NOT NULL,
    quantity_received INT           NOT NULL,
    unit_cost         DECIMAL(10,2) NOT NULL,
    date_received     DATE          NOT NULL,
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE RESTRICT
);

-- Orders: customer purchase orders (registered or guest)
CREATE TABLE IF NOT EXISTS orders (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    user_id          INT           DEFAULT NULL,
    guest_name       VARCHAR(100)  DEFAULT NULL,
    guest_email      VARCHAR(100)  DEFAULT NULL,
    guest_phone      VARCHAR(20)   DEFAULT NULL,
    status           ENUM('pending','processing','dispatched','delivered','cancelled') NOT NULL DEFAULT 'pending',
    payment_method   ENUM('card_before','cash_after','card_after') NOT NULL,
    payment_status   ENUM('paid','unpaid') NOT NULL DEFAULT 'unpaid',
    shipping_address VARCHAR(255)  NOT NULL,
    shipping_city    VARCHAR(100)  NOT NULL,
    shipping_postcode VARCHAR(20)  NOT NULL,
    total_amount     DECIMAL(10,2) NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order Items: individual line items within an order
CREATE TABLE IF NOT EXISTS order_items (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    order_id   INT           NOT NULL,
    product_id INT           NOT NULL,
    quantity   INT           NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Cards: simulated credit/debit cards used for payment testing
CREATE TABLE IF NOT EXISTS cards (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    card_holder  VARCHAR(100)  NOT NULL,
    card_number  CHAR(16)      NOT NULL UNIQUE,
    expiry_month TINYINT UNSIGNED NOT NULL,
    expiry_year  YEAR          NOT NULL,
    cvv          CHAR(3)       NOT NULL,
    balance      DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    card_type    ENUM('credit','debit') NOT NULL
);

-- Payments: payment transaction records linked to orders
CREATE TABLE IF NOT EXISTS payments (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    order_id       INT           NOT NULL,
    card_id        INT           DEFAULT NULL,
    payment_method ENUM('card','cash') NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    status         ENUM('completed','pending','failed') NOT NULL DEFAULT 'pending',
    paid_at        TIMESTAMP     NULL DEFAULT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
    FOREIGN KEY (card_id)  REFERENCES cards(id)   ON DELETE SET NULL
);

-- Invoices: monthly invoices generated per supplier
CREATE TABLE IF NOT EXISTS invoices (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id   INT           NOT NULL,
    invoice_month CHAR(7)       NOT NULL,
    total_items   INT           NOT NULL,
    total_amount  DECIMAL(10,2) NOT NULL,
    paid          BOOLEAN       NOT NULL DEFAULT FALSE,
    paid_at       TIMESTAMP     NULL DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);
