/**
 * Automatic Database Setup Script for Render Deployment
 * This runs the PostgreSQL schema automatically when the app starts
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    console.log('🔄 Starting database setup...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');

        // Check if tables already exist
        const checkTables = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        if (checkTables.rows[0].exists) {
            console.log('✅ Database already initialized - skipping setup');
            client.release();
            await pool.end();
            return true;
        }

        console.log('🔄 Database is empty - running schema setup...');
        
        // Read the PostgreSQL schema file
        const schemaPath = path.join(__dirname, '..', 'complete_database_schema_postgresql.sql');
        
        if (!fs.existsSync(schemaPath)) {
            console.error('❌ Schema file not found:', schemaPath);
            client.release();
            await pool.end();
            return false;
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema
        console.log('🔄 Executing database schema...');
        await client.query(schema);
        
        console.log('✅ Database schema created successfully!');
        console.log('✅ Tables, indexes, and sample data imported');
        
        client.release();
        await pool.end();
        
        console.log('');
        console.log('🎉 Database setup completed!');
        console.log('📋 Default credentials:');
        console.log('   Admin: username=admin, password=admin123');
        console.log('   Customer: username=john_doe, password=password123');
        console.log('');
        
        return true;

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('Error details:', error);
        await pool.end();
        
        // Don't fail the app start if DB setup fails - allow retry
        console.log('⚠️  Continuing app startup anyway - you may need to run setup manually');
        return false;
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase };
