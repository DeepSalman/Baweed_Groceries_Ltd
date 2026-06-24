-- ============================================================
-- Baweed Groceries Ltd - Sample Data
-- ============================================================

-- Products (8 vegetables)
INSERT IGNORE INTO products (name, price, stock_quantity, description) VALUES
('Tomatoes',    1.50, 0, 'Fresh ripe tomatoes, sold per kg'),
('Onions',      0.80, 0, 'Brown onions, sold per kg'),
('Red Peppers', 2.00, 0, 'Sweet red peppers, sold per kg'),
('Carrots',     0.70, 0, 'Fresh carrots, sold per kg'),
('Garlic',      3.00, 0, 'Garlic bulbs, sold per 100g'),
('Broccoli',    1.20, 0, 'Fresh broccoli, sold per head'),
('Cucumber',    0.90, 0, 'Long cucumbers, sold each'),
('Potatoes',    0.60, 0, 'White potatoes, sold per kg');

-- Suppliers (one per product, product_id matches insertion order above)
INSERT IGNORE INTO suppliers (full_name, address, email, phone, product_id) VALUES
('Fresh Farm Ltd',      '12 Market Lane, London, E1 2AB',        'contact@freshfarm.co.uk',    '02012345678', 1),
('Root Veg Co Ltd',     '45 North Road, Birmingham, B2 5CD',     'info@rootveg.co.uk',         '01214567890', 2),
('Pepper Palace Ltd',   '8 South Street, Manchester, M1 3EF',    'orders@pepperpalace.co.uk',  '01612345678', 3),
('Garden Fresh Ltd',    '33 West Ave, Leeds, LS1 6GH',           'supply@gardenfresh.co.uk',   '01132345678', 4),
('Herb World Ltd',      '21 East Close, Bristol, BS1 9IJ',       'hello@herbworld.co.uk',      '01172345678', 5),
('Blossom Greens Ltd',  '67 Oak Drive, Sheffield, S2 4KL',       'sales@blossomgreens.co.uk',  '01142345678', 6),
('Valley Greens Co',    '5 River Road, Liverpool, L1 8MN',       'info@valleygreens.co.uk',    '01512345678', 7),
('Spud Supplies Ltd',   '90 Hill View, Nottingham, NG1 2OP',     'orders@spudsupplies.co.uk',  '01152345678', 8);

-- Initial inventory deliveries (to give products some stock)
INSERT IGNORE INTO inventory (supplier_id, product_id, quantity_received, unit_cost, date_received, notes) VALUES
(1, 1, 200, 0.80, '2024-01-10', 'First delivery of tomatoes'),
(2, 2, 300, 0.40, '2024-01-10', 'First delivery of onions'),
(3, 3, 150, 1.10, '2024-01-11', 'First delivery of red peppers'),
(4, 4, 400, 0.35, '2024-01-11', 'First delivery of carrots'),
(5, 5, 120, 1.80, '2024-01-12', 'First delivery of garlic'),
(6, 6, 180, 0.65, '2024-01-12', 'First delivery of broccoli'),
(7, 7, 250, 0.45, '2024-01-13', 'First delivery of cucumbers'),
(8, 8, 500, 0.30, '2024-01-13', 'First delivery of potatoes');

-- Update product stock to match inventory received
UPDATE products SET stock_quantity = 200 WHERE name = 'Tomatoes';
UPDATE products SET stock_quantity = 300 WHERE name = 'Onions';
UPDATE products SET stock_quantity = 150 WHERE name = 'Red Peppers';
UPDATE products SET stock_quantity = 400 WHERE name = 'Carrots';
UPDATE products SET stock_quantity = 120 WHERE name = 'Garlic';
UPDATE products SET stock_quantity = 180 WHERE name = 'Broccoli';
UPDATE products SET stock_quantity = 250 WHERE name = 'Cucumber';
UPDATE products SET stock_quantity = 500 WHERE name = 'Potatoes';

-- Simulated credit/debit cards for payment testing
INSERT IGNORE INTO cards (card_holder, card_number, expiry_month, expiry_year, cvv, balance, card_type) VALUES
('John Smith',    '4111111111111111', 12, 2027, '123', 2000.00, 'debit'),
('Sarah Johnson', '4222222222222222',  6, 2026, '456', 1500.00, 'credit'),
('Michael Brown', '5333333333333333',  9, 2028, '789', 3000.00, 'credit'),
('Emily Davis',   '4444444444444444',  3, 2027, '321',  500.00, 'debit'),
('James Wilson',  '5555555555555555', 11, 2026, '654', 1000.00, 'debit');
