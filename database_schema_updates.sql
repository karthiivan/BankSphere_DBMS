-- Database schema updates for new features
-- Run these SQL commands to add support for all new features

-- Fraud Detection System Tables
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36),
    account_id INT,
    risk_score INT,
    status ENUM('pending', 'reviewed', 'false_positive', 'confirmed') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    INDEX idx_fraud_alerts_account (account_id),
    INDEX idx_fraud_alerts_status (status),
    INDEX idx_fraud_alerts_created (created_at)
);

-- Biometric Authentication Tables
CREATE TABLE IF NOT EXISTS biometric_data (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    biometric_type ENUM('fingerprint', 'face', 'voice') NOT NULL,
    encrypted_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_used TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_biometric (user_id, biometric_type),
    INDEX idx_biometric_user (user_id),
    INDEX idx_biometric_type (biometric_type)
);

CREATE TABLE IF NOT EXISTS biometric_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('REGISTER', 'AUTHENTICATE', 'DEACTIVATE') NOT NULL,
    biometric_type ENUM('fingerprint', 'face', 'voice') NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_biometric_audit_user (user_id),
    INDEX idx_biometric_audit_created (created_at)
);

-- Investment Advisory System Tables
CREATE TABLE IF NOT EXISTS investment_plans (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    risk_tolerance ENUM('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE') NOT NULL,
    time_horizon INT NOT NULL, -- in years
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_investment_plans_customer (customer_id),
    INDEX idx_investment_plans_status (status)
);

CREATE TABLE IF NOT EXISTS investment_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id VARCHAR(36) NOT NULL,
    investment_type ENUM('stocks', 'bonds', 'cash', 'mutual_funds', 'etfs', 'real_estate') NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    recommended_amount DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NULL,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES investment_plans(id),
    INDEX idx_investment_recs_plan (plan_id)
);

CREATE TABLE IF NOT EXISTS portfolio_rebalance_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    reason TEXT NOT NULL,
    actions JSON NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_rebalance_log_customer (customer_id)
);

-- Cryptocurrency System Tables
CREATE TABLE IF NOT EXISTS crypto_wallets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    crypto_type ENUM('BTC', 'ETH', 'LTC', 'ADA', 'DOT') NOT NULL,
    wallet_address VARCHAR(100) NOT NULL UNIQUE,
    encrypted_private_key TEXT NOT NULL,
    balance DECIMAL(20,8) DEFAULT 0,
    status ENUM('active', 'inactive', 'frozen') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE KEY unique_customer_crypto (customer_id, crypto_type),
    INDEX idx_crypto_wallets_customer (customer_id),
    INDEX idx_crypto_wallets_type (crypto_type)
);

CREATE TABLE IF NOT EXISTS crypto_transactions (
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
    FOREIGN KEY (wallet_id) REFERENCES crypto_wallets(id),
    INDEX idx_crypto_tx_wallet (wallet_id),
    INDEX idx_crypto_tx_status (status),
    INDEX idx_crypto_tx_created (created_at)
);

CREATE TABLE IF NOT EXISTS crypto_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    action ENUM('WALLET_CREATED', 'BUY', 'SELL', 'TRANSFER', 'RECEIVE') NOT NULL,
    crypto_type ENUM('BTC', 'ETH', 'LTC', 'ADA', 'DOT') NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    address VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_crypto_activity_customer (customer_id),
    INDEX idx_crypto_activity_created (created_at)
);

-- AI Chatbot Tables
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    sender ENUM('user', 'bot') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_chat_messages_customer (customer_id),
    INDEX idx_chat_messages_session (session_id),
    INDEX idx_chat_messages_created (created_at)
);

-- Expense Tracking and Budgeting Tables
CREATE TABLE IF NOT EXISTS expense_categorization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    predicted_category VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    description_analyzed TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_cat_log_transaction (transaction_id),
    INDEX idx_expense_cat_log_created (created_at)
);

CREATE TABLE IF NOT EXISTS budgets (
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
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_budgets_customer (customer_id),
    INDEX idx_budgets_status (status),
    INDEX idx_budgets_period (start_date, end_date)
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    INDEX idx_budget_categories_budget (budget_id),
    INDEX idx_budget_categories_category (category)
);

CREATE TABLE IF NOT EXISTS budget_alerts (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL,
    budget_id VARCHAR(36) NOT NULL,
    alert_type ENUM('percentage', 'amount', 'category') NOT NULL,
    threshold_percentage DECIMAL(5,2) NULL,
    threshold_amount DECIMAL(15,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
    INDEX idx_budget_alerts_customer (customer_id),
    INDEX idx_budget_alerts_budget (budget_id)
);

-- Update existing transactions table to add category column
ALTER TABLE transactions 
ADD COLUMN category VARCHAR(50) NULL AFTER description,
ADD COLUMN auto_categorized BOOLEAN DEFAULT FALSE AFTER category,
ADD COLUMN categorized_at TIMESTAMP NULL AFTER auto_categorized;

-- Add indexes for better performance
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_categorized ON transactions(auto_categorized);

-- Support Tickets Enhancement (if not exists)
CREATE TABLE IF NOT EXISTS support_tickets (
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
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    INDEX idx_support_tickets_customer (customer_id),
    INDEX idx_support_tickets_status (status),
    INDEX idx_support_tickets_priority (priority)
);

-- Enhanced Audit Log (if not exists)
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_log_user (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_created (created_at)
);

-- Sample data for expense categories (optional)
INSERT IGNORE INTO expense_categorization_log (transaction_id, predicted_category, confidence_score, description_analyzed) VALUES
('sample-1', 'Food & Dining', 0.95, 'McDonald\'s Restaurant'),
('sample-2', 'Transportation', 0.90, 'Shell Gas Station'),
('sample-3', 'Shopping', 0.85, 'Amazon Purchase');

-- Create views for better data access
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

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetCustomerFinancialSummary(IN customer_id INT)
BEGIN
    SELECT 
        'Accounts' as category,
        COUNT(*) as count,
        COALESCE(SUM(balance), 0) as total_value
    FROM accounts 
    WHERE customer_id = customer_id AND status = 'active'
    
    UNION ALL
    
    SELECT 
        'Crypto Wallets' as category,
        COUNT(*) as count,
        COALESCE(SUM(balance * 50000), 0) as total_value -- Simplified USD conversion
    FROM crypto_wallets 
    WHERE customer_id = customer_id AND status = 'active'
    
    UNION ALL
    
    SELECT 
        'Investment Plans' as category,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_value
    FROM investment_plans 
    WHERE customer_id = customer_id AND status = 'active';
END //

DELIMITER ;

-- Performance optimization indexes
CREATE INDEX idx_transactions_customer_date ON transactions(account_id, created_at);
CREATE INDEX idx_transactions_type_amount ON transactions(transaction_type, amount);
CREATE INDEX idx_accounts_customer_status ON accounts(customer_id, status);
CREATE INDEX idx_crypto_wallets_customer_status ON crypto_wallets(customer_id, status);

-- Add constraints for data integrity
ALTER TABLE fraud_alerts 
ADD CONSTRAINT chk_risk_score CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE investment_recommendations 
ADD CONSTRAINT chk_allocation_percentage CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);

ALTER TABLE crypto_wallets 
ADD CONSTRAINT chk_crypto_balance CHECK (balance >= 0);

ALTER TABLE budgets 
ADD CONSTRAINT chk_budget_dates CHECK (end_date > start_date),
ADD CONSTRAINT chk_budget_amount CHECK (total_amount > 0);

-- Create triggers for automatic categorization
DELIMITER //

CREATE TRIGGER auto_categorize_transaction 
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE predicted_category VARCHAR(50);
    
    -- Simple categorization logic (can be enhanced)
    IF NEW.description LIKE '%restaurant%' OR NEW.description LIKE '%food%' THEN
        SET predicted_category = 'Food & Dining';
    ELSEIF NEW.description LIKE '%gas%' OR NEW.description LIKE '%fuel%' THEN
        SET predicted_category = 'Transportation';
    ELSEIF NEW.description LIKE '%amazon%' OR NEW.description LIKE '%store%' THEN
        SET predicted_category = 'Shopping';
    ELSE
        SET predicted_category = 'Other';
    END IF;
    
    -- Update the transaction with predicted category
    UPDATE transactions 
    SET category = predicted_category, 
        auto_categorized = TRUE, 
        categorized_at = NOW() 
    WHERE id = NEW.id;
END //

DELIMITER ;

-- Create function for risk score calculation
DELIMITER //

CREATE FUNCTION CalculateTransactionRisk(
    amount DECIMAL(15,2),
    account_id INT,
    transaction_hour INT
) RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE risk_score INT DEFAULT 0;
    DECLARE avg_amount DECIMAL(15,2);
    DECLARE recent_count INT;
    
    -- Check amount vs average
    SELECT AVG(amount) INTO avg_amount 
    FROM transactions 
    WHERE account_id = account_id 
    AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    IF amount > (avg_amount * 5) THEN
        SET risk_score = risk_score + 30;
    END IF;
    
    -- Check transaction frequency
    SELECT COUNT(*) INTO recent_count
    FROM transactions 
    WHERE account_id = account_id 
    AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    IF recent_count >= 5 THEN
        SET risk_score = risk_score + 25;
    END IF;
    
    -- Check unusual time
    IF transaction_hour >= 22 OR transaction_hour <= 6 THEN
        SET risk_score = risk_score + 15;
    END IF;
    
    RETURN LEAST(risk_score, 100);
END //

DELIMITER ;

-- Grant necessary permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON bank_management.* TO 'bank_app'@'localhost';

COMMIT;