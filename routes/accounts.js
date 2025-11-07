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
                SELECT a.*, at.name as account_type_name, at.description as account_type_description,
                       b.name as branch_name
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN branches b ON a.branch_id = b.id
                WHERE a.customer_id = ? AND a.status != 'closed'
                ORDER BY a.created_at DESC
            `;
            params = [req.user.customerId];
        } else {
            // Employees and admins can see all accounts
            query = `
                SELECT a.*, at.name as account_type_name, at.description as account_type_description,
                       b.name as branch_name, c.first_name, c.last_name
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN branches b ON a.branch_id = b.id
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
                SELECT a.*, at.name as account_type_name, at.description as account_type_description,
                       b.name as branch_name, b.address as branch_address
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN branches b ON a.branch_id = b.id
                WHERE a.id = ? AND a.customer_id = ?
            `;
            params = [accountId, req.user.customerId];
        } else {
            // Employees and admins can see any account
            query = `
                SELECT a.*, at.name as account_type_name, at.description as account_type_description,
                       b.name as branch_name, b.address as branch_address,
                       c.first_name, c.last_name, c.phone, u.email
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                JOIN branches b ON a.branch_id = b.id
                JOIN customers c ON a.customer_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE a.id = ?
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
             VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
            [customerId, accountTypeId, branchId, accountNumber, initialDeposit]
        );

        const accountId = result.insertId;

        // Create initial deposit transaction if amount > 0
        if (initialDeposit > 0) {
            await executeQuery(
                `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                         balance_after, created_at)
                 VALUES (?, 'deposit', ?, 'Initial deposit', ?, NOW())`,
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
                'SELECT id FROM accounts WHERE id = ? AND customer_id = ?',
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
             WHERE account_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
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