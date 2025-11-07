const { executeQuery } = require('./config/database');

async function fixCryptoTables() {
    try {
        console.log('🔄 Fixing cryptocurrency tables...');

        // Drop existing tables
        await executeQuery('DROP TABLE IF EXISTS crypto_transactions');
        await executeQuery('DROP TABLE IF EXISTS crypto_wallets');
        console.log('✅ Old tables dropped');

        // Create crypto_wallets table with correct structure
        await executeQuery(`
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
            )
        `);
        console.log('✅ crypto_wallets table created');

        // Create crypto_transactions table
        await executeQuery(`
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
            )
        `);
        console.log('✅ crypto_transactions table created');

        // Insert sample crypto holdings
        await executeQuery(`
            INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price) VALUES
            (1, 'BTC', 'Bitcoin', 0.0221, 44500.00),
            (1, 'ETH', 'Ethereum', 0.1734, 2850.00),
            (1, 'ADA', 'Cardano', 0, 0.50)
        `);
        console.log('✅ Sample crypto holdings added');

        console.log('✅ All crypto tables fixed successfully!');

    } catch (error) {
        console.error('❌ Error fixing crypto tables:', error);
    }
    
    process.exit(0);
}

fixCryptoTables();
