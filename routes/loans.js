const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get user loans
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'customer') {
            query = `
                SELECT l.*, lt.name as loan_type_name, lt.description as loan_type_description
                FROM loans l
                JOIN loan_types lt ON l.loan_type_id = lt.id
                WHERE l.customer_id = ?
                ORDER BY l.created_at DESC
            `;
            params = [req.user.customerId];
        } else {
            query = `
                SELECT l.*, lt.name as loan_type_name, lt.description as loan_type_description,
                       c.first_name, c.last_name
                FROM loans l
                JOIN loan_types lt ON l.loan_type_id = lt.id
                JOIN customers c ON l.customer_id = c.id
                ORDER BY l.created_at DESC
                LIMIT 100
            `;
            params = [];
        }

        const loans = await executeQuery(query, params);

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

// Apply for loan
router.post('/apply', authenticateToken, [
    body('loanTypeId').isInt().withMessage('Valid loan type ID is required'),
    body('amount').isFloat({ min: 1000, max: 1000000 }).withMessage('Loan amount must be between $1,000 and $1,000,000'),
    body('termMonths').isInt({ min: 6, max: 360 }).withMessage('Loan term must be between 6 and 360 months'),
    body('purpose').isLength({ min: 10, max: 500 }).withMessage('Purpose must be between 10 and 500 characters')
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

        const { loanTypeId, amount, termMonths, purpose } = req.body;

        // Generate loan number
        const loanNumber = 'LOAN' + Date.now().toString().slice(-8);

        // Get loan type details for interest rate
        const loanTypes = await executeQuery(
            'SELECT * FROM loan_types WHERE id = ?',
            [loanTypeId]
        );

        if (loanTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid loan type'
            });
        }

        const loanType = loanTypes[0];
        const interestRate = loanType.interest_rate;

        // Calculate monthly payment (simplified calculation)
        const monthlyRate = interestRate / 100 / 12;
        const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                              (Math.pow(1 + monthlyRate, termMonths) - 1);

        // Create loan application
        const result = await executeQuery(
            `INSERT INTO loans (customer_id, loan_type_id, loan_number, amount, interest_rate, 
                              term_months, monthly_payment, purpose, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [req.user.customerId, loanTypeId, loanNumber, amount, interestRate, 
             termMonths, monthlyPayment, purpose]
        );

        res.status(201).json({
            success: true,
            message: 'Loan application submitted successfully',
            data: {
                loanId: result.insertId,
                loanNumber,
                amount,
                monthlyPayment: monthlyPayment.toFixed(2),
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit loan application'
        });
    }
});

module.exports = router;