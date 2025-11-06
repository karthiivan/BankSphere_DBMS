const { executeQuery } = require('./config/database');

async function setupJaneAccount() {
    try {
        console.log('🔄 Setting up jane_meri account...');

        // Check if user exists
        const users = await executeQuery(
            'SELECT u.id, c.id as customer_id FROM users u LEFT JOIN customers c ON u.id = c.user_id WHERE u.username = ?',
            ['jane_meri']
        );

        if (users.length === 0) {
            console.log('❌ User jane_meri not found. Creating user...');
            
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash('password123', 12);
            
            // Create user
            const userResult = await executeQuery(
                'INSERT INTO users (username, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                ['jane_meri', 'jane@example.com', passwordHash, 'customer', 1]
            );
            
            const userId = userResult.insertId;
            
            // Create customer profile
            const customerResult = await executeQuery(
                `INSERT INTO customers (user_id, first_name, last_name, date_of_birth, phone, 
                 address, city, state, zip_code, ssn, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [userId, 'Jane', 'Meri', '1995-05-15', '(555) 234-5678', '456 Oak Street', 'New York', 'NY', '10001', '234-56-7890']
            );
            
            const customerId = customerResult.insertId;
            console.log(`✅ User created: ID ${userId}, Customer ID ${customerId}`);
        } else {
            console.log(`✅ User found: ID ${users[0].id}, Customer ID ${users[0].customer_id}`);
        }

        // Get customer ID
        const customer = await executeQuery(
            'SELECT c.id FROM customers c JOIN users u ON c.user_id = u.id WHERE u.username = ?',
            ['jane_meri']
        );

        if (customer.length === 0) {
            console.log('❌ Customer profile not found');
            return;
        }

        const customerId = customer[0].id;

        // Check if accounts exist
        const existingAccounts = await executeQuery(
            'SELECT * FROM accounts WHERE customer_id = ?',
            [customerId]
        );

        if (existingAccounts.length > 0) {
            console.log(`✅ Found ${existingAccounts.length} existing accounts`);
        } else {
            console.log('📝 Creating accounts...');

            // Get account type IDs
            const accountTypes = await executeQuery('SELECT id, name FROM account_types');
            const checkingTypeId = accountTypes.find(t => t.name === 'Checking')?.id || 1;
            const savingsTypeId = accountTypes.find(t => t.name === 'Savings')?.id || 2;

            // Get a branch ID (use first available branch)
            const branches = await executeQuery('SELECT id FROM branches LIMIT 1');
            const branchId = branches.length > 0 ? branches[0].id : 1;

            // Create Checking Account
            const checkingResult = await executeQuery(
                `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
                [customerId, checkingTypeId, `ACC${customerId.toString().padStart(3, '0')}000001`, 5000.00, branchId]
            );
            console.log(`✅ Checking account created: ACC${customerId.toString().padStart(3, '0')}000001 with $5,000`);

            // Create Savings Account
            const savingsResult = await executeQuery(
                `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
                [customerId, savingsTypeId, `ACC${customerId.toString().padStart(3, '0')}000002`, 10000.00, branchId]
            );
            console.log(`✅ Savings account created: ACC${customerId.toString().padStart(3, '0')}000002 with $10,000`);

            // Add some transactions
            const checkingAccountId = checkingResult.insertId;
            const savingsAccountId = savingsResult.insertId;

            // Initial deposit transactions
            await executeQuery(
                `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
                 VALUES (?, 'deposit', 5000.00, 'Initial deposit', 5000.00, NOW())`,
                [checkingAccountId]
            );

            await executeQuery(
                `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
                 VALUES (?, 'deposit', 10000.00, 'Initial deposit', 10000.00, NOW())`,
                [savingsAccountId]
            );

            // Add some sample transactions (using valid transaction types)
            const transactions = [
                { accountId: checkingAccountId, type: 'withdraw', amount: 200.00, desc: 'ATM Withdrawal', balance: 4800.00 },
                { accountId: checkingAccountId, type: 'deposit', amount: 1500.00, desc: 'Salary Deposit', balance: 6300.00 },
                { accountId: checkingAccountId, type: 'payment', amount: 150.00, desc: 'Electric Bill', balance: 6150.00 },
                { accountId: checkingAccountId, type: 'purchase', amount: 85.50, desc: 'Grocery Shopping', balance: 6064.50 },
                { accountId: checkingAccountId, type: 'transfer', amount: 1000.00, desc: 'Transfer to Savings', balance: 5064.50 },
                { accountId: savingsAccountId, type: 'transfer', amount: 1000.00, desc: 'Transfer from Checking', balance: 11000.00 },
            ];

            for (const tx of transactions) {
                await executeQuery(
                    `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
                     VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ${Math.floor(Math.random() * 30)} DAY))`,
                    [tx.accountId, tx.type, tx.amount, tx.desc, tx.balance]
                );
            }

            // Update final balances
            await executeQuery(
                'UPDATE accounts SET balance = 5064.50 WHERE id = ?',
                [checkingAccountId]
            );

            await executeQuery(
                'UPDATE accounts SET balance = 11000.00 WHERE id = ?',
                [savingsAccountId]
            );

            console.log('✅ Sample transactions added');
        }

        // Add crypto holdings
        console.log('📝 Adding crypto holdings...');
        
        const cryptoHoldings = [
            { symbol: 'BTC', name: 'Bitcoin', amount: 0.05, avgPrice: 43000.00 },
            { symbol: 'ETH', name: 'Ethereum', amount: 0.5, avgPrice: 2800.00 },
            { symbol: 'ADA', name: 'Cardano', amount: 1000, avgPrice: 0.48 }
        ];

        for (const crypto of cryptoHoldings) {
            await executeQuery(
                `INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE amount = VALUES(amount), average_price = VALUES(average_price)`,
                [customerId, crypto.symbol, crypto.name, crypto.amount, crypto.avgPrice]
            );
        }
        console.log('✅ Crypto holdings added');

        console.log('\n🎉 Jane Meri account setup complete!');
        console.log('📊 Summary:');
        console.log('   - Checking Account: $5,064.50');
        console.log('   - Savings Account: $11,000.00');
        console.log('   - Total Balance: $16,064.50');
        console.log('   - Crypto: 0.05 BTC, 0.5 ETH, 1000 ADA');
        console.log('\n🔐 Login credentials:');
        console.log('   Username: jane_meri');
        console.log('   Password: password123');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

setupJaneAccount();
