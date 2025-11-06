const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authLimit } = require('../middleware/security');
const { authenticateToken } = require('../middleware/auth');

// Register new user
router.post('/register', authLimit, [
    body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }), // Simplified - just minimum 6 characters
    body('firstName').isLength({ min: 1, max: 50 }),
    body('lastName').isLength({ min: 1, max: 50 }),
    body('dateOfBirth').optional().isISO8601(),
    body('phone').optional().matches(/^\(\d{3}\) \d{3}-\d{4}$/),
    body('ssn').optional().matches(/^\d{3}-\d{2}-\d{4}$/)
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

        const {
            username, email, password, firstName, lastName,
            dateOfBirth, phone, address, city, state, zipCode, ssn
        } = req.body;

        // Check if user already exists
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userResult = await executeQuery(
            'INSERT INTO users (username, email, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [username, email, passwordHash, 'customer', 1]
        );

        const userId = userResult.insertId;

        // Create customer profile with default values for optional fields
        const customerResult = await executeQuery(
            `INSERT INTO customers (user_id, first_name, last_name, date_of_birth, phone, 
             address, city, state, zip_code, ssn, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                userId, 
                firstName, 
                lastName, 
                dateOfBirth || '2000-01-01', 
                phone || '(000) 000-0000', 
                address || 'N/A', 
                city || 'N/A', 
                state || 'XX', 
                zipCode || '00000', 
                ssn || '000-00-0000'
            ]
        );

        const customerId = customerResult.insertId;

        // Set up biometric authentication (placeholder - ready for enrollment)
        console.log(`Setting up biometric authentication for ${username}...`);
        const bioId = require('crypto').randomUUID();
        await executeQuery(
            `INSERT INTO biometric_data (id, user_id, biometric_type, encrypted_template, is_active, created_at)
             VALUES (?, ?, 'fingerprint', 'PENDING_ENROLLMENT', 1, NOW())`,
            [bioId, userId]
        );
        console.log('✅ Biometric authentication ready for enrollment');

        // Automatically create accounts with initial balance
        console.log(`Creating accounts for new customer ${customerId}...`);

        // Get account types
        const accountTypes = await executeQuery('SELECT id, name FROM account_types');
        const checkingTypeId = accountTypes.find(t => t.name === 'Checking')?.id || 1;
        const savingsTypeId = accountTypes.find(t => t.name === 'Savings')?.id || 2;

        // Get first branch
        const branches = await executeQuery('SELECT id FROM branches LIMIT 1');
        const branchId = branches.length > 0 ? branches[0].id : 1;

        // Create Checking Account with $5,000 initial balance
        const checkingAccountNumber = `ACC${customerId.toString().padStart(3, '0')}000001`;
        const checkingResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
             VALUES (?, ?, ?, 5000.00, ?, 'active', NOW())`,
            [customerId, checkingTypeId, checkingAccountNumber, branchId]
        );

        // Add initial deposit transaction for checking
        await executeQuery(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'deposit', 5000.00, 'Welcome bonus - Initial deposit', 5000.00, NOW())`,
            [checkingResult.insertId]
        );

        // Create Savings Account with $3,000 initial balance
        const savingsAccountNumber = `ACC${customerId.toString().padStart(3, '0')}000002`;
        const savingsResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_type_id, account_number, balance, branch_id, status, created_at)
             VALUES (?, ?, ?, 3000.00, ?, 'active', NOW())`,
            [customerId, savingsTypeId, savingsAccountNumber, branchId]
        );

        // Add initial deposit transaction for savings
        await executeQuery(
            `INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
             VALUES (?, 'deposit', 3000.00, 'Welcome bonus - Initial deposit', 3000.00, NOW())`,
            [savingsResult.insertId]
        );

        // Add minimal crypto holdings (just placeholders with 0 balance)
        const cryptoHoldings = [
            { symbol: 'BTC', name: 'Bitcoin', amount: 0, avgPrice: 45000.00 },
            { symbol: 'ETH', name: 'Ethereum', amount: 0, avgPrice: 2900.00 },
            { symbol: 'ADA', name: 'Cardano', amount: 0, avgPrice: 0.50 }
        ];

        for (const crypto of cryptoHoldings) {
            await executeQuery(
                `INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [customerId, crypto.symbol, crypto.name, crypto.amount, crypto.avgPrice]
            );
        }

        // Create welcome support ticket
        const ticketId = require('crypto').randomUUID();
        await executeQuery(
            `INSERT INTO support_tickets (id, customer_id, subject, description, status, priority, created_at)
             VALUES (?, ?, ?, ?, 'open', 'low', NOW())`,
            [ticketId, customerId, 'Welcome to BankSphere!', 
             'Thank you for joining BankSphere! Your accounts are ready. If you need any assistance, feel free to reach out to our support team.']
        );
        console.log('✅ Welcome ticket created');

        // Create initial budget categories
        const budgetCategories = [
            { name: 'Groceries', amount: 500, period: 'monthly' },
            { name: 'Entertainment', amount: 200, period: 'monthly' },
            { name: 'Transportation', amount: 300, period: 'monthly' }
        ];

        for (const budget of budgetCategories) {
            const budgetId = require('crypto').randomUUID();
            await executeQuery(
                `INSERT INTO budgets (id, customer_id, name, total_amount, period, start_date, end_date, status, created_at)
                 VALUES (?, ?, ?, ?, ?, DATE_FORMAT(NOW(), '%Y-%m-01'), LAST_DAY(NOW()), 'active', NOW())`,
                [budgetId, customerId, budget.name, budget.amount, budget.period]
            );
        }
        console.log('✅ Budget categories created');

        console.log(`\n✅ Registration complete for ${username}:`);
        console.log(`   - Checking: ${checkingAccountNumber} ($5,000)`);
        console.log(`   - Savings: ${savingsAccountNumber} ($3,000)`);
        console.log(`   - Crypto wallets: Ready (0 balance)`);
        console.log(`   - Biometric: Ready for enrollment`);
        console.log(`   - Budgets: 3 categories set up`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully with initial accounts',
            data: {
                username,
                userId,
                customerId,
                accounts: [
                    { type: 'Checking', number: checkingAccountNumber, balance: 5000 },
                    { type: 'Savings', number: savingsAccountNumber, balance: 3000 }
                ],
                totalBalance: 8000,
                biometricReady: true,
                budgetsCreated: 3
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// Login user
router.post('/login', authLimit, [
    body('username').notEmpty(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const { username, password } = req.body;

        // Get user
        const users = await executeQuery(
            'SELECT * FROM users WHERE username = ? AND is_active = 1',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get customer ID
        const customerData = await executeQuery(
            'SELECT id FROM customers WHERE user_id = ?',
            [user.id]
        );
        const customerId = customerData.length > 0 ? customerData[0].id : null;

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role,
                customerId: customerId
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                customerId: customerId
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const users = await executeQuery(
            `SELECT u.id, u.username, u.email, u.role, u.created_at,
                    c.id as customerId, c.first_name, c.last_name
             FROM users u 
             LEFT JOIN customers c ON u.id = c.user_id 
             WHERE u.id = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                customerId: user.customerId,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Verify password for transactions
router.post('/verify-password', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }
        
        // Get user's hashed password and username
        const users = await executeQuery(
            'SELECT u.password_hash, u.username FROM users u WHERE u.id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // For testing: Accept password123 for all quick-registered accounts (username starts with 'user')
        if (users[0].username && users[0].username.startsWith('user') && password === 'password123') {
            return res.json({
                success: true,
                message: 'Password verified (quick account)'
            });
        }
        
        // Compare password with hash
        const isValid = await bcrypt.compare(password, users[0].password_hash);
        
        if (isValid) {
            res.json({
                success: true,
                message: 'Password verified'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }
        
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Password verification failed'
        });
    }
});

module.exports = router;