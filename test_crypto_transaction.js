const { executeQuery } = require('./config/database');

async function testCryptoTransactions() {
    try {
        console.log('🔍 Testing crypto transactions...\n');

        // Get a customer with accounts
        const customers = await executeQuery(
            `SELECT c.id, c.first_name, c.last_name, u.username 
             FROM customers c 
             JOIN users u ON c.user_id = u.id 
             WHERE EXISTS (SELECT 1 FROM accounts WHERE customer_id = c.id)
             LIMIT 1`
        );

        if (customers.length === 0) {
            console.log('❌ No customers found. Please register first.');
            process.exit(0);
        }

        const customer = customers[0];
        console.log(`👤 Testing with customer: ${customer.first_name} ${customer.last_name} (${customer.username})`);

        // Get their accounts
        const accounts = await executeQuery(
            'SELECT * FROM accounts WHERE customer_id = ?',
            [customer.id]
        );

        if (accounts.length === 0) {
            console.log('❌ No accounts found for this customer.');
            process.exit(0);
        }

        console.log(`\n💰 Found ${accounts.length} accounts:`);
        for (const acc of accounts) {
            console.log(`   Account ${acc.id}: $${parseFloat(acc.balance).toFixed(2)}`);
        }

        const accountId = accounts[0].id;

        // Check recent transactions
        const transactions = await executeQuery(
            `SELECT * FROM transactions 
             WHERE account_id = ? 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [accountId]
        );

        console.log(`\n📊 Recent transactions for account ${accountId}:`);
        if (transactions.length === 0) {
            console.log('   No transactions found.');
        } else {
            for (const tx of transactions) {
                console.log(`   ${tx.transaction_type}: $${parseFloat(tx.amount).toFixed(2)} - ${tx.description}`);
            }
        }

        // Check crypto wallets
        const wallets = await executeQuery(
            'SELECT * FROM crypto_wallets WHERE customer_id = ?',
            [customer.id]
        );

        console.log(`\n🪙 Crypto wallets:`);
        if (wallets.length === 0) {
            console.log('   No crypto holdings.');
        } else {
            for (const wallet of wallets) {
                console.log(`   ${wallet.crypto_symbol}: ${parseFloat(wallet.amount).toFixed(8)} (avg price: $${parseFloat(wallet.average_price).toFixed(2)})`);
            }
        }

        // Check crypto activity log
        const activities = await executeQuery(
            'SELECT * FROM crypto_activity_log WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10',
            [customer.id]
        );

        console.log(`\n📈 Crypto activity log:`);
        if (activities.length === 0) {
            console.log('   No crypto activities.');
        } else {
            for (const activity of activities) {
                console.log(`   ${activity.activity_type} ${activity.crypto_symbol}: ${parseFloat(activity.amount).toFixed(8)} @ $${parseFloat(activity.price_at_transaction).toFixed(2)} = $${parseFloat(activity.usd_value).toFixed(2)}`);
            }
        }

        console.log('\n✅ Test complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

testCryptoTransactions();
