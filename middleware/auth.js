const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Authenticate JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user details from database
        const user = await executeQuery(
            'SELECT u.*, c.id as customerId FROM users u LEFT JOIN customers c ON u.id = c.user_id WHERE u.id = ?',
            [decoded.userId]
        );

        if (user.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        // Check if user is active
        if (!user[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Add user info to request
        req.user = {
            userId: user[0].id,
            username: user[0].username,
            email: user[0].email,
            role: user[0].role,
            customerId: user[0].customerId
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Require specific role(s)
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Check if user owns the resource (for customer-specific endpoints)
const requireOwnership = (resourceIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Admin and employees can access any resource
            if (['admin', 'employee'].includes(req.user.role)) {
                return next();
            }

            // For customers, check ownership
            const resourceId = req.params[resourceIdParam];
            
            // This is a simplified check - in practice, you'd verify ownership
            // based on the specific resource type (account, transaction, etc.)
            if (req.user.role === 'customer' && req.user.customerId) {
                // Add ownership verification logic here based on resource type
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });

        } catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization error'
            });
        }
    };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await executeQuery(
                'SELECT u.*, c.id as customerId FROM users u LEFT JOIN customers c ON u.id = c.user_id WHERE u.id = ?',
                [decoded.userId]
            );

            if (user.length > 0 && user[0].is_active) {
                req.user = {
                    userId: user[0].id,
                    username: user[0].username,
                    email: user[0].email,
                    role: user[0].role,
                    customerId: user[0].customerId
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication for optional auth
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwnership,
    optionalAuth
};