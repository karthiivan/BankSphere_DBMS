const { executeQuery } = require('./config/database');

async function createAccounts() {
    try {
        console.log('🏦 Creating accounts for janemeri...\n');

        const customerId = 9; // janemeri's customer ID

        // Get account types
        const accountTypes = await executeQuery('SELECT id, name FROM account_types');
        console.log('Account types:', accountTypes);
        
        const checkingTypeId = accountTypes.find(t => t.name === 'Checking')?.id || 1;
        const savingsTypeId = accountTypes.find(t => t.name === 'Savings')?.id || 2;

        // Get first branch
        const branches = await executeQuery('SELECT id FROM branches LIMIT 1');
        const branchId = branches.length > 0 ? branches[0].id : 1;

        console.log(`Using branch ID: ${branchId}`);
        console.log(`Checking type ID: ${checkingTypeId}`);
        console.log(`Savings type ID: ${savingsTypeId}\n`);

        // Create Checking Account
        const checkingAccountNumber = `ACC${customerId.toString().padStart(3, '0')}000001`;
        console.log(`Creating checking account: ${checkingAccountNumber}`);
        
        const checkingResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
             VALUES (?, ?, ?, 10000.00, ?, 'active', NOW())`,
            [customerId, checkingTypeId, checkingAccountNumber, branchId]
        );

        console.log(`✅ Checking account created with ID: ${checkingResult.insertId}`);

        // Add initial deposit transaction
        await executeQuery(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'deposit', 10000.00, 'Initial deposit', 10000.00, NOW())`,
            [checkingResult.insertId]
        );

        // Create Savings Account
        const savingsAccountNumber = `ACC${customerId.toString().padStart(3, '0')}000002`;
        console.log(`Creating savings account: ${savingsAccountNumber}`);
        
        const savingsResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
             VALUES (?, ?, ?, 15000.00, ?, 'active', NOW())`,
            [customerId, savingsTypeId, savingsAccountNumber, branchId]
        );

        console.log(`✅ Savings account created with ID: ${savingsResult.insertId}`);

        // Add initial deposit transaction
        await executeQuery(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'deposit', 15000.00, 'Initial deposit', 15000.00, NOW())`,
            [savingsResult.insertId]
        );

        console.log('\n💰 Summary:');
        console.log(`   Checking: ${checkingAccountNumber} - $10,000.00`);
        console.log(`   Savings: ${savingsAccountNumber} - $15,000.00`);
        console.log(`   Total: $25,000.00`);
        console.log('\n✅ Done! Refresh your dashboard now.');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

createAccounts();
