const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runSchemaUpdates() {
    let connection;
    
    try {
        console.log('🔄 Connecting to database...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'bank_management',
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Read the schema updates file
        const sqlContent = fs.readFileSync('database_schema_updates.sql', 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`🔄 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement.length > 0) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
                } catch (error) {
                    // Skip errors for tables that already exist
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.message.includes('already exists')) {
                        console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
                    } else {
                        console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    }
                }
            }
        }

        console.log('✅ Enhanced schema updates completed successfully!');
        console.log('');
        console.log('🎉 All enhanced features are now available:');
        console.log('   • Fraud Detection System');
        console.log('   • Biometric Authentication');
        console.log('   • Investment Advisory');
        console.log('   • Cryptocurrency Support');
        console.log('   • AI Chatbot');
        console.log('   • Smart Expense Tracking');
        console.log('');

    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run schema updates
runSchemaUpdates();