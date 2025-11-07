const { Pool } = require('pg');
require('dotenv').config();
const { convertQueryToPostgres, addReturningClause, convertResult } = require('./queryHelper');

// Database configuration for PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        
        // Test basic query
        const result = await client.query('SELECT 1 as test');
        console.log('✅ Database query test passed');
        
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Get connection from pool (wrapper to maintain compatibility)
async function getConnection() {
    try {
        const client = await pool.connect();
        
        // Add execute method for MySQL compatibility
        if (!client.execute) {
            client.execute = async function(query, params = []) {
                const converted = convertQueryToPostgres(query, params);
                let finalQuery = converted.query;
                
                // Add RETURNING clause for INSERT statements
                if (query.trim().toUpperCase().startsWith('INSERT')) {
                    finalQuery = addReturningClause(finalQuery);
                }
                
                const result = await this.query(finalQuery, converted.params);
                
                // Return in MySQL-like format: [rows, fields]
                return [result.rows, result.fields];
            };
        }
        
        return client;
    } catch (error) {
        console.error('❌ Failed to get database connection:', error);
        throw error;
    }
}

// Execute query with connection handling (auto-converts MySQL syntax to PostgreSQL)
async function executeQuery(query, params = []) {
    const client = await getConnection();
    try {
        const converted = convertQueryToPostgres(query, params);
        let finalQuery = converted.query;
        
        // Add RETURNING clause for INSERT statements only if not already present
        if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
            finalQuery = addReturningClause(finalQuery);
        }
        
        const result = await client.query(finalQuery, converted.params);
        
        // For INSERT queries with RETURNING clause, return rows directly
        if (query.trim().toUpperCase().startsWith('INSERT') && result.rows && result.rows.length > 0) {
            // If query already had RETURNING, just return rows array
            if (query.toUpperCase().includes('RETURNING')) {
                return result.rows;
            }
            // Otherwise return MySQL-compatible format
            return {
                insertId: result.rows[0].id,
                affectedRows: result.rowCount,
                rows: result.rows
            };
        }
        
        // For other queries, return rows array
        return result.rows;
    } finally {
        client.release();
    }
}

// Close all connections
async function closePool() {
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
}

module.exports = {
    pool,
    testConnection,
    getConnection,
    executeQuery,
    closePool
};