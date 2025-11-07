/**
 * PostgreSQL Query Helper Utility
 * Converts MySQL-style queries to PostgreSQL-style queries
 */

/**
 * Convert MySQL query placeholders (?) to PostgreSQL numbered placeholders ($1, $2, etc.)
 * @param {string} query - The SQL query with ? placeholders
 * @param {Array} params - The parameters array
 * @returns {Object} - {query: string, params: Array}
 */
function convertQueryToPostgres(query, params = []) {
    let paramIndex = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Replace MySQL-specific syntax with PostgreSQL equivalents
    let finalQuery = convertedQuery
        // NOW() is the same in both, but we can replace CURRENT_TIMESTAMP if needed
        .replace(/INSERT INTO .+ VALUES \(.+\) RETURNING LAST_INSERT_ID\(\)/gi, match => {
            return match.replace('LAST_INSERT_ID()', '');
        })
        // Handle AUTO_INCREMENT references (though schema should already be converted)
        .replace(/AUTO_INCREMENT/gi, 'SERIAL');
    
    return {
        query: finalQuery,
        params
    };
}

/**
 * Simulate MySQL's insertId behavior for PostgreSQL
 * PostgreSQL uses RETURNING id to get the inserted ID
 * @param {string} query - INSERT query
 * @returns {string} - Modified query with RETURNING clause
 */
function addReturningClause(query) {
    if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
        return `${query} RETURNING id`;
    }
    return query;
}

/**
 * Extract insertId from PostgreSQL result
 * @param {Object} result - PostgreSQL query result
 * @returns {number|null} - The inserted ID or null
 */
function getInsertId(result) {
    if (result && result.rows && result.rows.length > 0 && result.rows[0].id) {
        return result.rows[0].id;
    }
    return null;
}

/**
 * Convert MySQL result format to match expected format
 * @param {Object} pgResult - PostgreSQL result object
 * @returns {Array|Object} - Converted result
 */
function convertResult(pgResult) {
    if (!pgResult) return [];
    
    // For INSERT/UPDATE/DELETE, add insertId and affectedRows
    if (pgResult.command === 'INSERT' || pgResult.command === 'UPDATE' || pgResult.command === 'DELETE') {
        return {
            rows: pgResult.rows || [],
            insertId: getInsertId(pgResult),
            affectedRows: pgResult.rowCount || 0,
            command: pgResult.command
        };
    }
    
    // For SELECT queries, just return rows
    return pgResult.rows || [];
}

module.exports = {
    convertQueryToPostgres,
    addReturningClause,
    getInsertId,
    convertResult
};
