
const { executeQuery } = require('./config/database');

async function addCryptoTables() {
    try {
        console.log('🔄 Adding cryptocurrency tables...');

        // Create crypto_wallets table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS crypto_wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                crypto_symbol VARCHAR(10) NOT NULL,
                crypto_name VARCHAR(50) NOT NULL,
                amount DECIMAL(18,8) DEFAULT 0,
                average_price DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                UNIQUE KEY unique_customer_crypto (customer_id, crypto_symbol)
            )
        `);

        // Create crypto_transactions table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS crypto_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                account_id INT NOT NULL,
                crypto_symbol VARCHAR(10) NOT NULL,
                transaction_type ENUM('buy', 'sell') NOT NULL,
                crypto_amount DECIMAL(18,8) NOT NULL,
                usd_amount DECIMAL(15,2) NOT NULL,
                price_per_unit DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (account_id) REFERENCES accounts(id)
            )
        `);

        console.log('✅ Crypto tables structure created');

        // Insert sample crypto holdings for john_doe (customer_id = 1)
        try {
            await executeQuery(`
                INSERT IGNORE INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price) VALUES
                (1, 'BTC', 'Bitcoin', 0.0221, 45230.00),
                (1, 'ETH', 'Ethereum', 0.1734, 2890.00),
                (1, 'ADA', 'Cardano', 0, 0.52)
            `);
            console.log('✅ Sample crypto holdings added');
        } catch (error) {
            console.log('ℹ️ Sample data already exists or error:', error.message);
        }

        console.log('✅ Cryptocurrency tables created successfully');
        console.log('✅ Sample crypto holdings added for john_doe');

    } catch (error) {
        console.error('❌ Error creating crypto tables:', error.message);
    }

    process.exit(0);
}

addCryptoTables();