const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Simplified biometric storage (in production, use proper WebAuthn library)
const challenges = new Map();

// Check if user has biometric registered
router.post('/check', async (req, res) => {
    try {
        const { username } = req.body;
        
        const users = await executeQuery(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.json({ success: false, hasRegistered: false });
        }
        
        const biometrics = await executeQuery(
            'SELECT id FROM biometric_data WHERE user_id = ? AND is_active = 1',
            [users[0].id]
        );
        
        res.json({
            success: true,
            hasRegistered: biometrics.length > 0
        });
        
    } catch (error) {
        console.error('Check biometric error:', error);
        res.status(500).json({ success: false, message: 'Failed to check biometric' });
    }
});

// Register biometric - Get challenge
router.post('/register/challenge', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        
        // Generate challenge
        const challenge = crypto.randomBytes(32).toString('base64');
        const userId = req.user.userId.toString();
        
        challenges.set(username, {
            challenge,
            userId,
            timestamp: Date.now()
        });
        
        // Clean old challenges
        setTimeout(() => challenges.delete(username), 5 * 60 * 1000);
        
        res.json({
            success: true,
            challenge,
            userId: Buffer.from(userId).toString('base64')
        });
        
    } catch (error) {
        console.error('Register challenge error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate challenge' });
    }
});

// Register biometric - Complete
router.post('/register/complete', authenticateToken, async (req, res) => {
    try {
        const { username, credential } = req.body;
        
        const challengeData = challenges.get(username);
        if (!challengeData) {
            return res.status(400).json({ success: false, message: 'Invalid or expired challenge' });
        }
        
        // Store credential (simplified - in production use proper WebAuthn verification)
        const biometricId = crypto.randomUUID();
        
        await executeQuery(`
            INSERT INTO biometric_data (id, user_id, biometric_type, encrypted_template, is_active, created_at)
            VALUES (?, ?, 'fingerprint', ?, 1, NOW())
            ON DUPLICATE KEY UPDATE 
            encrypted_template = VALUES(encrypted_template),
            updated_at = NOW()
        `, [biometricId, req.user.userId, JSON.stringify(credential)]);
        
        challenges.delete(username);
        
        res.json({
            success: true,
            message: 'Biometric registered successfully'
        });
        
    } catch (error) {
        console.error('Register complete error:', error);
        res.status(500).json({ success: false, message: 'Failed to register biometric' });
    }
});

// Authenticate biometric - Get challenge
router.post('/authenticate/challenge', async (req, res) => {
    try {
        const { username } = req.body;
        
        const users = await executeQuery(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const biometrics = await executeQuery(
            'SELECT id, encrypted_template FROM biometric_data WHERE user_id = ? AND is_active = 1',
            [users[0].id]
        );
        
        if (biometrics.length === 0) {
            return res.status(404).json({ success: false, message: 'No biometric registered' });
        }
        
        // Generate challenge
        const challenge = crypto.randomBytes(32).toString('base64');
        
        challenges.set(username, {
            challenge,
            userId: users[0].id,
            timestamp: Date.now()
        });
        
        // Clean old challenges
        setTimeout(() => challenges.delete(username), 5 * 60 * 1000);
        
        // Get stored credentials
        const allowCredentials = biometrics.map(bio => {
            try {
                const cred = JSON.parse(bio.encrypted_template);
                return { id: cred.id || cred.rawId };
            } catch {
                return { id: bio.id };
            }
        });
        
        res.json({
            success: true,
            challenge,
            allowCredentials
        });
        
    } catch (error) {
        console.error('Authenticate challenge error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate challenge' });
    }
});

// Authenticate biometric - Complete
router.post('/authenticate/complete', async (req, res) => {
    try {
        const { username, credential } = req.body;
        
        const challengeData = challenges.get(username);
        if (!challengeData) {
            return res.status(400).json({ success: false, message: 'Invalid or expired challenge' });
        }
        
        // Get user data
        const users = await executeQuery(`
            SELECT u.*, c.id as customer_id, c.first_name, c.last_name
            FROM users u
            LEFT JOIN customers c ON u.id = c.user_id
            WHERE u.username = ?
        `, [username]);
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const user = users[0];
        
        // Verify credential (simplified - in production use proper WebAuthn verification)
        const biometrics = await executeQuery(
            'SELECT encrypted_template FROM biometric_data WHERE user_id = ? AND is_active = 1',
            [user.id]
        );
        
        if (biometrics.length === 0) {
            return res.status(404).json({ success: false, message: 'No biometric registered' });
        }
        
        // Update last used
        await executeQuery(
            'UPDATE biometric_data SET last_used = NOW() WHERE user_id = ?',
            [user.id]
        );
        
        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                customerId: user.customer_id
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        challenges.delete(username);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                customerId: user.customer_id,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
        
    } catch (error) {
        console.error('Authenticate complete error:', error);
        res.status(500).json({ success: false, message: 'Biometric authentication failed' });
    }
});

module.exports = router;
