const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery, getConnection } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get user's crypto portfolio
router.get('/portfolio', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can access crypto portfolio'
            });
        }

        const portfolio = await executeQuery(
            `SELECT * FROM crypto_wallets WHERE customer_id = ? ORDER BY crypto_symbol`,
            [req.user.customerId]
        );

        // Calculate current values with mock prices
        const mockPrices = { BTC: 45230, ETH: 2890, ADA: 0.52 };
        const portfolioWithValues = portfolio.map(crypto => ({
            ...crypto,
            current_price: mockPrices[crypto.crypto_symbol] || 0,
            current_value: (parseFloat(crypto.amount) * (mockPrices[crypto.crypto_symbol] || 0)).toFixed(2),
            profit_loss: ((mockPrices[crypto.crypto_symbol] || 0) - parseFloat(crypto.average_price)) * parseFloat(crypto.amount)
        }));

        res.json({
            success: true,
            data: portfolioWithValues
        });

    } catch (error) {
        console.error('Get crypto portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve crypto portfolio'
        });
    }
});

// Buy cryptocurrency
router.post('/buy', authenticateToken, [
    body('cryptoSymbol').isIn(['BTC', 'ETH', 'ADA']).withMessage('Invalid cryptocurrency'),
    body('usdAmount').isFloat({ min: 1 }).withMessage('USD amount must be at least $1'),
    body('accountId').isInt().withMessage('Valid account ID is required')
], async (req, res) => {
    console.log('🔵 Crypto buy request received:', req.body);
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();
        console.log('🔵 Transaction started');
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        if (req.user.role !== 'customer') {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Only customers can buy cryptocurrency'
            });
        }

        const { cryptoSymbol, usdAmount, accountId } = req.body;

        // Check if user owns the account
        const [account] = await connection.execute(
            'SELECT balance FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
            [accountId, req.user.customerId]
        );

        if (account.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Account not found or access denied'
            });
        }

        const currentBalance = parseFloat(account[0].balance);
        if (currentBalance < usdAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Insufficient funds in account'
            });
        }

        // Mock crypto prices
        const cryptoPrices = { BTC: 45230, ETH: 2890, ADA: 0.52 };
        const cryptoNames = { BTC: 'Bitcoin', ETH: 'Ethereum', ADA: 'Cardano' };
        
        const pricePerUnit = cryptoPrices[cryptoSymbol];
        const cryptoAmount = usdAmount / pricePerUnit;

        // Deduct USD from account
        const newBalance = currentBalance - usdAmount;
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newBalance, accountId]
        );

        // Record the withdrawal transaction
        await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'crypto_purchase', ?, ?, ?, NOW())`,
            [accountId, usdAmount, `Crypto purchase: ${cryptoAmount.toFixed(8)} ${cryptoSymbol}`, newBalance]
        );

        // Update or create crypto wallet entry
        const [existingWallet] = await connection.execute(
            'SELECT * FROM crypto_wallets WHERE customer_id = ? AND crypto_symbol = ?',
            [req.user.customerId, cryptoSymbol]
        );

        let walletId;
        if (existingWallet.length > 0) {
            // Update existing wallet
            walletId = existingWallet[0].id;
            const currentAmount = parseFloat(existingWallet[0].amount);
            const currentAvgPrice = parseFloat(existingWallet[0].average_price);
            const totalCurrentValue = currentAmount * currentAvgPrice;
            const newTotalValue = totalCurrentValue + usdAmount;
            const newTotalAmount = currentAmount + cryptoAmount;
            const newAvgPrice = newTotalValue / newTotalAmount;

            await connection.execute(
                'UPDATE crypto_wallets SET amount = ?, average_price = ?, updated_at = NOW() WHERE customer_id = ? AND crypto_symbol = ?',
                [newTotalAmount, newAvgPrice, req.user.customerId, cryptoSymbol]
            );
        } else {
            // Create new wallet entry
            const [insertResult] = await connection.execute(
                'INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [req.user.customerId, cryptoSymbol, cryptoNames[cryptoSymbol], cryptoAmount, pricePerUnit]
            );
            walletId = insertResult.insertId;
        }
        
        // Log crypto activity
        await connection.execute(
            `INSERT INTO crypto_activity_log (customer_id, action, crypto_type, amount, created_at)
             VALUES (?, 'BUY', ?, ?, NOW())`,
            [req.user.customerId, cryptoSymbol, cryptoAmount]
        );

        await connection.commit();
        console.log('✅ Crypto purchase committed successfully');

        res.json({
            success: true,
            message: 'Cryptocurrency purchased successfully',
            data: {
                cryptoSymbol,
                cryptoAmount: cryptoAmount.toFixed(8),
                usdAmount,
                pricePerUnit,
                newAccountBalance: newBalance.toFixed(2)
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Buy crypto error:', error);
        res.status(500).json({
            success: false,
            message: 'Cryptocurrency purchase failed'
        });
    } finally {
        connection.release();
    }
});

// Sell cryptocurrency
router.post('/sell', authenticateToken, [
    body('cryptoSymbol').isIn(['BTC', 'ETH', 'ADA']).withMessage('Invalid cryptocurrency'),
    body('cryptoAmount').isFloat({ min: 0.00000001 }).withMessage('Crypto amount must be greater than 0'),
    body('accountId').isInt().withMessage('Valid account ID is required')
], async (req, res) => {
    console.log('🔴 Crypto sell request received:', req.body);
    const connection = await getConnection();
    
    try {
        await connection.beginTransaction();
        console.log('🔴 Sell transaction started');
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        if (req.user.role !== 'customer') {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Only customers can sell cryptocurrency'
            });
        }

        const { cryptoSymbol, cryptoAmount, accountId } = req.body;

        // Check if user owns the account
        const [account] = await connection.execute(
            'SELECT balance FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
            [accountId, req.user.customerId]
        );

        if (account.length === 0) {
            await connection.rollback();
            return res.status(403).json({
                success: false,
                message: 'Account not found or access denied'
            });
        }

        // Check crypto holdings
        const [wallet] = await connection.execute(
            'SELECT * FROM crypto_wallets WHERE customer_id = ? AND crypto_symbol = ?',
            [req.user.customerId, cryptoSymbol]
        );

        if (wallet.length === 0 || parseFloat(wallet[0].amount) < cryptoAmount) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Insufficient cryptocurrency holdings'
            });
        }

        // Mock crypto prices
        const cryptoPrices = { BTC: 45230, ETH: 2890, ADA: 0.52 };
        const pricePerUnit = cryptoPrices[cryptoSymbol];
        const usdAmount = cryptoAmount * pricePerUnit;

        // Add USD to account
        const currentBalance = parseFloat(account[0].balance);
        const newBalance = currentBalance + usdAmount;
        await connection.execute(
            'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
            [newBalance, accountId]
        );

        // Record the deposit transaction
        await connection.execute(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'crypto_sale', ?, ?, ?, NOW())`,
            [accountId, usdAmount, `Crypto sale: ${cryptoAmount.toFixed(8)} ${cryptoSymbol}`, newBalance]
        );

        // Update crypto wallet
        const newCryptoAmount = parseFloat(wallet[0].amount) - cryptoAmount;
        if (newCryptoAmount <= 0.00000001) {
            // Remove wallet entry if amount is negligible
            await connection.execute(
                'DELETE FROM crypto_wallets WHERE customer_id = ? AND crypto_symbol = ?',
                [req.user.customerId, cryptoSymbol]
            );
        } else {
            await connection.execute(
                'UPDATE crypto_wallets SET amount = ?, updated_at = NOW() WHERE customer_id = ? AND crypto_symbol = ?',
                [newCryptoAmount, req.user.customerId, cryptoSymbol]
            );
        }

        // Log crypto activity
        await connection.execute(
            `INSERT INTO crypto_activity_log (customer_id, action, crypto_type, amount, created_at)
             VALUES (?, 'SELL', ?, ?, NOW())`,
            [req.user.customerId, cryptoSymbol, cryptoAmount]
        );

        await connection.commit();
        console.log('✅ Crypto sale committed successfully');

        res.json({
            success: true,
            message: 'Cryptocurrency sold successfully',
            data: {
                cryptoSymbol,
                cryptoAmount: cryptoAmount.toFixed(8),
                usdAmount: usdAmount.toFixed(2),
                pricePerUnit,
                newAccountBalance: newBalance.toFixed(2),
                remainingCrypto: newCryptoAmount > 0.00000001 ? newCryptoAmount.toFixed(8) : '0'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Sell crypto error:', error);
        res.status(500).json({
            success: false,
            message: 'Cryptocurrency sale failed'
        });
    } finally {
        connection.release();
    }
});

// Get crypto transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can access crypto transactions'
            });
        }

        const transactions = await executeQuery(
            `SELECT ct.*, a.account_number 
             FROM crypto_transactions ct
             JOIN accounts a ON ct.account_id = a.id
             WHERE ct.customer_id = ?
             ORDER BY ct.created_at DESC
             LIMIT 50`,
            [req.user.customerId]
        );

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error('Get crypto transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve crypto transactions'
        });
    }
});

module.exports = router;