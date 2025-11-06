const { getConnection } = require('./config/database');

class SmartExpenseTracker {
    constructor() {
        this.categories = {
            'Food & Dining': {
                keywords: ['restaurant', 'food', 'dining', 'cafe', 'pizza', 'burger', 'grocery', 'supermarket'],
                icon: '🍽️',
                color: '#FF6B6B'
            },
            'Transportation': {
                keywords: ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'bus', 'train', 'parking', 'car'],
                icon: '🚗',
                color: '#4ECDC4'
            },
            'Shopping': {
                keywords: ['amazon', 'walmart', 'target', 'mall', 'store', 'shopping', 'retail'],
                icon: '🛍️',
                color: '#45B7D1'
            },
            'Entertainment': {
                keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'theater'],
                icon: '🎬',
                color: '#96CEB4'
            },
            'Healthcare': {
                keywords: ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'clinic'],
                icon: '🏥',
                color: '#FFEAA7'
            },
            'Utilities': {
                keywords: ['electric', 'water', 'gas', 'internet', 'phone', 'cable', 'utility'],
                icon: '💡',
                color: '#DDA0DD'
            },
            'Education': {
                keywords: ['school', 'university', 'course', 'book', 'education', 'tuition'],
                icon: '📚',
                color: '#98D8C8'
            },
            'Travel': {
                keywords: ['hotel', 'flight', 'airline', 'booking', 'travel', 'vacation'],
                icon: '✈️',
                color: '#F7DC6F'
            },
            'Insurance': {
                keywords: ['insurance', 'premium', 'policy', 'coverage'],
                icon: '🛡️',
                color: '#BB8FCE'
            },
            'Other': {
                keywords: [],
                icon: '📋',
                color: '#BDC3C7'
            }
        };

        this.budgetPeriods = ['weekly', 'monthly', 'quarterly', 'yearly'];
    }

    async categorizeTransaction(transactionId, description, amount) {
        const category = this.predictCategory(description);
        const connection = await getConnection();
        
        try {
            // Update transaction with category
            await connection.execute(`
                UPDATE transactions 
                SET category = ?, auto_categorized = 1, categorized_at = NOW()
                WHERE id = ?
            `, [category, transactionId]);
            
            // Log categorization
            await connection.execute(`
                INSERT INTO expense_categorization_log (transaction_id, predicted_category, 
                                                       confidence_score, description_analyzed, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [transactionId, category, this.getConfidenceScore(description, category), description]);
            
            return {
                transactionId,
                category,
                confidence: this.getConfidenceScore(description, category),
                categoryInfo: this.categories[category]
            };
            
        } finally {
            connection.release();
        }
    }

    predictCategory(description) {
        const desc = description.toLowerCase();
        let bestMatch = { category: 'Other', score: 0 };
        
        for (const [categoryName, categoryData] of Object.entries(this.categories)) {
            if (categoryName === 'Other') continue;
            
            let score = 0;
            for (const keyword of categoryData.keywords) {
                if (desc.includes(keyword)) {
                    score += keyword.length; // Longer keywords get higher scores
                }
            }
            
            if (score > bestMatch.score) {
                bestMatch = { category: categoryName, score };
            }
        }
        
        return bestMatch.category;
    }

    getConfidenceScore(description, category) {
        const desc = description.toLowerCase();
        const categoryData = this.categories[category];
        
        if (category === 'Other') return 0.1;
        
        let matches = 0;
        for (const keyword of categoryData.keywords) {
            if (desc.includes(keyword)) {
                matches++;
            }
        }
        
        return Math.min(matches / categoryData.keywords.length, 1.0);
    }

    async createBudget(customerId, budgetData) {
        const connection = await getConnection();
        
        try {
            const budgetId = require('crypto').randomUUID();
            
            await connection.execute(`
                INSERT INTO budgets (id, customer_id, name, period, start_date, end_date, 
                                   total_amount, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
            `, [budgetId, customerId, budgetData.name, budgetData.period, 
                budgetData.startDate, budgetData.endDate, budgetData.totalAmount]);
            
            // Add category allocations
            for (const allocation of budgetData.categoryAllocations) {
                await connection.execute(`
                    INSERT INTO budget_categories (budget_id, category, allocated_amount, created_at)
                    VALUES (?, ?, ?, NOW())
                `, [budgetId, allocation.category, allocation.amount]);
            }
            
            return { budgetId, status: 'created' };
            
        } finally {
            connection.release();
        }
    }

    async getBudgetStatus(customerId, budgetId = null) {
        const connection = await getConnection();
        
        try {
            let budgetQuery = `
                SELECT * FROM budgets 
                WHERE customer_id = ? AND status = 'active'
            `;
            const params = [customerId];
            
            if (budgetId) {
                budgetQuery += ' AND id = ?';
                params.push(budgetId);
            }
            
            budgetQuery += ' ORDER BY created_at DESC';
            
            const [budgets] = await connection.execute(budgetQuery, params);
            
            if (budgets.length === 0) {
                return { message: 'No active budgets found' };
            }
            
            const budgetStatuses = [];
            
            for (const budget of budgets) {
                // Get category allocations
                const [categories] = await connection.execute(`
                    SELECT * FROM budget_categories WHERE budget_id = ?
                `, [budget.id]);
                
                // Calculate spending for each category
                const categorySpending = {};
                for (const category of categories) {
                    const [spending] = await connection.execute(`
                        SELECT COALESCE(SUM(amount), 0) as spent
                        FROM transactions t
                        JOIN accounts a ON t.account_id = a.id
                        WHERE a.customer_id = ? 
                        AND t.category = ?
                        AND t.transaction_type IN ('withdraw', 'purchase', 'transfer_out')
                        AND t.created_at BETWEEN ? AND ?
                    `, [customerId, category.category, budget.start_date, budget.end_date]);
                    
                    categorySpending[category.category] = {
                        allocated: category.allocated_amount,
                        spent: spending[0].spent,
                        remaining: category.allocated_amount - spending[0].spent,
                        percentage: (spending[0].spent / category.allocated_amount) * 100
                    };
                }
                
                // Calculate total spending
                const totalSpent = Object.values(categorySpending).reduce((sum, cat) => sum + cat.spent, 0);
                const totalRemaining = budget.total_amount - totalSpent;
                const overallPercentage = (totalSpent / budget.total_amount) * 100;
                
                budgetStatuses.push({
                    budget,
                    categorySpending,
                    totalSpent,
                    totalRemaining,
                    overallPercentage: overallPercentage.toFixed(1),
                    status: this.getBudgetHealthStatus(overallPercentage),
                    daysRemaining: this.calculateDaysRemaining(budget.end_date)
                });
            }
            
            return budgetStatuses;
            
        } finally {
            connection.release();
        }
    }

    getBudgetHealthStatus(percentage) {
        if (percentage <= 50) return 'healthy';
        if (percentage <= 80) return 'warning';
        if (percentage <= 100) return 'critical';
        return 'over_budget';
    }

    calculateDaysRemaining(endDate) {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    async getSpendingAnalytics(customerId, period = 'monthly', months = 6) {
        const connection = await getConnection();
        
        try {
            // Get spending by category over time
            const [categorySpending] = await connection.execute(`
                SELECT 
                    category,
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    SUM(amount) as total_spent,
                    COUNT(*) as transaction_count
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.customer_id = ?
                AND t.transaction_type IN ('withdraw', 'purchase', 'transfer_out')
                AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                AND t.category IS NOT NULL
                GROUP BY category, DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC, total_spent DESC
            `, [customerId, months]);
            
            // Get top spending categories
            const [topCategories] = await connection.execute(`
                SELECT 
                    category,
                    SUM(amount) as total_spent,
                    COUNT(*) as transaction_count,
                    AVG(amount) as avg_transaction
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.customer_id = ?
                AND t.transaction_type IN ('withdraw', 'purchase', 'transfer_out')
                AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                AND t.category IS NOT NULL
                GROUP BY category
                ORDER BY total_spent DESC
                LIMIT 10
            `, [customerId, months]);
            
            // Get spending trends
            const [monthlyTrends] = await connection.execute(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    SUM(amount) as total_spent,
                    COUNT(*) as transaction_count
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.customer_id = ?
                AND t.transaction_type IN ('withdraw', 'purchase', 'transfer_out')
                AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month DESC
            `, [customerId, months]);
            
            return {
                categorySpending,
                topCategories: topCategories.map(cat => ({
                    ...cat,
                    categoryInfo: this.categories[cat.category] || this.categories['Other']
                })),
                monthlyTrends,
                period,
                generatedAt: new Date().toISOString()
            };
            
        } finally {
            connection.release();
        }
    }

    async generateSpendingInsights(customerId) {
        const analytics = await this.getSpendingAnalytics(customerId);
        const insights = [];
        
        // Analyze spending patterns
        if (analytics.topCategories.length > 0) {
            const topCategory = analytics.topCategories[0];
            insights.push({
                type: 'top_spending',
                title: 'Highest Spending Category',
                message: `You spent $${topCategory.total_spent.toFixed(2)} on ${topCategory.category} this period.`,
                category: topCategory.category,
                amount: topCategory.total_spent
            });
        }
        
        // Analyze trends
        if (analytics.monthlyTrends.length >= 2) {
            const currentMonth = analytics.monthlyTrends[0];
            const previousMonth = analytics.monthlyTrends[1];
            const change = ((currentMonth.total_spent - previousMonth.total_spent) / previousMonth.total_spent) * 100;
            
            if (Math.abs(change) > 10) {
                insights.push({
                    type: 'spending_trend',
                    title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
                    message: `Your spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month.`,
                    change: change.toFixed(1),
                    trend: change > 0 ? 'up' : 'down'
                });
            }
        }
        
        // Budget recommendations
        const budgetRecommendations = this.generateBudgetRecommendations(analytics);
        insights.push(...budgetRecommendations);
        
        return {
            insights,
            analytics,
            generatedAt: new Date().toISOString()
        };
    }

    generateBudgetRecommendations(analytics) {
        const recommendations = [];
        
        if (analytics.topCategories.length > 0) {
            const totalSpending = analytics.topCategories.reduce((sum, cat) => sum + cat.total_spent, 0);
            
            // Recommend budget allocation based on spending patterns
            const suggestedBudget = totalSpending * 1.1; // 10% buffer
            
            recommendations.push({
                type: 'budget_suggestion',
                title: 'Budget Recommendation',
                message: `Based on your spending patterns, consider setting a monthly budget of $${suggestedBudget.toFixed(2)}.`,
                suggestedAmount: suggestedBudget,
                breakdown: analytics.topCategories.slice(0, 5).map(cat => ({
                    category: cat.category,
                    suggested: cat.total_spent * 1.1
                }))
            });
        }
        
        return recommendations;
    }

    async setBudgetAlert(customerId, budgetId, alertType, threshold) {
        const connection = await getConnection();
        
        try {
            const alertId = require('crypto').randomUUID();
            
            await connection.execute(`
                INSERT INTO budget_alerts (id, customer_id, budget_id, alert_type, 
                                         threshold_percentage, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, 1, NOW())
            `, [alertId, customerId, budgetId, alertType, threshold]);
            
            return { alertId, status: 'created' };
            
        } finally {
            connection.release();
        }
    }

    async checkBudgetAlerts(customerId) {
        const connection = await getConnection();
        
        try {
            const budgetStatuses = await this.getBudgetStatus(customerId);
            const alerts = [];
            
            for (const budgetStatus of budgetStatuses) {
                if (budgetStatus.overallPercentage >= 80) {
                    alerts.push({
                        type: 'budget_warning',
                        budgetId: budgetStatus.budget.id,
                        budgetName: budgetStatus.budget.name,
                        percentage: budgetStatus.overallPercentage,
                        message: `You've used ${budgetStatus.overallPercentage}% of your ${budgetStatus.budget.name} budget.`,
                        severity: budgetStatus.overallPercentage >= 100 ? 'critical' : 'warning'
                    });
                }
                
                // Check category-specific alerts
                for (const [category, spending] of Object.entries(budgetStatus.categorySpending)) {
                    if (spending.percentage >= 90) {
                        alerts.push({
                            type: 'category_warning',
                            budgetId: budgetStatus.budget.id,
                            category,
                            percentage: spending.percentage.toFixed(1),
                            message: `You've used ${spending.percentage.toFixed(1)}% of your ${category} budget.`,
                            severity: spending.percentage >= 100 ? 'critical' : 'warning'
                        });
                    }
                }
            }
            
            return alerts;
            
        } finally {
            connection.release();
        }
    }

    async exportSpendingReport(customerId, format = 'json', period = 'monthly') {
        const analytics = await this.getSpendingAnalytics(customerId, period);
        const insights = await this.generateSpendingInsights(customerId);
        
        const report = {
            customerId,
            period,
            generatedAt: new Date().toISOString(),
            summary: {
                totalSpent: analytics.topCategories.reduce((sum, cat) => sum + cat.total_spent, 0),
                totalTransactions: analytics.topCategories.reduce((sum, cat) => sum + cat.transaction_count, 0),
                topCategory: analytics.topCategories[0]?.category || 'N/A',
                averageTransaction: analytics.topCategories.reduce((sum, cat) => sum + cat.avg_transaction, 0) / analytics.topCategories.length || 0
            },
            analytics,
            insights: insights.insights
        };
        
        if (format === 'csv') {
            return this.convertToCSV(report);
        }
        
        return report;
    }

    convertToCSV(report) {
        let csv = 'Category,Total Spent,Transaction Count,Average Transaction\n';
        
        for (const category of report.analytics.topCategories) {
            csv += `${category.category},${category.total_spent},${category.transaction_count},${category.avg_transaction}\n`;
        }
        
        return csv;
    }
}

module.exports = SmartExpenseTracker;