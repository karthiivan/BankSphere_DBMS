-- Fix crypto tables to match the application code

-- Drop existing crypto tables if they exist
DROP TABLE IF EXISTS crypto_transactions;
DROP TABLE IF EXISTS crypto_wallets;

-- Create crypto_wallets table with correct structure
CREATE TABLE crypto_wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    crypto_name VARCHAR(50) NOT NULL,
    amount DECIMAL(20,8) DEFAULT 0,
    average_price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_crypto (customer_id, crypto_symbol),
    INDEX idx_crypto_wallets_customer (customer_id),
    INDEX idx_crypto_wallets_symbol (crypto_symbol)
);

-- Create crypto_transactions table with correct structure
CREATE TABLE crypto_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    account_id INT NOT NULL,
    crypto_symbol VARCHAR(10) NOT NULL,
    transaction_type ENUM('buy', 'sell') NOT NULL,
    crypto_amount DECIMAL(20,8) NOT NULL,
    usd_amount DECIMAL(15,2) NOT NULL,
    price_per_unit DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_crypto_tx_customer (customer_id),
    INDEX idx_crypto_tx_account (account_id),
    INDEX idx_crypto_tx_symbol (crypto_symbol),
    INDEX idx_crypto_tx_created (created_at)
);

-- Insert sample crypto holdings for john_doe (customer_id = 1)
INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price) VALUES
(1, 'BTC', 'Bitcoin', 0.0221, 44500.00),
(1, 'ETH', 'Ethereum', 0.1734, 2850.00),
(1, 'ADA', 'Cardano', 0, 0.50);

COMMIT;
