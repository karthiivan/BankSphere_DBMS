const { executeQuery } = require('./config/database');

async function addTestAccount() {
    try {
        // Add a second account for testing transfers
        const result = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, branch_id, account_number, balance, status) 
             VALUES (1, 1, 1, 'ACC001000002', 1000.00, 'active')`
        );
        
        console.log('✅ Test account ACC001000002 created successfully with $1000 balance');
        
        // Add initial deposit transaction
        await executeQuery(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'deposit', 1000.00, 'Initial deposit', 1000.00, NOW())`,
            [result.insertId]
        );
        
        console.log('✅ Initial deposit transaction recorded');
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️ Test account already exists');
        } else {
            console.error('❌ Error creating test account:', error.message);
        }
    }
    
    process.exit(0);
}

addTestAccount();