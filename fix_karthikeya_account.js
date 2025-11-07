const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixKarthikeyaAccount() {
    try {
        // Get karthikeya user
        const userResult = await pool.query(`SELECT id FROM users WHERE username = 'karthikeya'`);
        if (userResult.rows.length === 0) {
            console.log('❌ User karthikeya not found');
            return;
        }
        const userId = userResult.rows[0].id;
        console.log('✅ Found user karthikeya with ID:', userId);

        // Get or create customer record
        let customerResult = await pool.query(`SELECT id FROM customers WHERE user_id = $1`, [userId]);
        let customerId;

        if (customerResult.rows.length === 0) {
            console.log('Creating customer record...');
            customerResult = await pool.query(
                `INSERT INTO customers (user_id, first_name, last_name, date_of_birth, ssn, 
                 phone_number, address, city, state, zip_code) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
                [userId, 'Karthikeya', 'User', '1990-01-01', '123-45-6789',
                 '1234567890', '123 Main St', 'Anytown', 'CA', '12345']
            );
            customerId = customerResult.rows[0].id;
            console.log('✅ Created customer with ID:', customerId);
        } else {
            customerId = customerResult.rows[0].id;
            console.log('✅ Found customer with ID:', customerId);
        }

        // Check if accounts exist
        const existingAccounts = await pool.query(`SELECT * FROM accounts WHERE customer_id = $1`, [customerId]);
        
        if (existingAccounts.rows.length > 0) {
            console.log(`✅ User already has ${existingAccounts.rows.length} account(s):`);
            existingAccounts.rows.forEach(acc => {
                console.log(`   - ${acc.account_type}: Account #${acc.account_number}, Balance: $${acc.balance}`);
            });
            return;
        }

        console.log('Creating accounts...');

        // Create checking account
        const checkingNumber = 'ACC' + Date.now().toString().slice(-9);
        const checkingResult = await pool.query(
            `INSERT INTO accounts (customer_id, account_number, account_type, balance, status) 
             VALUES ($1, $2, 'checking', $3, 'active') RETURNING id`,
            [customerId, checkingNumber, 5000]
        );
        const checkingId = checkingResult.rows[0].id;
        console.log('✅ Created checking account:', checkingNumber, '- $5000');

        // Create initial transaction for checking
        await pool.query(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after) 
             VALUES ($1, 'deposit', $2, 'Initial deposit', $3)`,
            [checkingId, 5000, 5000]
        );

        // Create savings account
        const savingsNumber = 'ACC' + (Date.now() + 1).toString().slice(-9);
        const savingsResult = await pool.query(
            `INSERT INTO accounts (customer_id, account_number, account_type, balance, status) 
             VALUES ($1, $2, 'savings', $3, 'active') RETURNING id`,
            [customerId, savingsNumber, 3000]
        );
        const savingsId = savingsResult.rows[0].id;
        console.log('✅ Created savings account:', savingsNumber, '- $3000');

        // Create initial transaction for savings
        await pool.query(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after) 
             VALUES ($1, 'deposit', $2, 'Initial deposit', $3)`,
            [savingsId, 3000, 3000]
        );

        console.log('\n🎉 SUCCESS! Accounts created for karthikeya');
        console.log('   Checking Account: $5,000');
        console.log('   Savings Account: $3,000');
        console.log('\n✅ You can now log in and see your accounts!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

fixKarthikeyaAccount();
