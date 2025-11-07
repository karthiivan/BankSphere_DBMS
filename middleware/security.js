const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
});

// General rate limiting (very generous)
const generalLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 999999, // Unlimited requests
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => true // Skip rate limiting entirely
});

// Unlimited authentication attempts (no rate limiting)
const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 999999, // Unlimited attempts
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => true // Skip rate limiting entirely
});

// Transaction rate limiting
const transactionLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 transactions per minute
    message: {
        success: false,
        message: 'Too many transaction requests, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    
    next();
};

// Recursive object sanitization
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    
    return sanitized;
}

// String sanitization
function sanitizeString(str) {
    if (typeof str !== 'string') {
        return str;
    }
    
    // Remove potentially dangerous characters
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[<>]/g, '') // Remove < and > characters
        .trim();
}

// Audit logging middleware
const auditLog = async (req, res, next) => {
    // Skip logging for static files and health checks
    if (req.path.startsWith('/css') || 
        req.path.startsWith('/js') || 
        req.path.startsWith('/images') ||
        req.path === '/api/health') {
        return next();
    }
    
    try {
        const logData = {
            method: req.method,
            path: req.path,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent') || 'Unknown',
            timestamp: new Date().toISOString(),
            userId: req.user ? req.user.userId : null
        };
        
        // Log to database (non-blocking)
        setImmediate(async () => {
            try {
                await executeQuery(
                    `INSERT INTO audit_log (user_id, action, details, ip_address, user_agent, created_at) 
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [
                        logData.userId,
                        `${logData.method} ${logData.path}`,
                        JSON.stringify({ userAgent: logData.userAgent }),
                        logData.ip,
                        logData.userAgent
                    ]
                );
            } catch (error) {
                console.error('Audit logging error:', error);
            }
        });
        
    } catch (error) {
        console.error('Audit log middleware error:', error);
    }
    
    next();
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Common validation rules
const validationRules = {
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    password: body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    username: body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    amount: body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    
    accountNumber: body('accountNumber')
        .matches(/^ACC\d{9}$/)
        .withMessage('Invalid account number format'),
    
    phone: body('phone')
        .matches(/^\(\d{3}\) \d{3}-\d{4}$/)
        .withMessage('Phone number must be in format (XXX) XXX-XXXX'),
    
    ssn: body('ssn')
        .matches(/^\d{3}-\d{2}-\d{4}$/)
        .withMessage('SSN must be in format XXX-XX-XXXX'),
    
    zipCode: body('zipCode')
        .matches(/^\d{5}(-\d{4})?$/)
        .withMessage('ZIP code must be in format XXXXX or XXXXX-XXXX')
};

module.exports = {
    securityHeaders,
    generalLimit,
    authLimit,
    transactionLimit,
    sanitizeInput,
    auditLog,
    handleValidationErrors,
    validationRules
};