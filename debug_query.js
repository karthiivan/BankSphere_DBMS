const mysql = require('mysql2/promise');
require('dotenv').config();

async function testQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bank_management'
    });

    try {
        const page = 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        
        console.log('Parameters:', { page, limit, offset });
        console.log('Types:', { 
            page: typeof page, 
            limit: typeof limit, 
            offset: typeof offset 
        });

        const query = `
            SELECT c.*, u.username, u.email, u.is_active
            FROM customers c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC LIMIT ${offset}, ${limit}
        `;
        
        console.log('Query:', query);
        console.log('Params:', []);
        
        const [result] = await connection.execute(query, []);
        console.log('Success! Rows:', result.length);
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('SQL:', error.sql);
    } finally {
        await connection.end();
    }
}

testQuery();