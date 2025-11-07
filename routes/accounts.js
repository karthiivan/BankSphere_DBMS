const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get user accounts
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'customer') {
            // Customers can only see their own accounts
            query = `
                SELECT a.id, a.customer_id, a.account_number, a.account_type, 
                       a.balance, a.currency, a.status, a.interest_rate, 
                       a.overdraft_limit, a.created_at, a.updated_at
                FROM accounts a
                WHERE a.customer_id = $1 AND a.status != 'closed'
                ORDER BY a.created_at DESC
            `;
            params = [req.user.customerId];
        } else {
            // Employees and admins can see all accounts
            query = `
                SELECT a.id, a.customer_id, a.account_number, a.account_type,
                       a.balance, a.currency, a.status, a.interest_rate,
                       a.overdraft_limit, a.created_at, a.updated_at,
                       c.first_name, c.last_name
                FROM accounts a
                JOIN customers c ON a.customer_id = c.id
                WHERE a.status != 'closed'
                ORDER BY a.created_at DESC
                LIMIT 100
            `;
            params = [];
        }

        const accounts = await executeQuery(query, params);

        res.json({
            success: true,
            data: accounts
        });

    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve accounts'
        });
    }
});

// Get specific account details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const accountId = req.params.id;
        
        let query, params;

        if (req.user.role === 'customer') {
            // Customers can only see their own accounts
            query = `
                SELECT a.id, a.customer_id, a.account_number, a.account_type,
                       a.balance, a.currency, a.status, a.interest_rate,
                       a.overdraft_limit, a.created_at, a.updated_at
                FROM accounts a
                WHERE a.id = $1 AND a.customer_id = $2
            `;
            params = [accountId, req.user.customerId];
        } else {
            // Employees and admins can see any account
            query = `
                SELECT a.id, a.customer_id, a.account_number, a.account_type,
                       a.balance, a.currency, a.status, a.interest_rate,
                       a.overdraft_limit, a.created_at, a.updated_at,
                       c.first_name, c.last_name, c.phone, u.email
                FROM accounts a
                JOIN customers c ON a.customer_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE a.id = $1
            `;
            params = [accountId];
        }

        const accounts = await executeQuery(query, params);

        if (accounts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        res.json({
            success: true,
            data: accounts[0]
        });

    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve account'
        });
    }
});

// Create new account (Employee/Admin only)
router.post('/', authenticateToken, requireRole(['employee', 'admin']), [
    body('customerId').isInt().withMessage('Valid customer ID is required'),
    body('accountTypeId').isInt().withMessage('Valid account type ID is required'),
    body('branchId').isInt().withMessage('Valid branch ID is required'),
    body('initialDeposit').isFloat({ min: 0 }).withMessage('Initial deposit must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { customerId, accountTypeId, branchId, initialDeposit } = req.body;

        // Generate account number
        const accountNumber = 'ACC' + Date.now().toString().slice(-9);

        // Create account
        const result = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, branch_id, account_number, 
                                 balance, status, created_at) 
             VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP) RETURNING id`,
            [customerId, accountTypeId, branchId, accountNumber, initialDeposit]
        );

        const accountId = result[0].id;

        // Create initial deposit transaction if amount > 0
        if (initialDeposit > 0) {
            await executeQuery(
                `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                         balance_after, created_at)
                 VALUES ($1, 'deposit', $2, 'Initial deposit', $3, CURRENT_TIMESTAMP)`,
                [accountId, initialDeposit, initialDeposit]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                accountId,
                accountNumber,
                balance: initialDeposit
            }
        });

    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account'
        });
    }
});

// Update account status (Employee/Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['employee', 'admin']), [
    body('status').isIn(['active', 'inactive', 'frozen', 'closed']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const accountId = req.params.id;
        const { status } = req.body;

        // Update account status
        const result = await executeQuery(
            'UPDATE accounts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
            message: 'Account status updated successfully'
        });

    } catch (error) {
        console.error('Update account status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update account status'
        });
    }
});

// Get account transactions
router.get('/:id/transactions', authenticateToken, async (req, res) => {
    try {
        const accountId = req.params.id;
        const { limit = 50, offset = 0 } = req.query;

        // Check if user has access to this account
        if (req.user.role === 'customer') {
            const accountCheck = await executeQuery(
                'SELECT id FROM accounts WHERE id = $1 AND customer_id = $2',
                [accountId, req.user.customerId]
            );

            if (accountCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        const transactions = await executeQuery(
            `SELECT * FROM transactions 
             WHERE account_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [accountId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Get account transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve transactions'
        });
    }
});

module.exports = router;