// Enhanced Features JavaScript Module
// This file contains all the frontend functionality for the new features

class EnhancedFeatures {
    constructor() {
        this.apiBase = '/api/enhanced';
        this.currentUser = null;
        this.chatSessionId = this.generateSessionId();
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.initializeEventListeners();
        this.initializeChatbot();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.currentUser = await response.json();
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    }

    initializeEventListeners() {
        // Biometric authentication buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="register-biometric"]')) {
                this.showBiometricRegistration(e.target.dataset.type);
            }
            if (e.target.matches('[data-action="authenticate-biometric"]')) {
                this.authenticateBiometric(e.target.dataset.type);
            }
            if (e.target.matches('[data-action="create-crypto-wallet"]')) {
                this.showCryptoWalletModal();
            }
            if (e.target.matches('[data-action="buy-crypto"]')) {
                this.showBuyCryptoModal();
            }
            if (e.target.matches('[data-action="create-budget"]')) {
                this.showCreateBudgetModal();
            }
            if (e.target.matches('[data-action="get-investment-advice"]')) {
                this.getInvestmentAdvice();
            }
        });
    }

    // =============================================================================
    // BIOMETRIC AUTHENTICATION
    // =============================================================================

    async showBiometricRegistration(type) {
        const modal = this.createModal('Register Biometric', `
            <div class="mb-3">
                <h5>Register ${type.charAt(0).toUpperCase() + type.slice(1)}</h5>
                <p>Please provide your ${type} data for secure authentication.</p>
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    This is a demo. In a real system, this would capture actual biometric data.
                </div>
                <button class="btn btn-primary" onclick="enhancedFeatures.registerBiometric('${type}')">
                    Simulate ${type.charAt(0).toUpperCase() + type.slice(1)} Registration
                </button>
            </div>
        `);
        modal.show();
    }

    async registerBiometric(type) {
        try {
            // Simulate biometric data (in real system, would capture actual data)
            const simulatedBiometricData = {
                type: type,
                data: 'simulated_' + type + '_data_' + Date.now(),
                quality: 0.95
            };

            const response = await fetch(`${this.apiBase}/biometric/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    biometricType: type,
                    biometricData: simulatedBiometricData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', `${type.charAt(0).toUpperCase() + type.slice(1)} registered successfully!`);
                this.closeModal();
                this.loadBiometricStatus();
            } else {
                this.showAlert('error', result.message);
            }
        } catch (error) {
            this.showAlert('error', 'Failed to register biometric data');
            console.error('Biometric registration error:', error);
        }
    }

    async authenticateBiometric(type) {
        try {
            // Simulate biometric authentication
            const simulatedBiometricData = {
                type: type,
                data: 'simulated_' + type + '_data_auth',
                timestamp: Date.now()
            };

            const response = await fetch(`${this.apiBase}/biometric/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    biometricType: type,
                    biometricData: simulatedBiometricData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', `${type.charAt(0).toUpperCase() + type.slice(1)} authentication successful!`);
            } else {
                this.showAlert('error', 'Biometric authentication failed');
            }
        } catch (error) {
            this.showAlert('error', 'Authentication error occurred');
            console.error('Biometric authentication error:', error);
        }
    }

    async loadBiometricStatus() {
        try {
            const response = await fetch(`${this.apiBase}/biometric/user`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.displayBiometricStatus(result.data);
            }
        } catch (error) {
            console.error('Failed to load biometric status:', error);
        }
    }

    displayBiometricStatus(biometrics) {
        const container = document.getElementById('biometric-status');
        if (!container) return;

        const html = biometrics.map(bio => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6>${bio.biometric_type.charAt(0).toUpperCase() + bio.biometric_type.slice(1)}</h6>
                    <span class="badge ${bio.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${bio.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <small class="text-muted d-block">
                        Registered: ${new Date(bio.created_at).toLocaleDateString()}
                    </small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // =============================================================================
    // CRYPTOCURRENCY FEATURES
    // =============================================================================

    showCryptoWalletModal() {
        const modal = this.createModal('Create Crypto Wallet', `
            <form id="crypto-wallet-form">
                <div class="mb-3">
                    <label class="form-label">Cryptocurrency Type</label>
                    <select class="form-select" name="cryptoType" required>
                        <option value="">Select cryptocurrency</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="LTC">Litecoin (LTC)</option>
                        <option value="ADA">Cardano (ADA)</option>
                        <option value="DOT">Polkadot (DOT)</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Create Wallet</button>
            </form>
        `);

        document.getElementById('crypto-wallet-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCryptoWallet(new FormData(e.target));
        });

        modal.show();
    }

    async createCryptoWallet(formData) {
        try {
            const response = await fetch(`${this.apiBase}/crypto/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    cryptoType: formData.get('cryptoType')
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', 'Crypto wallet created successfully!');
                this.closeModal();
                this.loadCryptoWallets();
            } else {
                this.showAlert('error', result.message);
            }
        } catch (error) {
            this.showAlert('error', 'Failed to create crypto wallet');
            console.error('Crypto wallet creation error:', error);
        }
    }

    showBuyCryptoModal() {
        const modal = this.createModal('Buy Cryptocurrency', `
            <form id="buy-crypto-form">
                <div class="mb-3">
                    <label class="form-label">Account</label>
                    <select class="form-select" name="accountId" id="crypto-account-select" required>
                        <option value="">Loading accounts...</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Cryptocurrency</label>
                    <select class="form-select" name="cryptoType" required>
                        <option value="">Select cryptocurrency</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="LTC">Litecoin (LTC)</option>
                        <option value="ADA">Cardano (ADA)</option>
                        <option value="DOT">Polkadot (DOT)</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">USD Amount</label>
                    <input type="number" class="form-control" name="usdAmount" min="1" step="0.01" required>
                </div>
                <button type="submit" class="btn btn-primary">Buy Cryptocurrency</button>
            </form>
        `);

        document.getElementById('buy-crypto-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.buyCryptocurrency(new FormData(e.target));
        });

        modal.show();

        // Load user accounts after modal is shown
        setTimeout(() => {
            this.loadUserAccountsForSelect('#crypto-account-select');
        }, 100);
    }

    async buyCryptocurrency(formData) {
        try {
            const response = await fetch(`${this.apiBase}/crypto/buy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    accountId: parseInt(formData.get('accountId')),
                    cryptoType: formData.get('cryptoType'),
                    usdAmount: parseFloat(formData.get('usdAmount'))
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', 'Cryptocurrency purchased successfully!');
                this.closeModal();
                this.loadCryptoWallets();
            } else {
                this.showAlert('error', result.message);
            }
        } catch (error) {
            this.showAlert('error', 'Failed to purchase cryptocurrency');
            console.error('Crypto purchase error:', error);
        }
    }

    async loadCryptoWallets() {
        try {
            const response = await fetch('/api/crypto/portfolio', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.displayCryptoWallets(result.data);
                
                // Update crypto value in dashboard
                const totalValue = result.data.reduce((sum, crypto) => sum + parseFloat(crypto.current_value || 0), 0);
                const cryptoValueEl = document.getElementById('crypto-value');
                if (cryptoValueEl) {
                    cryptoValueEl.textContent = '$' + totalValue.toFixed(2);
                }
            }
        } catch (error) {
            console.error('Failed to load crypto wallets:', error);
        }
    }

    displayCryptoWallets(wallets) {
        const container = document.getElementById('crypto-wallets');
        if (!container) return;

        if (wallets.length === 0) {
            container.innerHTML = '<p class="text-muted">No crypto wallets found.</p>';
            return;
        }

        const html = wallets.map(wallet => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6>${wallet.cryptoInfo.name} (${wallet.crypto_type})</h6>
                            <p class="mb-1">Balance: ${wallet.balance} ${wallet.crypto_type}</p>
                            <p class="mb-1">USD Value: $${wallet.usdValue}</p>
                            <small class="text-muted">Address: ${wallet.wallet_address}</small>
                        </div>
                        <div>
                            <span class="badge ${wallet.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                ${wallet.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // =============================================================================
    // EXPENSE TRACKING & BUDGETING
    // =============================================================================

    showCreateBudgetModal() {
        const modal = this.createModal('Create Budget', `
            <form id="create-budget-form">
                <div class="mb-3">
                    <label class="form-label">Budget Name</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Period</label>
                    <select class="form-select" name="period" required>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">Start Date</label>
                            <input type="date" class="form-control" name="startDate" required>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-3">
                            <label class="form-label">End Date</label>
                            <input type="date" class="form-control" name="endDate" required>
                        </div>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Total Budget Amount</label>
                    <input type="number" class="form-control" name="totalAmount" min="1" step="0.01" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Category Allocations</label>
                    <div id="category-allocations">
                        ${this.generateCategoryAllocationInputs()}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Create Budget</button>
            </form>
        `);

        document.getElementById('create-budget-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBudget(new FormData(e.target));
        });

        modal.show();
    }

    generateCategoryAllocationInputs() {
        const categories = [
            'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
            'Healthcare', 'Utilities', 'Education', 'Travel', 'Insurance', 'Other'
        ];

        return categories.map(category => `
            <div class="row mb-2">
                <div class="col-8">
                    <label class="form-label">${category}</label>
                </div>
                <div class="col-4">
                    <input type="number" class="form-control" 
                           name="category_${category.replace(/\s+/g, '_').toLowerCase()}" 
                           min="0" step="0.01" placeholder="Amount">
                </div>
            </div>
        `).join('');
    }

    async createBudget(formData) {
        try {
            // Process category allocations
            const categoryAllocations = [];
            const categories = [
                'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
                'Healthcare', 'Utilities', 'Education', 'Travel', 'Insurance', 'Other'
            ];

            categories.forEach(category => {
                const key = `category_${category.replace(/\s+/g, '_').toLowerCase()}`;
                const amount = formData.get(key);
                if (amount && parseFloat(amount) > 0) {
                    categoryAllocations.push({
                        category: category,
                        amount: parseFloat(amount)
                    });
                }
            });

            const budgetData = {
                name: formData.get('name'),
                period: formData.get('period'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                totalAmount: parseFloat(formData.get('totalAmount')),
                categoryAllocations: categoryAllocations
            };

            const response = await fetch(`${this.apiBase}/expenses/budget`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(budgetData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('success', 'Budget created successfully!');
                this.closeModal();
                this.loadBudgetStatus();
            } else {
                this.showAlert('error', result.message);
            }
        } catch (error) {
            this.showAlert('error', 'Failed to create budget');
            console.error('Budget creation error:', error);
        }
    }

    async loadBudgetStatus() {
        try {
            const response = await fetch(`${this.apiBase}/expenses/budget/status`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.displayBudgetStatus(result.data);
            }
        } catch (error) {
            console.error('Failed to load budget status:', error);
        }
    }

    displayBudgetStatus(budgets) {
        const container = document.getElementById('budget-status');
        if (!container) return;

        if (!Array.isArray(budgets) || budgets.length === 0) {
            container.innerHTML = '<p class="text-muted">No active budgets found.</p>';
            return;
        }

        const html = budgets.map(budget => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>${budget.budget.name}</h5>
                    <div class="progress mb-2">
                        <div class="progress-bar ${this.getBudgetProgressColor(budget.overallPercentage)}" 
                             style="width: ${Math.min(budget.overallPercentage, 100)}%">
                            ${budget.overallPercentage}%
                        </div>
                    </div>
                    <p>Spent: $${budget.totalSpent.toFixed(2)} / $${budget.budget.total_amount.toFixed(2)}</p>
                    <p>Remaining: $${budget.totalRemaining.toFixed(2)}</p>
                    <p>Days remaining: ${budget.daysRemaining}</p>
                    <span class="badge ${this.getBudgetStatusBadge(budget.status)}">${budget.status}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getBudgetProgressColor(percentage) {
        if (percentage <= 50) return 'bg-success';
        if (percentage <= 80) return 'bg-warning';
        return 'bg-danger';
    }

    getBudgetStatusBadge(status) {
        const badges = {
            'healthy': 'bg-success',
            'warning': 'bg-warning',
            'critical': 'bg-danger',
            'over_budget': 'bg-danger'
        };
        return badges[status] || 'bg-secondary';
    }

    // =============================================================================
    // INVESTMENT ADVISORY
    // =============================================================================

    async getInvestmentAdvice() {
        try {
            if (!this.currentUser || !this.currentUser.customerId) {
                this.showAlert('error', 'Please log in to get investment advice');
                return;
            }

            const response = await fetch(`${this.apiBase}/investment/analysis/${this.currentUser.customerId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.displayInvestmentAdvice(result.data);
            } else {
                this.showAlert('error', 'Failed to get investment advice');
            }
        } catch (error) {
            this.showAlert('error', 'Error getting investment advice');
            console.error('Investment advice error:', error);
        }
    }

    displayInvestmentAdvice(advice) {
        const modal = this.createModal('Investment Advice', `
            <div class="investment-advice">
                <h5>Risk Profile: ${advice.riskTolerance}</h5>
                <div class="mb-3">
                    <h6>Recommended Portfolio Allocation:</h6>
                    <div class="row">
                        <div class="col-4">Stocks: ${advice.portfolioAllocation.stocks}%</div>
                        <div class="col-4">Bonds: ${advice.portfolioAllocation.bonds}%</div>
                        <div class="col-4">Cash: ${advice.portfolioAllocation.cash}%</div>
                    </div>
                </div>
                <div class="mb-3">
                    <h6>Investment Recommendations:</h6>
                    ${advice.recommendations.map(rec => `
                        <div class="card mb-2">
                            <div class="card-body">
                                <h6>${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</h6>
                                <p>Allocation: ${rec.allocation}%</p>
                                <p>Recommended Amount: $${rec.recommendedAmount.toFixed(2)}</p>
                                <p>Reasoning: ${rec.reasoning}</p>
                                <ul>
                                    ${rec.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary" onclick="enhancedFeatures.createInvestmentPlan()">
                    Create Investment Plan
                </button>
            </div>
        `);

        modal.show();
    }

    // =============================================================================
    // AI CHATBOT
    // =============================================================================

    initializeChatbot() {
        // Create chatbot widget if it doesn't exist
        if (!document.getElementById('chatbot-widget')) {
            this.createChatbotWidget();
        }
    }

    createChatbotWidget() {
        const widget = document.createElement('div');
        widget.id = 'chatbot-widget';
        widget.className = 'chatbot-widget';
        widget.innerHTML = `
            <div class="chatbot-header" onclick="enhancedFeatures.toggleChatbot()">
                <i class="bi bi-chat-dots"></i>
                <span>AI Assistant</span>
            </div>
            <div class="chatbot-body" id="chatbot-body" style="display: none;">
                <div class="chatbot-messages" id="chatbot-messages"></div>
                <div class="chatbot-input">
                    <input type="text" id="chatbot-input" placeholder="Type your message..." 
                           onkeypress="if(event.key==='Enter') enhancedFeatures.sendChatMessage()">
                    <button onclick="enhancedFeatures.sendChatMessage()">
                        <i class="bi bi-send"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(widget);
        this.addChatbotStyles();
    }

    addChatbotStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chatbot-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 1000;
            }
            .chatbot-header {
                background: #007bff;
                color: white;
                padding: 15px;
                border-radius: 10px 10px 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .chatbot-body {
                height: 400px;
                display: flex;
                flex-direction: column;
            }
            .chatbot-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                max-height: 300px;
            }
            .chatbot-input {
                display: flex;
                padding: 10px;
                border-top: 1px solid #eee;
            }
            .chatbot-input input {
                flex: 1;
                border: 1px solid #ddd;
                border-radius: 20px;
                padding: 8px 15px;
                outline: none;
            }
            .chatbot-input button {
                background: #007bff;
                color: white;
                border: none;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                margin-left: 10px;
                cursor: pointer;
            }
            .chat-message {
                margin-bottom: 10px;
                padding: 8px 12px;
                border-radius: 15px;
                max-width: 80%;
            }
            .chat-message.user {
                background: #007bff;
                color: white;
                margin-left: auto;
            }
            .chat-message.bot {
                background: #f1f1f1;
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }

    toggleChatbot() {
        const body = document.getElementById('chatbot-body');
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
        
        if (body.style.display === 'block') {
            this.loadChatHistory();
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message to chat
        this.addChatMessage(message, 'user');
        input.value = '';

        try {
            const response = await fetch(`${this.apiBase}/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.chatSessionId
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.addChatMessage(result.data.text, 'bot');
            } else {
                this.addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            this.addChatMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
            console.error('Chat error:', error);
        }
    }

    addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.textContent = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async loadChatHistory() {
        try {
            const response = await fetch(`${this.apiBase}/chatbot/history/${this.chatSessionId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                const messagesContainer = document.getElementById('chatbot-messages');
                messagesContainer.innerHTML = '';
                
                result.data.forEach(msg => {
                    this.addChatMessage(msg.message, msg.sender);
                });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    createModal(title, content) {
        const modalId = 'dynamic-modal-' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        
        // Clean up modal after it's hidden
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
            document.getElementById(modalId).remove();
        });

        return modal;
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    showAlert(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const container = document.querySelector('.container') || document.body;
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    async loadUserAccountsForSelect(selector) {
        try {
            const response = await fetch('/api/accounts', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const result = await response.json();
                const select = document.querySelector(selector);
                
                if (select) {
                    // Clear loading message
                    select.innerHTML = '<option value="">Select account</option>';
                    
                    if (result.data && result.data.length > 0) {
                        result.data.forEach(account => {
                            const option = document.createElement('option');
                            option.value = account.id;
                            const balance = parseFloat(account.balance);
                            const accountType = account.account_type_name || account.account_type || 'Account';
                            option.textContent = `${accountType} (${account.account_number}) - $${balance.toFixed(2)}`;
                            select.appendChild(option);
                        });
                    } else {
                        select.innerHTML = '<option value="">No accounts available</option>';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
        }
    }
}

// Initialize enhanced features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedFeatures = new EnhancedFeatures();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedFeatures;
}