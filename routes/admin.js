const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get admin dashboard statistics
router.get('/dashboard', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        // Get various statistics
        const [totalCustomers] = await executeQuery('SELECT COUNT(*) as count FROM customers');
        const [totalAccounts] = await executeQuery('SELECT COUNT(*) as count FROM accounts WHERE status = "active"');
        const [totalBalance] = await executeQuery('SELECT SUM(balance) as total FROM accounts WHERE status = "active"');
        const [totalTransactions] = await executeQuery('SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = CURDATE()');

        // Get pending loans count
        const [pendingLoans] = await executeQuery('SELECT COUNT(*) as count FROM loans WHERE status = "pending"');

        const stats = {
            totalCustomers: totalCustomers[0]?.count || 0,
            totalAccounts: totalAccounts[0]?.count || 0,
            totalBalance: totalBalance[0]?.total || 0,
            todayTransactions: totalTransactions[0]?.count || 0,
            pendingLoans: pendingLoans[0]?.count || 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve dashboard data'
        });
    }
});

// Get all customers
router.get('/customers', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const customers = await executeQuery(
            `SELECT c.*, u.username, u.email, u.is_active, u.created_at as user_created_at
             FROM customers c
             JOIN users u ON c.user_id = u.id
             ORDER BY c.created_at DESC
             LIMIT 100`
        );

        res.json({
            success: true,
            data: customers
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve customers'
        });
    }
});

// Get all loans (for admin)
router.get('/loans', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT l.*, lt.name as loan_type, 
                   CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                   u.email, c.phone
            FROM loans l
            JOIN loan_types lt ON l.loan_type_id = lt.id
            JOIN customers c ON l.customer_id = c.id
            JOIN users u ON c.user_id = u.id
        `;
        
        if (status) {
            query += ` WHERE l.status = '${status}'`;
        }
        
        query += ` ORDER BY l.created_at DESC LIMIT 50`;

        const loans = await executeQuery(query);

        res.json({
            success: true,
            data: loans
        });

    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve loans'
        });
    }
});

// Approve or reject loan
router.patch('/loans/:id/status', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const loanId = req.params.id;
        const { status, notes } = req.body;
        
        // Validate status
        const validStatuses = ['approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be approved or rejected'
            });
        }

        // Update loan status
        const result = await executeQuery(
            'UPDATE loans SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            [status, notes || null, req.user.id, loanId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        res.json({
            success: true,
            message: `Loan ${status} successfully`
        });

    } catch (error) {
        console.error('Update loan status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update loan status'
        });
    }
});

// Get specific customer details
router.get('/customers/:id', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const customerId = req.params.id;
        
        const customers = await executeQuery(
            `SELECT c.*, u.username, u.email, u.is_active, u.created_at as user_created_at
             FROM customers c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?`,
            [customerId]
        );

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.json({
            success: true,
            data: customers[0]
        });

    } catch (error) {
        console.error('Get customer details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve customer details'
        });
    }
});

// Update customer status
router.patch('/customers/:id/status', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const customerId = req.params.id;
        const { status } = req.body;
        
        // Get user_id for this customer
        const customer = await executeQuery('SELECT user_id FROM customers WHERE id = ?', [customerId]);
        
        if (customer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Update user status
        await executeQuery(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [status, customer[0].user_id]
        );

        res.json({
            success: true,
            message: 'Customer status updated successfully'
        });

    } catch (error) {
        console.error('Update customer status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update customer status'
        });
    }
});

// Get all accounts (admin view)
router.get('/accounts', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const accounts = await executeQuery(
            `SELECT a.*, at.name as account_type_name, 
                    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                    c.first_name, c.last_name, u.email,
                    b.name as branch_name
             FROM accounts a
             JOIN account_types at ON a.account_type_id = at.id
             JOIN customers c ON a.customer_id = c.id
             JOIN users u ON c.user_id = u.id
             JOIN branches b ON a.branch_id = b.id
             ORDER BY a.created_at DESC
             LIMIT 100`
        );

        res.json({
            success: true,
            data: accounts
        });

    } catch (error) {
        console.error('Get admin accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve accounts'
        });
    }
});

// Update account status (freeze/unfreeze accounts)
router.patch('/accounts/:id/status', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const accountId = req.params.id;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['active', 'inactive', 'frozen', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: active, inactive, frozen, closed'
            });
        }

        // Update account status
        const result = await executeQuery(
            'UPDATE accounts SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, accountId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        res.json({
            success: true,
            message: `Account status updated to ${status} successfully`
        });

    } catch (error) {
        console.error('Update account status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update account status'
        });
    }
});

// Get all transactions (admin view)
router.get('/transactions', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const transactions = await executeQuery(
            `SELECT t.*, a.account_number,
                    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                    c.first_name, c.last_name
             FROM transactions t
             JOIN accounts a ON t.account_id = a.id
             JOIN customers c ON a.customer_id = c.id
             ORDER BY t.created_at DESC
             LIMIT ${parseInt(limit)}`
        );

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Get admin transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve transactions'
        });
    }
});

// Get system reports
router.get('/reports/:type', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const reportType = req.params.type;
        let reportData = {};

        switch (reportType) {
            case 'daily':
                const dailyStats = await executeQuery(`
                    SELECT 
                        COUNT(DISTINCT t.account_id) as active_accounts,
                        COUNT(t.id) as total_transactions,
                        SUM(CASE WHEN t.transaction_type = 'deposit' THEN t.amount ELSE 0 END) as total_deposits,
                        SUM(CASE WHEN t.transaction_type = 'withdraw' THEN t.amount ELSE 0 END) as total_withdrawals,
                        SUM(CASE WHEN t.transaction_type IN ('transfer_in', 'transfer_out') THEN t.amount ELSE 0 END) as total_transfers
                    FROM transactions t
                    WHERE DATE(t.created_at) = CURDATE()
                `);
                reportData = dailyStats[0];
                break;

            case 'monthly':
                const monthlyStats = await executeQuery(`
                    SELECT 
                        COUNT(DISTINCT c.id) as total_customers,
                        COUNT(DISTINCT a.id) as total_accounts,
                        SUM(a.balance) as total_balance,
                        COUNT(t.id) as total_transactions
                    FROM customers c
                    LEFT JOIN accounts a ON c.id = a.customer_id
                    LEFT JOIN transactions t ON a.id = t.account_id AND MONTH(t.created_at) = MONTH(CURDATE())
                `);
                reportData = monthlyStats[0];
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report type'
                });
        }

        res.json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report'
        });
    }
});

// SQL Query interface
router.post('/sql-query', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Query is required'
            });
        }

        // ALL SQL OPERATIONS ALLOWED FOR ADMIN
        // No restrictions - admin has full database access
        // WARNING: Use with caution! This allows DROP, TRUNCATE, ALTER, CREATE, etc.
        
        // Use query() instead of execute() to support all SQL commands including transactions
        const { getConnection } = require('../config/database');
        const connection = await getConnection();
        
        try {
            const [result] = await connection.query(query);
            connection.release();
            
            return res.json({
                success: true,
                data: result,
                message: 'Query executed successfully'
            });
        } catch (queryError) {
            connection.release();
            throw queryError;
        }

    } catch (error) {
        console.error('SQL query error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Query execution failed',
            error: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
        });
    }
});

module.exports = router;