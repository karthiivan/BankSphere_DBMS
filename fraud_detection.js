const { getConnection } = require('./config/database');

class FraudDetectionSystem {
    constructor() {
        this.riskThresholds = {
            HIGH_AMOUNT: 10000,
            VELOCITY_LIMIT: 5, // transactions per hour
            UNUSUAL_TIME: { start: 22, end: 6 }, // 10 PM to 6 AM
            LOCATION_RADIUS: 100 // miles from usual location
        };
    }

    async analyzeTransaction(transaction) {
        const riskScore = await this.calculateRiskScore(transaction);
        const riskLevel = this.determineRiskLevel(riskScore);
        
        if (riskLevel === 'HIGH') {
            await this.flagTransaction(transaction, riskScore);
            await this.notifySecurityTeam(transaction, riskScore);
        }
        
        return { riskScore, riskLevel };
    }

    async calculateRiskScore(transaction) {
        let score = 0;
        const connection = await getConnection();
        
        try {
            // Check transaction amount
            if (transaction.amount > this.riskThresholds.HIGH_AMOUNT) {
                score += 30;
            }
            
            // Check transaction velocity
            const [recentTransactions] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM transactions 
                WHERE account_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            `, [transaction.accountId]);
            
            if (recentTransactions[0].count >= this.riskThresholds.VELOCITY_LIMIT) {
                score += 25;
            }
            
            // Check unusual time
            const hour = new Date().getHours();
            if (hour >= this.riskThresholds.UNUSUAL_TIME.start || 
                hour <= this.riskThresholds.UNUSUAL_TIME.end) {
                score += 15;
            }
            
            // Check for unusual patterns
            const [avgAmount] = await connection.execute(`
                SELECT AVG(amount) as avg_amount 
                FROM transactions 
                WHERE account_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [transaction.accountId]);
            
            if (transaction.amount > (avgAmount[0].avg_amount * 5)) {
                score += 20;
            }
            
            // Check for round numbers (common in fraud)
            if (transaction.amount % 100 === 0 && transaction.amount >= 1000) {
                score += 10;
            }
            
            return Math.min(score, 100);
            
        } finally {
            connection.release();
        }
    }

    determineRiskLevel(score) {
        if (score >= 70) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        return 'LOW';
    }

    async flagTransaction(transaction, riskScore) {
        const connection = await getConnection();
        
        try {
            await connection.execute(`
                INSERT INTO fraud_alerts (transaction_id, account_id, risk_score, status, created_at)
                VALUES (?, ?, ?, 'pending', NOW())
            `, [transaction.id, transaction.accountId, riskScore]);
            
            // Temporarily freeze account if risk is very high
            if (riskScore >= 90) {
                await connection.execute(`
                    UPDATE accounts SET status = 'frozen' WHERE id = ?
                `, [transaction.accountId]);
            }
            
        } finally {
            connection.release();
        }
    }

    async notifySecurityTeam(transaction, riskScore) {
        // In a real system, this would send alerts via email/SMS
        console.log(`🚨 FRAUD ALERT: Transaction ${transaction.id} flagged with risk score ${riskScore}`);
        
        // Log to audit system
        const connection = await getConnection();
        try {
            await connection.execute(`
                INSERT INTO audit_log (user_id, action, details, ip_address, created_at)
                VALUES (?, 'FRAUD_ALERT', ?, 'SYSTEM', NOW())
            `, [transaction.userId, `High-risk transaction detected: $${transaction.amount}`]);
        } finally {
            connection.release();
        }
    }

    async getAlerts(limit = 50) {
        const connection = await getConnection();
        
        try {
            const [alerts] = await connection.execute(`
                SELECT fa.*, t.amount, t.transaction_type, t.description,
                       a.account_number, c.first_name, c.last_name
                FROM fraud_alerts fa
                JOIN transactions t ON fa.transaction_id = t.id
                JOIN accounts a ON fa.account_id = a.id
                JOIN customers c ON a.customer_id = c.id
                ORDER BY fa.created_at DESC
                LIMIT ?
            `, [limit]);
            
            return alerts;
        } finally {
            connection.release();
        }
    }
}

module.exports = FraudDetectionSystem;