const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery, getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { transactionLimit } = require('../middleware/security');

// Make deposit
router.post('/deposit', authenticateToken, transactionLimit, [
    body('accountId').isInt().withMessage('Valid account ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description too long')
], async (req, res) => {
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { accountId, amount, description = 'Deposit' } = req.body;

        // Check if user owns the account (for customers)
        if (req.user.role === 'customer') {
            const [accountCheck] = await connection.execute(
                'SELECT id FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
                [accountId, req.user.customerId]
            );

            if (accountCheck.length === 0) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Account not found or access denied'
                });
            }
        }

        // Get current balance
        const [account] = await connection.execute(
            'SELECT balance FROM accounts WHERE id = ? AND status = "active"',
            [accountId]
        );

        if (account.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Account not found or inactive'
            });
        }

        const currentBalance = account[0].balance;
        const newBalance = currentBalance + amount;

        // Update account balance
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newBalance, accountId]
        );

        // Create transaction record
        const [transactionResult] = await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                     balance_after, created_at)
             VALUES (?, 'deposit', ?, ?, ?, NOW())`,
            [accountId, amount, description, newBalance]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Deposit successful',
            data: {
                transactionId: transactionResult.insertId,
                newBalance,
                amount
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Deposit failed'
        });
    } finally {
        connection.release();
    }
});

// Make withdrawal
router.post('/withdraw', authenticateToken, transactionLimit, [
    body('accountId').isInt().withMessage('Valid account ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description too long')
], async (req, res) => {
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { accountId, amount, description = 'Withdrawal' } = req.body;

        // Check if user owns the account (for customers)
        if (req.user.role === 'customer') {
            const [accountCheck] = await connection.execute(
                'SELECT id FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
                [accountId, req.user.customerId]
            );

            if (accountCheck.length === 0) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Account not found or access denied'
                });
            }
        }

        // Get current balance and account type
        const [account] = await connection.execute(
            `SELECT a.balance, at.minimum_balance 
             FROM accounts a 
             JOIN account_types at ON a.account_type_id = at.id 
             WHERE a.id = ? AND a.status = "active"`,
            [accountId]
        );

        if (account.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Account not found or inactive'
            });
        }

        const currentBalance = account[0].balance;
        const minimumBalance = account[0].minimum_balance || 0;
        const newBalance = currentBalance - amount;

        // Check if withdrawal would violate minimum balance
        if (newBalance < minimumBalance) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient funds. Minimum balance of $${minimumBalance} required.`
            });
        }

        // Update account balance
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newBalance, accountId]
        );

        // Create transaction record
        const [transactionResult] = await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                     balance_after, created_at)
             VALUES (?, 'withdraw', ?, ?, ?, NOW())`,
            [accountId, amount, description, newBalance]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Withdrawal successful',
            data: {
                transactionId: transactionResult.insertId,
                newBalance,
                amount
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Withdrawal failed'
        });
    } finally {
        connection.release();
    }
});

// Transfer money
router.post('/transfer', authenticateToken, transactionLimit, [
    body('fromAccountId').isInt().withMessage('Valid source account ID is required'),
    body('toAccountNumber').matches(/^ACC\d{9}$/).withMessage('Valid destination account number is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description too long')
], async (req, res) => {
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { fromAccountId, toAccountNumber, amount, description = 'Transfer' } = req.body;

        // Check if user owns the source account (for customers)
        if (req.user.role === 'customer') {
            const [accountCheck] = await connection.execute(
                'SELECT id FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
                [fromAccountId, req.user.customerId]
            );

            if (accountCheck.length === 0) {
                await connection.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Source account not found or access denied'
                });
            }
        }

        // Get source account details
        const [sourceAccount] = await connection.execute(
            `SELECT a.balance, at.minimum_balance 
             FROM accounts a 
             JOIN account_types at ON a.account_type_id = at.id 
             WHERE a.id = ? AND a.status = "active"`,
            [fromAccountId]
        );

        if (sourceAccount.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Source account not found or inactive'
            });
        }

        // Get destination account
        const [destAccount] = await connection.execute(
            'SELECT id, balance FROM accounts WHERE account_number = ? AND status = "active"',
            [toAccountNumber]
        );

        if (destAccount.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Destination account not found or inactive'
            });
        }

        // Check if trying to transfer to same account
        if (fromAccountId === destAccount[0].id) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot transfer to the same account'
            });
        }

        const sourceBalance = sourceAccount[0].balance;
        const minimumBalance = sourceAccount[0].minimum_balance || 0;
        const newSourceBalance = sourceBalance - amount;
        const newDestBalance = destAccount[0].balance + amount;

        // Check if transfer would violate minimum balance
        if (newSourceBalance < minimumBalance) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient funds. Minimum balance of $${minimumBalance} required.`
            });
        }

        // Update source account balance
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newSourceBalance, fromAccountId]
        );

        // Update destination account balance
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newDestBalance, destAccount[0].id]
        );

        // Create outgoing transaction record
        const [outTransactionResult] = await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                     balance_after, created_at)
             VALUES (?, 'transfer_out', ?, ?, ?, NOW())`,
            [fromAccountId, amount, `${description} to ${toAccountNumber}`, newSourceBalance]
        );

        // Create incoming transaction record
        const [inTransactionResult] = await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                     balance_after, created_at)
             VALUES (?, 'transfer_in', ?, ?, ?, NOW())`,
            [destAccount[0].id, amount, `${description} from account`, newDestBalance]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Transfer successful',
            data: {
                outTransactionId: outTransactionResult.insertId,
                inTransactionId: inTransactionResult.insertId,
                newSourceBalance,
                amount,
                destinationAccount: toAccountNumber
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Transfer error:', error);
        res.status(500).json({
            success: false,
            message: 'Transfer failed'
        });
    } finally {
        connection.release();
    }
});

// Get transaction history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const accountId = req.query.accountId;
        
        console.log('Transaction history request:', { 
            role: req.user.role, 
            customerId: req.user.customerId, 
            accountId, 
            limit, 
            offset 
        });
        
        let query, params;

        if (req.user.role === 'customer') {
            if (!req.user.customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID not found'
                });
            }
            // Customers can only see their own transactions
            if (accountId) {
                // Check if user owns the account
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

                query = `
                    SELECT t.*, a.account_number, a.account_type_id
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    WHERE t.account_id = ?
                    ORDER BY t.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                params = [accountId];
            } else {
                query = `
                    SELECT t.*, a.account_number, a.account_type_id
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    WHERE a.customer_id = ?
                    ORDER BY t.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                params = [req.user.customerId];
            }
        } else {
            // Employees and admins can see all transactions
            if (accountId) {
                query = `
                    SELECT t.*, a.account_number, a.account_type_id, c.first_name, c.last_name
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    JOIN customers c ON a.customer_id = c.id
                    WHERE t.account_id = ?
                    ORDER BY t.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                params = [accountId];
            } else {
                query = `
                    SELECT t.*, a.account_number, a.account_type_id, c.first_name, c.last_name
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    JOIN customers c ON a.customer_id = c.id
                    ORDER BY t.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `;
                params = [];
            }
        }

        const transactions = await executeQuery(query, params);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve transaction history'
        });
    }
});

module.exports = router;