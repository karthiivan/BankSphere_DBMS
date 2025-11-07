const { getConnection } = require('./config/database');

class SmartInvestmentAdvisor {
    constructor() {
        this.riskProfiles = {
            CONSERVATIVE: { stocks: 20, bonds: 60, cash: 20 },
            MODERATE: { stocks: 50, bonds: 35, cash: 15 },
            AGGRESSIVE: { stocks: 80, bonds: 15, cash: 5 }
        };
        
        this.investmentTypes = [
            'stocks', 'bonds', 'mutual_funds', 'etfs', 'real_estate', 'commodities'
        ];
    }

    async analyzeCustomerProfile(customerId) {
        const connection = await getConnection();
        
        try {
            // Get customer financial data
            const [customer] = await connection.execute(`
                SELECT c.*, u.email,
                       COALESCE(SUM(a.balance), 0) as total_balance,
                       COUNT(a.id) as account_count,
                       COALESCE(AVG(t.amount), 0) as avg_transaction
                FROM customers c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN accounts a ON c.id = a.customer_id
                LEFT JOIN transactions t ON a.id = t.account_id
                WHERE c.id = ?
                GROUP BY c.id
            `, [customerId]);
            
            if (customer.length === 0) {
                throw new Error('Customer not found');
            }
            
            const profile = customer[0];
            
            // Calculate risk tolerance based on age, income, and financial goals
            const riskTolerance = this.calculateRiskTolerance(profile);
            
            // Generate investment recommendations
            const recommendations = await this.generateRecommendations(profile, riskTolerance);
            
            return {
                profile,
                riskTolerance,
                recommendations,
                portfolioAllocation: this.riskProfiles[riskTolerance]
            };
            
        } finally {
            connection.release();
        }
    }

    calculateRiskTolerance(profile) {
        let score = 0;
        
        // Age factor (younger = higher risk tolerance)
        const age = this.calculateAge(profile.date_of_birth);
        if (age < 30) score += 3;
        else if (age < 50) score += 2;
        else score += 1;
        
        // Income/Balance factor
        if (profile.total_balance > 100000) score += 3;
        else if (profile.total_balance > 50000) score += 2;
        else score += 1;
        
        // Account activity factor
        if (profile.avg_transaction > 1000) score += 2;
        else score += 1;
        
        // Determine risk profile
        if (score >= 7) return 'AGGRESSIVE';
        if (score >= 5) return 'MODERATE';
        return 'CONSERVATIVE';
    }

    async generateRecommendations(profile, riskTolerance) {
        const recommendations = [];
        const allocation = this.riskProfiles[riskTolerance];
        const investableAmount = Math.max(profile.total_balance * 0.7, 1000); // 70% of balance
        
        // Stock recommendations
        if (allocation.stocks > 0) {
            const stockAmount = investableAmount * (allocation.stocks / 100);
            recommendations.push({
                type: 'stocks',
                allocation: allocation.stocks,
                recommendedAmount: stockAmount,
                suggestions: this.getStockSuggestions(riskTolerance),
                reasoning: 'Stocks provide long-term growth potential'
            });
        }
        
        // Bond recommendations
        if (allocation.bonds > 0) {
            const bondAmount = investableAmount * (allocation.bonds / 100);
            recommendations.push({
                type: 'bonds',
                allocation: allocation.bonds,
                recommendedAmount: bondAmount,
                suggestions: this.getBondSuggestions(riskTolerance),
                reasoning: 'Bonds provide stability and regular income'
            });
        }
        
        // Cash/Emergency fund
        if (allocation.cash > 0) {
            const cashAmount = investableAmount * (allocation.cash / 100);
            recommendations.push({
                type: 'cash',
                allocation: allocation.cash,
                recommendedAmount: cashAmount,
                suggestions: ['High-yield savings', 'Money market funds', 'CDs'],
                reasoning: 'Cash provides liquidity for emergencies'
            });
        }
        
        return recommendations;
    }

    getStockSuggestions(riskTolerance) {
        const suggestions = {
            CONSERVATIVE: [
                'Dividend-paying blue chip stocks',
                'Utility stocks',
                'Consumer staples ETFs'
            ],
            MODERATE: [
                'S&P 500 index funds',
                'Balanced mutual funds',
                'Large-cap growth stocks'
            ],
            AGGRESSIVE: [
                'Growth stocks',
                'Technology sector ETFs',
                'Emerging market funds'
            ]
        };
        
        return suggestions[riskTolerance];
    }

    getBondSuggestions(riskTolerance) {
        const suggestions = {
            CONSERVATIVE: [
                'Government bonds',
                'AAA corporate bonds',
                'Treasury bills'
            ],
            MODERATE: [
                'Investment grade corporate bonds',
                'Municipal bonds',
                'Bond index funds'
            ],
            AGGRESSIVE: [
                'High-yield bonds',
                'International bonds',
                'Convertible bonds'
            ]
        };
        
        return suggestions[riskTolerance];
    }

    async createInvestmentPlan(customerId, recommendations, timeHorizon = 5) {
        const connection = await getConnection();
        
        try {
            const planId = require('crypto').randomUUID();
            
            // Create investment plan
            await connection.execute(`
                INSERT INTO investment_plans (id, customer_id, risk_tolerance, time_horizon, 
                                            total_amount, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'draft', NOW())
            `, [planId, customerId, recommendations.riskTolerance, timeHorizon, 
                recommendations.recommendations.reduce((sum, r) => sum + r.recommendedAmount, 0)]);
            
            // Add individual recommendations
            for (const rec of recommendations.recommendations) {
                await connection.execute(`
                    INSERT INTO investment_recommendations (plan_id, investment_type, 
                                                          allocation_percentage, recommended_amount, 
                                                          reasoning, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [planId, rec.type, rec.allocation, rec.recommendedAmount, rec.reasoning]);
            }
            
            return { planId, status: 'created' };
            
        } finally {
            connection.release();
        }
    }

    async getMarketInsights() {
        // Simulate market data (in real system, would fetch from financial APIs)
        return {
            marketTrends: {
                sp500: { change: '+1.2%', trend: 'bullish' },
                nasdaq: { change: '+0.8%', trend: 'bullish' },
                bonds: { change: '-0.3%', trend: 'bearish' }
            },
            sectorPerformance: [
                { sector: 'Technology', performance: '+2.1%' },
                { sector: 'Healthcare', performance: '+1.5%' },
                { sector: 'Finance', performance: '+0.9%' },
                { sector: 'Energy', performance: '-0.7%' }
            ],
            recommendations: [
                'Consider increasing technology allocation',
                'Healthcare sector showing strong fundamentals',
                'Bond yields may rise - consider shorter duration'
            ],
            lastUpdated: new Date().toISOString()
        };
    }

    async trackPortfolioPerformance(customerId) {
        const connection = await getConnection();
        
        try {
            const [portfolio] = await connection.execute(`
                SELECT ip.*, ir.investment_type, ir.allocation_percentage, 
                       ir.recommended_amount, ir.current_value
                FROM investment_plans ip
                JOIN investment_recommendations ir ON ip.id = ir.plan_id
                WHERE ip.customer_id = ? AND ip.status = 'active'
                ORDER BY ip.created_at DESC
            `, [customerId]);
            
            if (portfolio.length === 0) {
                return { message: 'No active investment portfolio found' };
            }
            
            // Calculate performance metrics
            const totalInvested = portfolio.reduce((sum, item) => sum + item.recommended_amount, 0);
            const currentValue = portfolio.reduce((sum, item) => sum + (item.current_value || item.recommended_amount), 0);
            const totalReturn = currentValue - totalInvested;
            const returnPercentage = (totalReturn / totalInvested) * 100;
            
            return {
                portfolio,
                performance: {
                    totalInvested,
                    currentValue,
                    totalReturn,
                    returnPercentage: returnPercentage.toFixed(2)
                },
                lastUpdated: new Date().toISOString()
            };
            
        } finally {
            connection.release();
        }
    }

    async rebalancePortfolio(customerId) {
        const connection = await getConnection();
        
        try {
            // Get current portfolio
            const performance = await this.trackPortfolioPerformance(customerId);
            
            if (!performance.portfolio) {
                throw new Error('No portfolio to rebalance');
            }
            
            // Analyze if rebalancing is needed
            const rebalanceNeeded = this.analyzeRebalanceNeed(performance.portfolio);
            
            if (rebalanceNeeded.needed) {
                // Create rebalancing recommendations
                const rebalanceActions = this.generateRebalanceActions(performance.portfolio);
                
                // Log rebalancing recommendation
                await connection.execute(`
                    INSERT INTO portfolio_rebalance_log (customer_id, reason, actions, created_at)
                    VALUES (?, ?, ?, NOW())
                `, [customerId, rebalanceNeeded.reason, JSON.stringify(rebalanceActions)]);
                
                return {
                    rebalanceNeeded: true,
                    reason: rebalanceNeeded.reason,
                    actions: rebalanceActions
                };
            }
            
            return { rebalanceNeeded: false, message: 'Portfolio is well balanced' };
            
        } finally {
            connection.release();
        }
    }

    analyzeRebalanceNeed(portfolio) {
        // Check if any allocation has drifted more than 5% from target
        for (const item of portfolio) {
            const currentAllocation = (item.current_value / portfolio.reduce((sum, p) => sum + p.current_value, 0)) * 100;
            const drift = Math.abs(currentAllocation - item.allocation_percentage);
            
            if (drift > 5) {
                return {
                    needed: true,
                    reason: `${item.investment_type} allocation has drifted ${drift.toFixed(1)}% from target`
                };
            }
        }
        
        return { needed: false };
    }

    generateRebalanceActions(portfolio) {
        const actions = [];
        const totalValue = portfolio.reduce((sum, item) => sum + (item.current_value || item.recommended_amount), 0);
        
        for (const item of portfolio) {
            const currentValue = item.current_value || item.recommended_amount;
            const targetValue = totalValue * (item.allocation_percentage / 100);
            const difference = targetValue - currentValue;
            
            if (Math.abs(difference) > 100) { // Only suggest changes > $100
                actions.push({
                    investmentType: item.investment_type,
                    action: difference > 0 ? 'buy' : 'sell',
                    amount: Math.abs(difference),
                    reason: `Rebalance to target ${item.allocation_percentage}% allocation`
                });
            }
        }
        
        return actions;
    }

    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
}

module.exports = SmartInvestmentAdvisor;