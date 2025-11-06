const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bank_management'
    });

    try {
        // Hash the password
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 12);
        
        console.log('Generated hash:', hash);
        
        // Delete existing admin user
        await connection.execute('DELETE FROM users WHERE username = ?', ['admin']);
        
        // Create new admin user
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
            ['admin', 'admin@bank.com', hash, 'admin', 1]
        );
        
        console.log('Admin user created successfully');
        
        // Verify the user was created
        const [users] = await connection.execute('SELECT username, role FROM users WHERE username = ?', ['admin']);
        console.log('Verified user:', users[0]);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

createTestAdmin();