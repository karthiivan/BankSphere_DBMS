const crypto = require('crypto');
const { getConnection } = require('./config/database');

class BiometricAuthSystem {
    constructor() {
        this.supportedTypes = ['fingerprint', 'face', 'voice'];
        this.encryptionKey = process.env.BIOMETRIC_KEY || 'default-key-change-in-production';
    }

    // Simulate biometric data processing (in real system, would use actual biometric APIs)
    async registerBiometric(userId, biometricType, biometricData) {
        if (!this.supportedTypes.includes(biometricType)) {
            throw new Error('Unsupported biometric type');
        }

        const connection = await getConnection();

        try {
            // Encrypt biometric template
            const encryptedTemplate = this.encryptBiometricData(biometricData);

            // Generate unique biometric ID
            const biometricId = crypto.randomUUID();

            await connection.execute(`
                INSERT INTO biometric_data (id, user_id, biometric_type, encrypted_template, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE 
                encrypted_template = VALUES(encrypted_template),
                updated_at = NOW()
            `, [biometricId, userId, biometricType, encryptedTemplate]);

            // Log registration
            await this.logBiometricActivity(userId, 'REGISTER', biometricType);

            return { success: true, biometricId };

        } finally {
            connection.release();
        }
    }

    async authenticateBiometric(userId, biometricType, biometricData) {
        const connection = await getConnection();

        try {
            // Get stored biometric template
            const [stored] = await connection.execute(`
                SELECT encrypted_template FROM biometric_data 
                WHERE user_id = ? AND biometric_type = ? AND is_active = 1
            `, [userId, biometricType]);

            if (stored.length === 0) {
                throw new Error('No biometric data found for user');
            }

            // Decrypt and compare (simplified - real system would use biometric matching algorithms)
            const storedTemplate = this.decryptBiometricData(stored[0].encrypted_template);
            const matchScore = this.compareBiometricData(storedTemplate, biometricData);

            const isAuthenticated = matchScore >= 0.85; // 85% match threshold

            // Log authentication attempt
            await this.logBiometricActivity(userId, 'AUTHENTICATE', biometricType, isAuthenticated);

            if (isAuthenticated) {
                // Update last used timestamp
                await connection.execute(`
                    UPDATE biometric_data SET last_used = NOW() 
                    WHERE user_id = ? AND biometric_type = ?
                `, [userId, biometricType]);
            }

            return {
                success: isAuthenticated,
                matchScore,
                timestamp: new Date().toISOString()
            };

        } finally {
            connection.release();
        }
    }

    async getUserBiometrics(userId) {
        const connection = await getConnection();

        try {
            const [biometrics] = await connection.execute(`
                SELECT biometric_type, is_active, created_at, last_used
                FROM biometric_data 
                WHERE user_id = ?
                ORDER BY created_at DESC
            `, [userId]);

            return biometrics;

        } finally {
            connection.release();
        }
    }

    async deactivateBiometric(userId, biometricType) {
        const connection = await getConnection();

        try {
            await connection.execute(`
                UPDATE biometric_data SET is_active = 0, updated_at = NOW()
                WHERE user_id = ? AND biometric_type = ?
            `, [userId, biometricType]);

            await this.logBiometricActivity(userId, 'DEACTIVATE', biometricType);

            return { success: true };

        } finally {
            connection.release();
        }
    }

    // Simulate biometric matching (in real system, would use specialized algorithms)
    compareBiometricData(template1, template2) {
        // Simplified comparison - real biometric systems use complex algorithms
        const similarity = this.calculateSimilarity(template1, template2);
        return similarity;
    }

    calculateSimilarity(data1, data2) {
        // Simulate biometric matching score
        const hash1 = crypto.createHash('sha256').update(data1).digest('hex');
        const hash2 = crypto.createHash('sha256').update(data2).digest('hex');

        let matches = 0;
        const length = Math.min(hash1.length, hash2.length);

        for (let i = 0; i < length; i++) {
            if (hash1[i] === hash2[i]) matches++;
        }

        return matches / length;
    }

    encryptBiometricData(data) {
        // Use createCipheriv instead of deprecated createCipher
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Prepend IV to encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }

    decryptBiometricData(encryptedData) {
        // Split IV and encrypted data
        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }

    async logBiometricActivity(userId, action, biometricType, success = true) {
        const connection = await getConnection();

        try {
            await connection.execute(`
                INSERT INTO biometric_audit_log (user_id, action, biometric_type, success, ip_address, created_at)
                VALUES (?, ?, ?, ?, 'SYSTEM', NOW())
            `, [userId, action, biometricType, success]);

        } finally {
            connection.release();
        }
    }

    // Generate biometric challenge for additional security
    generateBiometricChallenge() {
        return {
            challengeId: crypto.randomUUID(),
            timestamp: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
            nonce: crypto.randomBytes(16).toString('hex')
        };
    }

    async getBiometricStats(userId) {
        const connection = await getConnection();

        try {
            const [stats] = await connection.execute(`
                SELECT 
                    biometric_type,
                    COUNT(*) as total_attempts,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_attempts,
                    MAX(created_at) as last_attempt
                FROM biometric_audit_log 
                WHERE user_id = ? AND action = 'AUTHENTICATE'
                GROUP BY biometric_type
            `, [userId]);

            return stats;

        } finally {
            connection.release();
        }
    }
}

module.exports = BiometricAuthSystem;