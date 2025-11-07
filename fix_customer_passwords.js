const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCustomerPasswords() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bank_management'
    });

    try {
        // Hash password123 for customers
        const customerPassword = 'password123';
        const customerHash = await bcrypt.hash(customerPassword, 12);
        
        console.log('Customer password hash:', customerHash);
        console.log('Hash length:', customerHash.length);
        
        // Update all customer passwords
        const customers = ['john_doe', 'jane_smith', 'bob_johnson'];
        
        for (const username of customers) {
            const [result] = await connection.execute(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [customerHash, username]
            );
            console.log(`Updated ${username}: ${result.affectedRows} rows affected`);
        }
        
        // Hash employee123 for employee
        const employeePassword = 'employee123';
        const employeeHash = await bcrypt.hash(employeePassword, 12);
        
        const [empResult] = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [employeeHash, 'emp_manager']
        );
        console.log(`Updated emp_manager: ${empResult.affectedRows} rows affected`);
        
        // Verify all updates
        const [users] = await connection.execute(
            'SELECT username, role, LENGTH(password_hash) as hash_length FROM users'
        );
        
        console.log('\nVerification:');
        users.forEach(user => {
            console.log(`${user.username} (${user.role}): ${user.hash_length} chars`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixCustomerPasswords();