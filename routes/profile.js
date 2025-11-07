const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const profile = await executeQuery(
            `SELECT u.username, u.email, u.role, u.created_at,
                    c.first_name, c.last_name, c.date_of_birth, c.phone,
                    c.address, c.city, c.state, c.zip_code
             FROM users u
             LEFT JOIN customers c ON u.id = c.user_id
             WHERE u.id = ?`,
            [req.user.userId]
        );

        if (profile.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.json({
            success: true,
            data: profile[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile'
        });
    }
});

// Get dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get account summary
        const accounts = await executeQuery(
            `SELECT a.*, at.name as account_type_name
             FROM accounts a
             JOIN account_types at ON a.account_type_id = at.id
             WHERE a.customer_id = ? AND a.status = 'active'`,
            [req.user.customerId]
        );

        // Get recent transactions
        const transactions = await executeQuery(
            `SELECT t.*, a.account_number
             FROM transactions t
             JOIN accounts a ON t.account_id = a.id
             WHERE a.customer_id = ?
             ORDER BY t.created_at DESC
             LIMIT 10`,
            [req.user.customerId]
        );

        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

        res.json({
            success: true,
            data: {
                accounts,
                recentTransactions: transactions,
                totalBalance,
                accountCount: accounts.length
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve dashboard data'
        });
    }
});

module.exports = router;