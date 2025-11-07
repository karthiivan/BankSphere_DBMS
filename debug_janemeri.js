const { executeQuery } = require('./config/database');

async function debugJanemeri() {
    try {
        console.log('🔍 Debugging janemeri account...\n');

        // Get user info
        const users = await executeQuery(
            'SELECT * FROM users WHERE username = ?',
            ['janemeri']
        );

        if (users.length === 0) {
            console.log('❌ User janemeri not found!');
            return;
        }

        const user = users[0];
        console.log('👤 User Info:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active}`);

        // Get customer info
        const customers = await executeQuery(
            'SELECT * FROM customers WHERE user_id = ?',
            [user.id]
        );

        if (customers.length === 0) {
            console.log('\n❌ No customer profile found!');
            console.log('Creating customer profile...');
            
            const result = await executeQuery(
                `INSERT INTO customers (user_id, first_name, last_name, date_of_birth, phone, 
                 address, city, state, zip_code, ssn, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [user.id, 'Jane', 'Meri', '1990-01-01', '(555) 123-4567', 
                 '123 Main St', 'New York', 'NY', '10001', '123-45-6789']
            );
            
            console.log(`✅ Customer profile created with ID: ${result.insertId}`);
            
            const newCustomers = await executeQuery(
                'SELECT * FROM customers WHERE user_id = ?',
                [user.id]
            );
            
            if (newCustomers.length > 0) {
                const customer = newCustomers[0];
                console.log('\n👥 Customer Info:');
                console.log(`   ID: ${customer.id}`);
                console.log(`   Name: ${customer.first_name} ${customer.last_name}`);
            }
        } else {
            const customer = customers[0];
            console.log('\n👥 Customer Info:');
            console.log(`   ID: ${customer.id}`);
            console.log(`   Name: ${customer.first_name} ${customer.last_name}`);
            console.log(`   Phone: ${customer.phone}`);

            // Get accounts
            const accounts = await executeQuery(
                `SELECT a.*, at.name as account_type_name 
                 FROM accounts a 
                 JOIN account_types at ON a.account_type_id = at.id 
                 WHERE a.customer_id = ?`,
                [customer.id]
            );

            console.log(`\n💰 Accounts (${accounts.length}):`);
            if (accounts.length === 0) {
                console.log('   ❌ No accounts found!');
            } else {
                for (const acc of accounts) {
                    console.log(`   ${acc.account_type_name}: ${acc.account_number} - $${parseFloat(acc.balance).toFixed(2)} (${acc.status})`);
                }
            }

            // Test the query that the API uses
            console.log('\n🧪 Testing API Query:');
            const apiAccounts = await executeQuery(
                `SELECT a.*, at.name as account_type_name, at.description as account_type_description,
                       b.name as branch_name
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN branches b ON a.branch_id = b.id
                WHERE a.customer_id = ? AND a.status != 'closed'
                ORDER BY a.created_at DESC`,
                [customer.id]
            );

            console.log(`   Found ${apiAccounts.length} accounts via API query`);
            if (apiAccounts.length > 0) {
                console.log('   ✅ API query works!');
            } else {
                console.log('   ❌ API query returns no results');
            }
        }

        // Generate a fresh JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                customerId: customers.length > 0 ? customers[0].id : null
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        console.log('\n🔑 Fresh JWT Token:');
        console.log(token);
        console.log('\n📝 To use this token:');
        console.log('1. Open browser console (F12)');
        console.log('2. Run: localStorage.setItem("token", "' + token + '")');
        console.log('3. Refresh the page');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

debugJanemeri();
