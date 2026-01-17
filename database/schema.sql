-- Tharaka Cafeteria Database Schema
-- MySQL Database Setup

CREATE DATABASE IF NOT EXISTS tharaka_cafeteria;
USE tharaka_cafeteria;

-- Food Items Table
CREATE TABLE food_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    available INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    category ENUM('breakfast', 'lunch', 'snacks') NOT NULL,
    total_orders INT DEFAULT 0,
    calories INT DEFAULT NULL,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    spicy_level TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_available (available)
);

-- Food Item Tags Table (Many-to-Many relationship)
CREATE TABLE food_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    food_item_id INT NOT NULL,
    tag VARCHAR(100) NOT NULL,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_food_tag (food_item_id, tag),
    INDEX idx_tag (tag)
);

-- Admin Accounts Table
CREATE TABLE admin_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Staff', 'Manager', 'Super Admin') NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_active (active)
);

-- Orders Table
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'mpesa') NOT NULL,
    mpesa_phone VARCHAR(20) NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_number (order_number),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
);

-- Order Items Table
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    food_item_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL, -- Denormalized for historical data
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id),
    INDEX idx_order_id (order_id),
    INDEX idx_food_item_id (food_item_id)
);

-- User Preferences Table
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_identifier VARCHAR(255) NOT NULL, -- Could be IP, session ID, etc.
    dietary_preferences JSON,
    price_range_min DECIMAL(10, 2) DEFAULT NULL,
    price_range_max DECIMAL(10, 2) DEFAULT NULL,
    favorite_categories JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_identifier),
    INDEX idx_user_identifier (user_identifier)
);

-- Recommendation Metrics Table
CREATE TABLE recommendation_metrics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    strategy ENUM('collaborative', 'contentBased', 'popularity') NOT NULL,
    food_item_id INT NOT NULL,
    user_identifier VARCHAR(255) NULL,
    action ENUM('shown', 'clicked', 'ordered') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id),
    INDEX idx_strategy (strategy),
    INDEX idx_food_item_id (food_item_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Reviews Table
CREATE TABLE reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    food_item_id INT NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE,
    INDEX idx_food_item_id (food_item_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
);

-- Order Counter Table (for generating order numbers)
CREATE TABLE order_counter (
    id INT PRIMARY KEY DEFAULT 1,
    counter INT NOT NULL DEFAULT 1000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial counter value
INSERT INTO order_counter (counter) VALUES (1017) ON DUPLICATE KEY UPDATE counter = 1017;