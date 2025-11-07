const { executeQuery } = require('./config/database');

async function addBalance() {
    try {
        console.log('💰 Checking jane_meri account balances...\n');

        // Get current balances
        const accounts = await executeQuery(`
            SELECT a.id, a.account_number, at.name as account_type, a.balance 
            FROM accounts a 
            JOIN account_types at ON a.account_type_id = at.id 
            JOIN customers c ON a.customer_id = c.id 
            JOIN users u ON c.user_id = u.id 
            WHERE u.username = 'jane_meri'
        `);

        if (accounts.length === 0) {
            console.log('❌ No accounts found for jane_meri');
            process.exit(0);
        }

        console.log('📊 Current Balances:');
        accounts.forEach(acc => {
            console.log(`   ${acc.account_type}: ${acc.account_number} - $${parseFloat(acc.balance).toFixed(2)}`);
        });

        // Add $5,000 to each account
        console.log('\n💵 Adding $5,000 to each account...\n');

        for (const acc of accounts) {
            const newBalance = parseFloat(acc.balance) + 5000;
            
            await executeQuery(
                'UPDATE accounts SET balance = ? WHERE id = ?',
                [newBalance, acc.id]
            );

            // Add transaction record
            await executeQuery(
                `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
                 VALUES (?, 'deposit', 5000.00, 'Balance top-up', ?, NOW())`,
                [acc.id, newBalance]
            );

            console.log(`✅ ${acc.account_type}: $${parseFloat(acc.balance).toFixed(2)} → $${newBalance.toFixed(2)}`);
        }

        // Show final balances
        const finalAccounts = await executeQuery(`
            SELECT a.account_number, at.name as account_type, a.balance 
            FROM accounts a 
            JOIN account_types at ON a.account_type_id = at.id 
            JOIN customers c ON a.customer_id = c.id 
            JOIN users u ON c.user_id = u.id 
            WHERE u.username = 'jane_meri'
        `);

        const totalBalance = finalAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

        console.log('\n🎉 Final Balances:');
        finalAccounts.forEach(acc => {
            console.log(`   ${acc.account_type}: ${acc.account_number} - $${parseFloat(acc.balance).toFixed(2)}`);
        });
        console.log(`\n💰 Total Balance: $${totalBalance.toFixed(2)}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

addBalance();
