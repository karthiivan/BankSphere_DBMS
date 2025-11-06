const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Import our new feature classes
const FraudDetectionSystem = require('../fraud_detection');
const BiometricAuthSystem = require('../biometric_auth');
const SmartInvestmentAdvisor = require('../investment_advisor');
const CryptocurrencyService = require('../crypto_service');
const AIChatbot = require('../ai_chatbot');
const SmartExpenseTracker = require('../expense_tracker');

// Initialize services
const fraudDetection = new FraudDetectionSystem();
const biometricAuth = new BiometricAuthSystem();
const investmentAdvisor = new SmartInvestmentAdvisor();
const cryptoService = new CryptocurrencyService();
const aiChatbot = new AIChatbot();
const expenseTracker = new SmartExpenseTracker();

// =============================================================================
// FRAUD DETECTION ROUTES
// =============================================================================

// Get fraud alerts (Admin/Employee only)
router.get('/fraud/alerts', authenticateToken, requireRole(['admin', 'employee']), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const alerts = await fraudDetection.getAlerts(parseInt(limit));
        
        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve fraud alerts',
            error: error.message
        });
    }
});

// Analyze transaction for fraud
router.post('/fraud/analyze', authenticateToken, requireRole(['admin', 'employee']), [
    body('transactionId').notEmpty().withMessage('Transaction ID is required'),
    body('accountId').isInt().withMessage('Valid account ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    body('userId').isInt().withMessage('Valid user ID is required')
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

        const { transactionId, accountId, amount, userId } = req.body;
        const transaction = { id: transactionId, accountId, amount, userId };
        
        const analysis = await fraudDetection.analyzeTransaction(transaction);
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to analyze transaction',
            error: error.message
        });
    }
});

// =============================================================================
// BIOMETRIC AUTHENTICATION ROUTES
// =============================================================================

// Register biometric data
router.post('/biometric/register', authenticateToken, [
    body('biometricType').isIn(['fingerprint', 'face', 'voice']).withMessage('Invalid biometric type'),
    body('biometricData').notEmpty().withMessage('Biometric data is required')
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

        const { biometricType, biometricData } = req.body;
        const result = await biometricAuth.registerBiometric(req.user.userId, biometricType, biometricData);
        
        res.json({
            success: true,
            message: 'Biometric data registered successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to register biometric data',
            error: error.message
        });
    }
});

// Authenticate with biometric
router.post('/biometric/authenticate', authenticateToken, [
    body('biometricType').isIn(['fingerprint', 'face', 'voice']).withMessage('Invalid biometric type'),
    body('biometricData').notEmpty().withMessage('Biometric data is required')
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

        const { biometricType, biometricData } = req.body;
        const result = await biometricAuth.authenticateBiometric(req.user.userId, biometricType, biometricData);
        
        res.json({
            success: result.success,
            message: result.success ? 'Biometric authentication successful' : 'Biometric authentication failed',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to authenticate biometric data',
            error: error.message
        });
    }
});

// Get user's biometric data
router.get('/biometric/user', authenticateToken, async (req, res) => {
    try {
        const biometrics = await biometricAuth.getUserBiometrics(req.user.userId);
        
        res.json({
            success: true,
            data: biometrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve biometric data',
            error: error.message
        });
    }
});

// =============================================================================
// INVESTMENT ADVISORY ROUTES
// =============================================================================

// Get investment analysis
router.get('/investment/analysis/:customerId', authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;
        
        // Ensure user can only access their own data or admin/employee can access any
        if (req.user.role === 'customer' && req.user.customerId !== parseInt(customerId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const analysis = await investmentAdvisor.analyzeCustomerProfile(parseInt(customerId));
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to analyze investment profile',
            error: error.message
        });
    }
});

// Create investment plan
router.post('/investment/plan', authenticateToken, [
    body('customerId').isInt().withMessage('Valid customer ID is required'),
    body('timeHorizon').isInt({ min: 1, max: 50 }).withMessage('Time horizon must be between 1-50 years')
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

        const { customerId, timeHorizon } = req.body;
        
        // Get analysis first
        const analysis = await investmentAdvisor.analyzeCustomerProfile(customerId);
        const result = await investmentAdvisor.createInvestmentPlan(customerId, analysis, timeHorizon);
        
        res.json({
            success: true,
            message: 'Investment plan created successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create investment plan',
            error: error.message
        });
    }
});

// Get market insights
router.get('/investment/market-insights', authenticateToken, async (req, res) => {
    try {
        const insights = await investmentAdvisor.getMarketInsights();
        
        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve market insights',
            error: error.message
        });
    }
});

// =============================================================================
// CRYPTOCURRENCY ROUTES
// =============================================================================

// Create crypto wallet
router.post('/crypto/wallet', authenticateToken, [
    body('cryptoType').isIn(['BTC', 'ETH', 'LTC', 'ADA', 'DOT']).withMessage('Invalid cryptocurrency type')
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

        const { cryptoType } = req.body;
        const wallet = await cryptoService.createCryptoWallet(req.user.customerId, cryptoType);
        
        res.json({
            success: true,
            message: 'Crypto wallet created successfully',
            data: wallet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create crypto wallet',
            error: error.message
        });
    }
});

// Get crypto wallets
router.get('/crypto/wallets', authenticateToken, async (req, res) => {
    try {
        const wallets = await cryptoService.getCryptoWallets(req.user.customerId);
        
        res.json({
            success: true,
            data: wallets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve crypto wallets',
            error: error.message
        });
    }
});

// Buy cryptocurrency
router.post('/crypto/buy', authenticateToken, [
    body('accountId').isInt().withMessage('Valid account ID is required'),
    body('cryptoType').isIn(['BTC', 'ETH', 'LTC', 'ADA', 'DOT']).withMessage('Invalid cryptocurrency type'),
    body('usdAmount').isFloat({ min: 1 }).withMessage('USD amount must be at least $1')
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

        const { accountId, cryptoType, usdAmount } = req.body;
        const result = await cryptoService.buyCryptocurrency(req.user.customerId, accountId, cryptoType, usdAmount);
        
        res.json({
            success: true,
            message: 'Cryptocurrency purchased successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to purchase cryptocurrency',
            error: error.message
        });
    }
});

// Get crypto market data
router.get('/crypto/market', authenticateToken, async (req, res) => {
    try {
        const marketData = await cryptoService.getCryptoMarketData();
        
        res.json({
            success: true,
            data: marketData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve market data',
            error: error.message
        });
    }
});

// =============================================================================
// AI CHATBOT ROUTES
// =============================================================================

// Send message to chatbot
router.post('/chatbot/message', authenticateToken, [
    body('message').notEmpty().withMessage('Message is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required')
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

        const { message, sessionId } = req.body;
        const response = await aiChatbot.processMessage(req.user.customerId, message, sessionId);
        
        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to process message',
            error: error.message
        });
    }
});

// Get chat history
router.get('/chatbot/history/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50 } = req.query;
        
        const history = await aiChatbot.getChatHistory(req.user.customerId, sessionId, parseInt(limit));
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve chat history',
            error: error.message
        });
    }
});

// =============================================================================
// EXPENSE TRACKING ROUTES
// =============================================================================

// Get spending analytics
router.get('/expenses/analytics', authenticateToken, async (req, res) => {
    try {
        if (!req.user.customerId) {
            return res.json({
                success: true,
                data: {
                    categorySpending: [],
                    topCategories: [],
                    monthlyTrends: [],
                    period: 'monthly',
                    generatedAt: new Date().toISOString()
                }
            });
        }

        const { period = 'monthly', months = 6 } = req.query;
        const analytics = await expenseTracker.getSpendingAnalytics(req.user.customerId, period, parseInt(months));
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve spending analytics',
            error: error.message
        });
    }
});

// Create budget
router.post('/expenses/budget', authenticateToken, [
    body('name').notEmpty().withMessage('Budget name is required'),
    body('period').isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('totalAmount').isFloat({ min: 1 }).withMessage('Total amount must be greater than 0'),
    body('categoryAllocations').isArray().withMessage('Category allocations must be an array')
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

        const budgetData = req.body;
        const result = await expenseTracker.createBudget(req.user.customerId, budgetData);
        
        res.json({
            success: true,
            message: 'Budget created successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create budget',
            error: error.message
        });
    }
});

// Get budget status
router.get('/expenses/budget/status', authenticateToken, async (req, res) => {
    try {
        const { budgetId } = req.query;
        const status = await expenseTracker.getBudgetStatus(req.user.customerId, budgetId);
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve budget status',
            error: error.message
        });
    }
});

// Get spending insights
router.get('/expenses/insights', authenticateToken, async (req, res) => {
    try {
        const insights = await expenseTracker.generateSpendingInsights(req.user.customerId);
        
        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate spending insights',
            error: error.message
        });
    }
});

// Check budget alerts
router.get('/expenses/alerts', authenticateToken, async (req, res) => {
    try {
        if (!req.user.customerId) {
            return res.json({
                success: true,
                data: []
            });
        }

        const alerts = await expenseTracker.checkBudgetAlerts(req.user.customerId);
        
        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check budget alerts',
            error: error.message
        });
    }
});

// Export spending report
router.get('/expenses/export', authenticateToken, async (req, res) => {
    try {
        const { format = 'json', period = 'monthly' } = req.query;
        const report = await expenseTracker.exportSpendingReport(req.user.customerId, format, period);
        
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=spending-report.csv');
            res.send(report);
        } else {
            res.json({
                success: true,
                data: report
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to export spending report',
            error: error.message
        });
    }
});

// =============================================================================
// ADMIN ANALYTICS ROUTES
// =============================================================================

// Get chatbot analytics (Admin only)
router.get('/admin/chatbot/analytics', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const analytics = await aiChatbot.getAnalytics();
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve chatbot analytics',
            error: error.message
        });
    }
});

// Get system-wide financial summary (Admin only)
router.get('/admin/financial-summary', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        // This would aggregate data from all services
        const summary = {
            totalCustomers: 0,
            totalAccounts: 0,
            totalCryptoWallets: 0,
            totalInvestmentPlans: 0,
            totalBudgets: 0,
            fraudAlertsToday: 0
        };
        
        // Implementation would query the database for actual numbers
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve financial summary',
            error: error.message
        });
    }
});

module.exports = router;