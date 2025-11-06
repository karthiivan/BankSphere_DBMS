const { getConnection } = require('./config/database');

class AIChatbot {
    constructor() {
        this.intents = {
            greeting: {
                patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
                responses: [
                    'Hello! I\'m your SecureBank AI assistant. How can I help you today?',
                    'Hi there! Welcome to SecureBank. What can I assist you with?',
                    'Good day! I\'m here to help with your banking needs.'
                ]
            },
            balance_inquiry: {
                patterns: ['balance', 'how much money', 'account balance', 'check balance'],
                responses: [
                    'I can help you check your account balance. Let me retrieve that information for you.',
                    'I\'ll get your current balance right away.'
                ],
                requiresAuth: true
            },
            transaction_history: {
                patterns: ['transaction history', 'recent transactions', 'transaction list', 'my transactions'],
                responses: [
                    'I\'ll show you your recent transaction history.',
                    'Let me pull up your recent transactions.'
                ],
                requiresAuth: true
            },
            transfer_money: {
                patterns: ['transfer money', 'send money', 'transfer funds', 'move money'],
                responses: [
                    'I can help you transfer money. You\'ll need to provide the recipient account and amount.',
                    'I\'ll guide you through the money transfer process.'
                ],
                requiresAuth: true
            },
            loan_info: {
                patterns: ['loan', 'apply for loan', 'loan rates', 'loan application'],
                responses: [
                    'I can provide information about our loan products and help you apply.',
                    'Let me tell you about our available loan options.'
                ]
            },
            account_opening: {
                patterns: ['open account', 'new account', 'create account', 'account types'],
                responses: [
                    'I can help you learn about our account types and the opening process.',
                    'Let me explain our different account options.'
                ]
            },
            security_help: {
                patterns: ['forgot password', 'locked account', 'security', 'reset password'],
                responses: [
                    'I can help with security-related issues. Let me guide you through the process.',
                    'For security matters, I\'ll provide you with the appropriate steps.'
                ]
            },
            complaint: {
                patterns: ['complaint', 'problem', 'issue', 'not working', 'error'],
                responses: [
                    'I\'m sorry to hear you\'re experiencing an issue. Let me help resolve this.',
                    'I understand your concern. I\'ll do my best to assist you.'
                ]
            },
            goodbye: {
                patterns: ['bye', 'goodbye', 'see you', 'thanks', 'thank you'],
                responses: [
                    'Thank you for using SecureBank! Have a great day!',
                    'Goodbye! Feel free to return if you need any assistance.',
                    'Thank you for banking with us. Take care!'
                ]
            }
        };

        this.contextMemory = new Map(); // Store conversation context
    }

    async processMessage(customerId, message, sessionId) {
        const connection = await getConnection();

        try {
            // Store incoming message
            await this.logChatMessage(customerId, message, 'user', sessionId);

            // Analyze intent
            const intent = this.analyzeIntent(message.toLowerCase());

            // Get conversation context
            const context = this.contextMemory.get(sessionId) || {};

            // Generate response based on intent
            let response;
            if (intent.requiresAuth && !context.authenticated) {
                response = await this.handleAuthenticationRequired(customerId, sessionId);
            } else {
                response = await this.generateResponse(intent, customerId, message, context);
            }

            // Update context
            this.updateContext(sessionId, intent, message, response);

            // Store bot response
            await this.logChatMessage(customerId, response.text, 'bot', sessionId);

            return response;

        } finally {
            connection.release();
        }
    }

    analyzeIntent(message) {
        let bestMatch = { intent: 'unknown', confidence: 0 };

        for (const [intentName, intentData] of Object.entries(this.intents)) {
            for (const pattern of intentData.patterns) {
                if (message.includes(pattern)) {
                    const confidence = this.calculateConfidence(message, pattern);
                    if (confidence > bestMatch.confidence) {
                        bestMatch = {
                            intent: intentName,
                            confidence,
                            data: intentData
                        };
                    }
                }
            }
        }

        return bestMatch;
    }

    calculateConfidence(message, pattern) {
        const words = message.split(' ');
        const patternWords = pattern.split(' ');
        let matches = 0;

        for (const word of patternWords) {
            if (words.includes(word)) {
                matches++;
            }
        }

        return matches / patternWords.length;
    }

    async generateResponse(intent, customerId, message, context) {
        switch (intent.intent) {
            case 'balance_inquiry':
                return await this.handleBalanceInquiry(customerId);

            case 'transaction_history':
                return await this.handleTransactionHistory(customerId);

            case 'transfer_money':
                return await this.handleTransferMoney(customerId, message, context);

            case 'loan_info':
                return await this.handleLoanInfo(customerId);

            case 'account_opening':
                return this.handleAccountOpening();

            case 'security_help':
                return this.handleSecurityHelp();

            case 'complaint':
                return await this.handleComplaint(customerId, message);

            default:
                if (intent.data && intent.data.responses) {
                    const randomResponse = intent.data.responses[
                        Math.floor(Math.random() * intent.data.responses.length)
                    ];
                    return { text: randomResponse, type: 'text' };
                }
                return this.handleUnknownIntent(message);
        }
    }

    async handleBalanceInquiry(customerId) {
        const connection = await getConnection();

        try {
            const [accounts] = await connection.execute(`
                SELECT a.account_number, at.name as account_type, a.balance, a.status
                FROM accounts a
                JOIN account_types at ON a.account_type_id = at.id
                WHERE a.customer_id = ? AND a.status = 'active'
                ORDER BY a.created_at
            `, [customerId]);

            if (accounts.length === 0) {
                return {
                    text: 'I don\'t see any active accounts for you. Would you like to open a new account?',
                    type: 'text'
                };
            }

            let totalBalance = 0;
            const accountList = accounts.map(account => {
                const balance = parseFloat(account.balance);
                totalBalance += balance;
                return `${account.account_type}: $${balance.toFixed(2)}`;
            });

            let responseText = `Your account balances:\n\n${accountList.join('\n')}\n\nTotal: $${totalBalance.toFixed(2)}`;

            return {
                text: responseText,
                type: 'account_summary',
                data: { accounts, totalBalance }
            };

        } finally {
            connection.release();
        }
    }

    async handleTransactionHistory(customerId) {
        const connection = await getConnection();

        try {
            const [transactions] = await connection.execute(`
                SELECT t.*, a.account_number, at.name as account_type
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                JOIN account_types at ON a.account_type_id = at.id
                WHERE a.customer_id = ?
                ORDER BY t.created_at DESC
                LIMIT 10
            `, [customerId]);

            if (transactions.length === 0) {
                return {
                    text: 'You don\'t have any recent transactions.',
                    type: 'text'
                };
            }

            // Format transactions in a friendly way
            const now = new Date();
            const transactionList = transactions.map(tx => {
                const txDate = new Date(tx.created_at);
                const diffTime = Math.abs(now - txDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                let timeStr;
                if (diffDays === 0) {
                    timeStr = 'today';
                } else if (diffDays === 1) {
                    timeStr = 'yesterday';
                } else if (diffDays < 7) {
                    timeStr = `${diffDays} days ago`;
                } else {
                    timeStr = txDate.toLocaleDateString();
                }

                const txAmount = parseFloat(tx.amount);
                const amountStr = `$${txAmount.toFixed(2)}`;
                const typeStr = tx.transaction_type.replace(/_/g, ' ');
                const desc = tx.description ? ` - ${tx.description}` : '';

                return `${amountStr} ${typeStr} (${timeStr})${desc}`;
            });

            let responseText = 'Your recent transactions:\n\n';
            responseText += transactionList.join('\n');

            return {
                text: responseText,
                type: 'transaction_list',
                data: { transactions }
            };

        } finally {
            connection.release();
        }
    }

    async handleTransferMoney(customerId, message, context) {
        // Extract amount and account from message if possible
        const amountMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
        const accountMatch = message.match(/(?:to|account)\s+(\w+)/i);

        if (context.transferStep) {
            return await this.continueTransferProcess(customerId, message, context);
        }

        return {
            text: 'I can help you transfer money. To get started, I\'ll need:\n\n' +
                '1. The recipient\'s account number\n' +
                '2. The amount you want to transfer\n' +
                '3. Your account to transfer from\n\n' +
                'Please provide the recipient\'s account number first.',
            type: 'transfer_start',
            data: { step: 'recipient_account' }
        };
    }

    async handleLoanInfo(customerId) {
        const loanTypes = [
            { type: 'Personal Loan', rate: '8.99%', term: '2-7 years', maxAmount: '$50,000' },
            { type: 'Auto Loan', rate: '5.49%', term: '3-7 years', maxAmount: '$100,000' },
            { type: 'Home Mortgage', rate: '3.99%', term: '15-30 years', maxAmount: '$1,000,000' },
            { type: 'Business Loan', rate: '6.99%', term: '1-10 years', maxAmount: '$500,000' }
        ];

        const loanList = loanTypes.map(loan =>
            `${loan.type}: ${loan.rate} APR, up to ${loan.maxAmount}, ${loan.term}`
        );

        let responseText = `Our loan products:\n\n${loanList.join('\n')}\n\nWould you like to apply? I can help you get started!`;

        return {
            text: responseText,
            type: 'loan_info',
            data: { loanTypes }
        };
    }

    handleAccountOpening() {
        const accountTypes = [
            { type: 'Savings Account', minBalance: '$100', features: 'High interest, unlimited deposits' },
            { type: 'Checking Account', minBalance: '$25', features: 'Debit card, online banking, bill pay' },
            { type: 'Premium Account', minBalance: '$5,000', features: 'Premium benefits, dedicated support' },
            { type: 'Business Account', minBalance: '$500', features: 'Business banking, merchant services' }
        ];

        const accountList = accountTypes.map(acc =>
            `${acc.type} (min ${acc.minBalance}): ${acc.features}`
        );

        let responseText = `Our account types:\n\n${accountList.join('\n')}\n\nVisit any branch or apply online. Need help getting started?`;

        return {
            text: responseText,
            type: 'account_types',
            data: { accountTypes }
        };
    }

    handleSecurityHelp() {
        return {
            text: 'For security assistance, I can help with:\n\n' +
                '• Password reset - I can guide you through resetting your password\n' +
                '• Account lockout - Help unlock your account\n' +
                '• Suspicious activity - Report and investigate unusual transactions\n' +
                '• Two-factor authentication - Set up additional security\n\n' +
                'What specific security issue are you experiencing?',
            type: 'security_menu'
        };
    }

    async handleComplaint(customerId, message) {
        const connection = await getConnection();

        try {
            // Create a support ticket
            const ticketId = require('crypto').randomUUID();

            await connection.execute(`
                INSERT INTO support_tickets (id, customer_id, subject, description, 
                                           priority, status, created_at)
                VALUES (?, ?, 'Chatbot Complaint', ?, 'medium', 'open', NOW())
            `, [ticketId, customerId, message]);

            return {
                text: `I'm sorry to hear about your issue. I've created a support ticket (${ticketId.substring(0, 8)}) for you. ` +
                    'Our customer service team will review your concern and contact you within 24 hours.\n\n' +
                    'Is there anything else I can help you with right now?',
                type: 'complaint_logged',
                data: { ticketId }
            };

        } finally {
            connection.release();
        }
    }

    handleUnknownIntent(message) {
        const suggestions = [
            'Check account balance',
            'View transaction history',
            'Transfer money',
            'Loan information',
            'Open new account',
            'Security help'
        ];

        return {
            text: 'I\'m not sure I understand. Here are some things I can help you with:\n\n' +
                suggestions.map(s => `• ${s}`).join('\n') + '\n\n' +
                'You can also type "help" for more options, or ask me a specific question.',
            type: 'help_menu',
            data: { suggestions }
        };
    }

    async handleAuthenticationRequired(customerId, sessionId) {
        // In a real system, this would integrate with the actual auth system
        return {
            text: 'For security reasons, I need to verify your identity before accessing account information. ' +
                'Please log in to your account first, then return to chat.',
            type: 'auth_required'
        };
    }

    updateContext(sessionId, intent, message, response) {
        const context = this.contextMemory.get(sessionId) || {};

        context.lastIntent = intent.intent;
        context.lastMessage = message;
        context.lastResponse = response;
        context.timestamp = Date.now();

        // Handle specific context updates
        if (intent.intent === 'transfer_money' && response.type === 'transfer_start') {
            context.transferStep = response.data.step;
        }

        this.contextMemory.set(sessionId, context);

        // Clean up old contexts (older than 1 hour)
        this.cleanupOldContexts();
    }

    cleanupOldContexts() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        for (const [sessionId, context] of this.contextMemory.entries()) {
            if (context.timestamp < oneHourAgo) {
                this.contextMemory.delete(sessionId);
            }
        }
    }

    async logChatMessage(customerId, message, sender, sessionId) {
        const connection = await getConnection();

        try {
            await connection.execute(`
                INSERT INTO chat_messages (customer_id, session_id, message, sender, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [customerId, sessionId, message, sender]);

        } finally {
            connection.release();
        }
    }

    async getChatHistory(customerId, sessionId, limit = 50) {
        const connection = await getConnection();

        try {
            const [messages] = await connection.execute(`
                SELECT message, sender, created_at
                FROM chat_messages
                WHERE customer_id = ? AND session_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `, [customerId, sessionId, limit]);

            return messages.reverse(); // Return in chronological order

        } finally {
            connection.release();
        }
    }

    async getAnalytics() {
        const connection = await getConnection();

        try {
            const [stats] = await connection.execute(`
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(DISTINCT customer_id) as unique_users,
                    COUNT(DISTINCT session_id) as total_sessions,
                    AVG(CASE WHEN sender = 'user' THEN 1 ELSE 0 END) as avg_user_messages
                FROM chat_messages
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const [topIntents] = await connection.execute(`
                SELECT 
                    SUBSTRING_INDEX(message, ' ', 2) as intent_phrase,
                    COUNT(*) as frequency
                FROM chat_messages
                WHERE sender = 'user' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY intent_phrase
                ORDER BY frequency DESC
                LIMIT 10
            `);

            return {
                stats: stats[0],
                topIntents,
                lastUpdated: new Date().toISOString()
            };

        } finally {
            connection.release();
        }
    }
}

module.exports = AIChatbot;