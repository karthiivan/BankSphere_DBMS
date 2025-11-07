-- ============================================
-- COMPLETE DATABASE SCHEMA FOR BANKSPHERE
-- PostgreSQL Version for Render Deployment
-- ============================================

-- Drop existing tables if they exist (for clean install)
DROP TABLE IF EXISTS biometric_audit_log CASCADE;
DROP TABLE IF EXISTS biometric_data CASCADE;
DROP TABLE IF EXISTS budget_alerts CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS expense_categorization_log CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS crypto_activity_log CASCADE;
DROP TABLE IF EXISTS crypto_transactions CASCADE;
DROP TABLE IF EXISTS crypto_wallets CASCADE;
DROP TABLE IF EXISTS portfolio_rebalance_log CASCADE;
DROP TABLE IF EXISTS investment_recommendations CASCADE;
DROP TABLE IF EXISTS investment_plans CASCADE;
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;
DROP TYPE IF EXISTS account_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS loan_type CASCADE;
DROP TYPE IF EXISTS loan_status CASCADE;
DROP TYPE IF EXISTS loan_payment_status CASCADE;
DROP TYPE IF EXISTS fraud_alert_status CASCADE;
DROP TYPE IF EXISTS biometric_type CASCADE;
DROP TYPE IF EXISTS biometric_action CASCADE;
DROP TYPE IF EXISTS risk_tolerance CASCADE;
DROP TYPE IF EXISTS investment_status CASCADE;
DROP TYPE IF EXISTS investment_type CASCADE;
DROP TYPE IF EXISTS crypto_type CASCADE;
DROP TYPE IF EXISTS crypto_wallet_status CASCADE;
DROP TYPE IF EXISTS crypto_transaction_type CASCADE;
DROP TYPE IF EXISTS crypto_transaction_status CASCADE;
DROP TYPE IF EXISTS crypto_action CASCADE;
DROP TYPE IF EXISTS chat_sender CASCADE;
DROP TYPE IF EXISTS budget_period CASCADE;
DROP TYPE IF EXISTS budget_status CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;

-- ============================================
-- CREATE CUSTOM ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('customer', 'admin', 'manager');
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'premium', 'business');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'frozen', 'closed');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE loan_type AS ENUM ('personal', 'home', 'auto', 'business', 'student');
CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'paid_off', 'defaulted');
CREATE TYPE loan_payment_status AS ENUM ('scheduled', 'paid', 'late', 'missed');
CREATE TYPE fraud_alert_status AS ENUM ('pending', 'reviewed', 'false_positive', 'confirmed');
CREATE TYPE biometric_type AS ENUM ('fingerprint', 'face', 'voice');
CREATE TYPE biometric_action AS ENUM ('REGISTER', 'AUTHENTICATE', 'DEACTIVATE');
CREATE TYPE risk_tolerance AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');
CREATE TYPE investment_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE investment_type AS ENUM ('stocks', 'bonds', 'cash', 'mutual_funds', 'etfs', 'real_estate');
CREATE TYPE crypto_type AS ENUM ('BTC', 'ETH', 'LTC', 'ADA', 'DOT');
CREATE TYPE crypto_wallet_status AS ENUM ('active', 'inactive', 'frozen');
CREATE TYPE crypto_transaction_type AS ENUM ('buy', 'sell', 'transfer', 'receive');
CREATE TYPE crypto_transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE crypto_action AS ENUM ('WALLET_CREATED', 'BUY', 'SELL', 'TRANSFER', 'RECEIVE');
CREATE TYPE chat_sender AS ENUM ('user', 'bot');
CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE budget_status AS ENUM ('active', 'inactive', 'completed');
CREATE TYPE alert_type AS ENUM ('percentage', 'amount', 'category');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- ============================================
-- CORE BANKING TABLES
-- ============================================

-- Users table (authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role user_role DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_name ON customers(first_name, last_name);

-- Accounts table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type account_type NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status account_status DEFAULT 'active',
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    overdraft_limit DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_type ON accounts(account_type);

-- Transactions table
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    account_id INTEGER NOT NULL,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    category VARCHAR(50) NULL,
    auto_categorized BOOLEAN DEFAULT FALSE,
    categorized_at TIMESTAMP NULL,
    reference_number VARCHAR(50),
    to_account_id INTEGER NULL,
    from_account_id INTEGER NULL,
    status transaction_status DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_categorized ON transactions(auto_categorized);

-- Loans table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    loan_type loan_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    status loan_status DEFAULT 'pending',
    purpose TEXT,
    collateral TEXT,
    approved_by INTEGER NULL,
    approved_at TIMESTAMP NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_type ON loans(loan_type);

-- Loan Payments table
CREATE TABLE loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    status loan_payment_status DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_date ON loan_payments(payment_date);
CREATE INDEX idx_loan_payments_status ON loan_payments(status);

-- ============================================
-- FRAUD DETECTION SYSTEM
-- ============================================

CREATE TABLE fraud_alerts (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36),
    account_id INTEGER,
    risk_score INTEGER,
    risk_factors JSONB,
    status fraud_alert_status DEFAULT 'pending',
    reviewed_by INTEGER NULL,
    reviewed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_fraud_alerts_account ON fraud_alerts(account_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_fraud_alerts_created ON fraud_alerts(created_at);
CREATE INDEX idx_fraud_alerts_risk ON fraud_alerts(risk_score);

-- ============================================
-- BIOMETRIC AUTHENTICATION
-- ============================================

CREATE TABLE biometric_data (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    biometric_type biometric_type NOT NULL,
    encrypted_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, biometric_type)
);

CREATE INDEX idx_biometric_user ON biometric_data(user_id);
CREATE INDEX idx_biometric_type ON biometric_data(biometric_type);

CREATE TABLE biometric_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action biometric_action NOT NULL,
    biometric_type biometric_type NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_biometric_audit_user ON biometric_audit_log(user_id);
CREATE INDEX idx_biometric_audit_created ON biometric_audit_log(created_at);

-- ============================================
-- INVESTMENT ADVISORY SYSTEM
-- ============================================

CREATE TABLE investment_plans (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    risk_tolerance risk_tolerance NOT NULL,
    time_horizon INTEGER NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0.00,
    status investment_status DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_investment_plans_customer ON investment_plans(customer_id);
CREATE INDEX idx_investment_plans_status ON investment_plans(status);

CREATE TABLE investment_recommendations (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL,
    investment_type investment_type NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    recommended_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NULL,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES investment_plans(id) ON DELETE CASCADE,
    CONSTRAINT chk_allocation_percentage CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);

CREATE INDEX idx_investment_recs_plan ON investment_recommendations(plan_id);

CREATE TABLE portfolio_rebalance_log (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    actions JSONB NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_rebalance_log_customer ON portfolio_rebalance_log(customer_id);

-- ============================================
-- CRYPTOCURRENCY SYSTEM
-- ============================================

CREATE TABLE crypto_wallets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    crypto_type crypto_type NOT NULL,
    wallet_address VARCHAR(100) NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    status crypto_wallet_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE (customer_id, crypto_type),
    CONSTRAINT chk_crypto_balance CHECK (balance >= 0)
);

CREATE INDEX idx_crypto_wallets_customer ON crypto_wallets(customer_id);
CREATE INDEX idx_crypto_wallets_type ON crypto_wallets(crypto_type);

CREATE TABLE crypto_transactions (
    id VARCHAR(36) PRIMARY KEY,
    wallet_id VARCHAR(36) NOT NULL,
    transaction_type crypto_transaction_type NOT NULL,
    crypto_amount DECIMAL(20,8) NOT NULL,
    usd_amount DECIMAL(15,2) NULL,
    exchange_rate DECIMAL(15,2) NULL,
    network_fee DECIMAL(20,8) NULL,
    to_address VARCHAR(100) NULL,
    from_address VARCHAR(100) NULL,
    blockchain_tx_hash VARCHAR(100) NULL,
    status crypto_transaction_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (wallet_id) REFERENCES crypto_wallets(id) ON DELETE CASCADE
);

CREATE INDEX idx_crypto_tx_wallet ON crypto_transactions(wallet_id);
CREATE INDEX idx_crypto_tx_status ON crypto_transactions(status);
CREATE INDEX idx_crypto_tx_created ON crypto_transactions(created_at);

CREATE TABLE crypto_activity_log (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    action crypto_action NOT NULL,
    crypto_type crypto_type NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    address VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_crypto_activity_customer ON crypto_activity_log(customer_id);
CREATE INDEX idx_crypto_activity_created ON crypto_activity_log(created_at);

-- ============================================
-- AI CHATBOT
-- ============================================

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    sender chat_sender NOT NULL,
    intent VARCHAR(50) NULL,
    confidence DECIMAL(3,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_customer ON chat_messages(customer_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ============================================
-- EXPENSE TRACKING AND BUDGETING
-- ============================================

CREATE TABLE expense_categorization_log (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    predicted_category VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    description_analyzed TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expense_cat_log_transaction ON expense_categorization_log(transaction_id);
CREATE INDEX idx_expense_cat_log_created ON expense_categorization_log(created_at);

CREATE TABLE budgets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    period budget_period NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status budget_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT chk_budget_dates CHECK (end_date > start_date),
    CONSTRAINT chk_budget_amount CHECK (total_amount > 0)
);

CREATE INDEX idx_budgets_customer ON budgets(customer_id);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_period ON budgets(start_date, end_date);

CREATE TABLE budget_categories (
    id SERIAL PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

CREATE INDEX idx_budget_categories_budget ON budget_categories(budget_id);
CREATE INDEX idx_budget_categories_category ON budget_categories(category);

CREATE TABLE budget_alerts (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    budget_id VARCHAR(36) NOT NULL,
    alert_type alert_type NOT NULL,
    threshold_percentage DECIMAL(5,2) NULL,
    threshold_amount DECIMAL(15,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

CREATE INDEX idx_budget_alerts_customer ON budget_alerts(customer_id);
CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);

-- ============================================
-- SUPPORT SYSTEM
-- ============================================

CREATE TABLE support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_support_tickets_customer ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(50) NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_data_updated_at BEFORE UPDATE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_plans_updated_at BEFORE UPDATE ON investment_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_recommendations_updated_at BEFORE UPDATE ON investment_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_wallets_updated_at BEFORE UPDATE ON crypto_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default admin user (password: admin123)
-- Note: You should hash this password properly using bcrypt
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

SELECT 'PostgreSQL Database schema created successfully!' as status;
