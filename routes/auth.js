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
    body('password').isLength({ min: 6 }),
    body('firstName').isLength({ min: 1, max: 50 }),
    body('lastName').isLength({ min: 1, max: 50 }),
    body('dateOfBirth').optional().isISO8601(),
    body('phone').optional(),
    body('ssn').optional()
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
            'SELECT id FROM users WHERE username = $1 OR email = $2',
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

        // Create user - PostgreSQL returns the inserted row with RETURNING
        const userResult = await executeQuery(
            'INSERT INTO users (username, email, password, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, email, passwordHash, 'customer', true]
        );

        const userId = userResult[0].id;

        // Create customer profile
        const customerResult = await executeQuery(
            `INSERT INTO customers (user_id, first_name, last_name, date_of_birth, phone, 
             address, city, state, zip_code, ssn) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
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

        const customerId = customerResult[0].id;

        // Create Checking Account with $5,000 initial balance
        const checkingAccountNumber = `ACC${customerId.toString().padStart(6, '0')}001`;
        const checkingResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_number, account_type, balance, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [customerId, checkingAccountNumber, 'checking', 5000.00, 'active']
        );

        const checkingAccountId = checkingResult[0].id;

        // Add initial deposit transaction for checking
        const txId1 = require('crypto').randomUUID();
        await executeQuery(
            `INSERT INTO transactions (id, account_id, transaction_type, amount, description, balance_after)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [txId1, checkingAccountId, 'deposit', 5000.00, 'Welcome bonus - Initial deposit', 5000.00]
        );

        // Create Savings Account with $3,000 initial balance
        const savingsAccountNumber = `ACC${customerId.toString().padStart(6, '0')}002`;
        const savingsResult = await executeQuery(
            `INSERT INTO accounts (customer_id, account_number, account_type, balance, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [customerId, savingsAccountNumber, 'savings', 3000.00, 'active']
        );

        const savingsAccountId = savingsResult[0].id;

        // Add initial deposit transaction for savings
        const txId2 = require('crypto').randomUUID();
        await executeQuery(
            `INSERT INTO transactions (id, account_id, transaction_type, amount, description, balance_after)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [txId2, savingsAccountId, 'deposit', 3000.00, 'Welcome bonus - Initial deposit', 3000.00]
        );

        console.log(`✅ Registration complete for ${username}`);

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
                totalBalance: 8000
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
            'SELECT * FROM users WHERE username = $1 AND is_active = true',
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
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get customer ID
        const customerData = await executeQuery(
            'SELECT id FROM customers WHERE user_id = $1',
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
             WHERE u.id = $1`,
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
            'SELECT u.password, u.username FROM users u WHERE u.id = $1',
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
        const isValid = await bcrypt.compare(password, users[0].password);
        
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