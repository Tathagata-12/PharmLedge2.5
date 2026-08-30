-- ============================================
-- PHARMLEDGE DATABASE SCHEMA
-- PostgreSQL
-- ============================================

-- =========================
-- USERS
-- =========================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================
-- VENDORS
-- =========================

CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,

    name VARCHAR(150) NOT NULL,
    contact VARCHAR(30),
    email VARCHAR(255),
    address TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vendor_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- MEDICINES
-- =========================

CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    vendor_id INTEGER,

    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    manufacturer VARCHAR(150),

    description TEXT,

    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    low_stock_threshold INTEGER NOT NULL DEFAULT 10,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_medicine_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_medicine_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE SET NULL
);


-- =========================
-- MEDICINE BATCHES
-- =========================

CREATE TABLE medicine_batches (
    id SERIAL PRIMARY KEY,
    medicine_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    batch_number VARCHAR(100) NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    manufacturing_date DATE,
    expiry_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_batch_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_batch_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_batch
        UNIQUE (user_id, batch_number)
);


-- =========================
-- SALES
-- =========================

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,

    customer_name VARCHAR(150),
    customer_phone VARCHAR(30),

    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

    payment_method VARCHAR(50) DEFAULT 'Cash',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================
-- SALE ITEMS
-- =========================

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,

    sale_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    batch_id INTEGER,

    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_sale_item_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sale_item_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_sale_item_batch
        FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(id)
        ON DELETE SET NULL
);


-- =========================
-- INDEXES
-- =========================

CREATE INDEX idx_medicines_user
ON medicines(user_id);

CREATE INDEX idx_batches_user
ON medicine_batches(user_id);

CREATE INDEX idx_batches_medicine
ON medicine_batches(medicine_id);

CREATE INDEX idx_batches_expiry
ON medicine_batches(expiry_date);

CREATE INDEX idx_vendors_user
ON vendors(user_id);

CREATE INDEX idx_sales_user
ON sales(user_id);

CREATE INDEX idx_sales_created
ON sales(created_at);

CREATE INDEX idx_sale_items_sale
ON sale_items(sale_id);