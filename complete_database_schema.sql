-- ============================================
-- COMPLETE DATABASE SCHEMA FOR BANKSPHERE
-- Deploy this to Render MySQL Database
-- ============================================

-- Use the database
USE banksphere;

-- Drop existing tables if they exist (for clean install)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS biometric_audit_log;
DROP TABLE IF EXISTS biometric_data;
DROP TABLE IF EXISTS budget_alerts;
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS expense_categorization_log;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS crypto_activity_log;
DROP TABLE IF EXISTS crypto_transactions;
DROP TABLE IF EXISTS crypto_wallets;
DROP TABLE IF EXISTS portfolio_rebalance_log;
DROP TABLE IF EXISTS investment_recommendations;
DROP TABLE IF EXISTS investment_plans;
DROP TABLE IF EXISTS fraud_alerts;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS loan_payments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- CORE BANKING TABLES
-- ============================================

-- Users table (authentication)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('customer', 'admin', 'manager') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'USA',
    ssn VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_customers_user (user_id),
    INDEX idx_customers_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Accounts table
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type ENUM('checking', 'savings', 'premium', 'business') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('active', 'inactive', 'frozen', 'closed') DEFAULT 'active',
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    overdraft_limit DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_accounts_customer (customer_id),
    INDEX idx_accounts_number (account_number),
    INDEX idx_accounts_status (status),
    INDEX idx_accounts_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    account_id INT NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    category VARCHAR(50) NULL,
    auto_categorized BOOLEAN DEFAULT FALSE,
    categorized_at TIMESTAMP NULL,
    reference_number VARCHAR(50),
    to_account_id INT NULL,
    from_account_id INT NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_transactions_account (account_id),
    INDEX idx_transactions_type (transaction_type),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_created (created_at),
    INDEX idx_transactions_category (category),
    INDEX idx_transactions_categorized (auto_categorized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loans table
CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    loan_type ENUM('personal', 'home', 'auto', 'business', 'student') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INT NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'active', 'paid_off', 'defaulted') DEFAULT 'pending',
    purpose TEXT,
    collateral TEXT,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_loans_customer (customer_id),
    INDEX idx_loans_status (status),
    INDEX idx_loans_type (loan_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loan Payments table
CREATE TABLE loan_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('scheduled', 'paid', 'late', 'missed') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    INDEX idx_loan_payments_loan (loan_id),
    INDEX idx_loan_payments_date (payment_date),
    INDEX idx_loan_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FRAUD DETECTION SYSTEM
-- ============================================

CREATE TABLE fraud_alerts (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36),
    account_id INT,
    risk_score INT,
    risk_factors JSON,
    status ENUM('pending', 'reviewed', 'false_positive', 'confirmed') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_fraud_alerts_account (account_id),
    INDEX idx_fraud_alerts_status (status),
    INDEX idx_fraud_alerts_created (created_at),
    INDEX idx_fraud_alerts_risk (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BIOMETRIC AUTHENTICATION
-- ============================================

CREATE TABLE biometric_data (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    biometric_type ENUM('fingerprint', 'face', 'voice') NOT NULL,
    encrypted_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_biometric (user_id, biometric_type),
    INDEX idx_biometric_user (user_id),
    INDEX idx_biometric_type (biometric_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE biometric_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('REGISTER', 'AUTHENTICATE', 'DEACTIVATE') NOT NULL,
    biometric_type ENUM('fingerprint', 'face', 'voice') NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_biometric_audit_user (user_id),
    INDEX idx_biometric_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INVESTMENT ADVISORY SYSTEM
-- ============================================

CREATE TABLE investment_plans (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    risk_tolerance ENUM('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE') NOT NULL,
    time_horizon INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_investment_plans_customer (customer_id),
    INDEX idx_investment_plans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE investment_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL,
    investment_type ENUM('stocks', 'bonds', 'cash', 'mutual_funds', 'etfs', 'real_estate') NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    recommended_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NULL,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES investment_plans(id) ON DELETE CASCADE,
    INDEX idx_investment_recs_plan (plan_id),
    CONSTRAINT chk_allocation_percentage CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE portfolio_rebalance_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    reason TEXT NOT NULL,
    actions JSON NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_rebalance_log_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CRYPTOCURRENCY SYSTEM
-- ============================================

CREATE TABLE crypto_wallets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    crypto_type ENUM('BTC', 'ETH', 'LTC', 'ADA', 'DOT') NOT NULL,
    wallet_address VARCHAR(100) NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    status ENUM('active', 'inactive', 'frozen') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_crypto (customer_id, crypto_type),
    INDEX idx_crypto_wallets_customer (customer_id),
    INDEX idx_crypto_wallets_type (crypto_type),
    CONSTRAINT chk_crypto_balance CHECK (balance >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE crypto_transactions (
    id VARCHAR(36) PRIMARY KEY,
    wallet_id VARCHAR(36) NOT NULL,
    transaction_type ENUM('buy', 'sell', 'transfer', 'receive') NOT NULL,
    crypto_amount DECIMAL(20,8) NOT NULL,
    usd_amount DECIMAL(15,2) NULL,
    exchange_rate DECIMAL(15,2) NULL,
    network_fee DECIMAL(20,8) NULL,
    to_address VARCHAR(100) NULL,
    from_address VARCHAR(100) NULL,
    blockchain_tx_hash VARCHAR(100) NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (wallet_id) REFERENCES crypto_wallets(id) ON DELETE CASCADE,
    INDEX idx_crypto_tx_wallet (wallet_id),
    INDEX idx_crypto_tx_status (status),
    INDEX idx_crypto_tx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE crypto_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    action ENUM('WALLET_CREATED', 'BUY', 'SELL', 'TRANSFER', 'RECEIVE') NOT NULL,
    crypto_type ENUM('BTC', 'ETH', 'LTC', 'ADA', 'DOT') NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    address VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_crypto_activity_customer (customer_id),
    INDEX idx_crypto_activity_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AI CHATBOT
-- ============================================

CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    sender ENUM('user', 'bot') NOT NULL,
    intent VARCHAR(50) NULL,
    confidence DECIMAL(3,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_chat_messages_customer (customer_id),
    INDEX idx_chat_messages_session (session_id),
    INDEX idx_chat_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- EXPENSE TRACKING AND BUDGETING
-- ============================================

CREATE TABLE expense_categorization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    predicted_category VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    description_analyzed TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_cat_log_transaction (transaction_id),
    INDEX idx_expense_cat_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE budgets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    period ENUM('weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_budgets_customer (customer_id),
    INDEX idx_budgets_status (status),
    INDEX idx_budgets_period (start_date, end_date),
    CONSTRAINT chk_budget_dates CHECK (end_date > start_date),
    CONSTRAINT chk_budget_amount CHECK (total_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE budget_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    INDEX idx_budget_categories_budget (budget_id),
    INDEX idx_budget_categories_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE budget_alerts (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    budget_id VARCHAR(36) NOT NULL,
    alert_type ENUM('percentage', 'amount', 'category') NOT NULL,
    threshold_percentage DECIMAL(5,2) NULL,
    threshold_amount DECIMAL(15,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    INDEX idx_budget_alerts_customer (customer_id),
    INDEX idx_budget_alerts_budget (budget_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SUPPORT SYSTEM
-- ============================================

CREATE TABLE support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_support_tickets_customer (customer_id),
    INDEX idx_support_tickets_status (status),
    INDEX idx_support_tickets_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(50) NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_log_user (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, email, role) VALUES
('admin', '$2b$10$rKvVLZ5fHvLZqQqQqQqQqOqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'admin@banksphere.com', 'admin');

-- Insert default customer user (password: password123)
INSERT INTO users (username, password, email, role) VALUES
('john_doe', '$2b$10$rKvVLZ5fHvLZqQqQqQqQqOqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'john@example.com', 'customer');

-- Insert customer details
INSERT INTO customers (user_id, first_name, last_name, date_of_birth, phone, address, city, state, zip_code, ssn) VALUES
(2, 'John', 'Doe', '1990-01-15', '555-0123', '123 Main St', 'New York', 'NY', '10001', '123-45-6789');

-- Insert sample accounts
INSERT INTO accounts (customer_id, account_number, account_type, balance, status) VALUES
(1, 'ACC1001', 'checking', 5000.00, 'active'),
(1, 'ACC1002', 'savings', 15000.00, 'active'),
(1, 'ACC1003', 'premium', 50000.00, 'active');

-- ============================================
-- CREATE VIEWS
-- ============================================

CREATE OR REPLACE VIEW customer_portfolio_summary AS
SELECT 
    c.id as customer_id,
    c.first_name,
    c.last_name,
    COUNT(DISTINCT a.id) as total_accounts,
    COALESCE(SUM(a.balance), 0) as total_balance,
    COUNT(DISTINCT cw.id) as crypto_wallets,
    COUNT(DISTINCT ip.id) as investment_plans,
    COUNT(DISTINCT b.id) as active_budgets
FROM customers c
LEFT JOIN accounts a ON c.id = a.customer_id AND a.status = 'active'
LEFT JOIN crypto_wallets cw ON c.id = cw.customer_id AND cw.status = 'active'
LEFT JOIN investment_plans ip ON c.id = ip.customer_id AND ip.status = 'active'
LEFT JOIN budgets b ON c.id = b.customer_id AND b.status = 'active'
GROUP BY c.id, c.first_name, c.last_name;

-- ============================================
-- SCHEMA CREATION COMPLETE
-- ============================================

SELECT 'Database schema created successfully!' as status;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'banksphere';
