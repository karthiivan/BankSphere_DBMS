// Core Banking Functions for Customer Dashboard with BIOMETRIC VERIFICATION

// Global variable to store user accounts
let userAccounts = [];

// Display accounts list
function displayAccountsList(accounts) {
    const container = document.getElementById('accounts-list');
    if (!container) return;
    
    userAccounts = accounts; // Store for later use
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = '<p class="text-muted">No accounts found</p>';
        return;
    }

    const html = accounts.map(account => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
            <div>
                <strong>${account.account_type_name || 'Account'}</strong><br>
                <small class="text-muted">${account.account_number}</small>
            </div>
            <div class="text-end">
                <strong>$${parseFloat(account.balance || 0).toFixed(2)}</strong><br>
                <small class="badge bg-${account.status === 'active' ? 'success' : 'warning'}">${account.status}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Load real account data from API
async function loadRealAccountData() {
    try {
        const response = await fetch('/api/accounts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            displayAccountsList(result.data);
            return result.data;
        } else {
            console.error('Failed to load accounts');
            return [];
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        return [];
    }
}

// Core Banking Functions
function showTransferModal() {
    if (!userAccounts || userAccounts.length === 0) {
        alert('Please wait for accounts to load or refresh the page.');
        return;
    }

    const accountOptions = userAccounts.map(account => 
        `<option value="${account.id}">${account.account_type_name} - ${account.account_number} ($${parseFloat(account.balance).toFixed(2)})</option>`
    ).join('');

    const modal = createSimpleModal('Transfer Money', `
        <form id="transferForm">
            <div class="mb-3">
                <label class="form-label">From Account:</label>
                <select class="form-select" id="fromAccount" required>
                    <option value="">Select account...</option>
                    ${accountOptions}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">To Account Number:</label>
                <input type="text" class="form-control" id="toAccount" placeholder="ACC123456789" pattern="ACC[0-9]{9}" required>
                <div class="form-text">Format: ACC followed by 9 digits</div>
            </div>
            <div class="mb-3">
                <label class="form-label">Amount:</label>
                <input type="number" class="form-control" id="transferAmount" placeholder="0.00" step="0.01" min="0.01" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Description (optional):</label>
                <input type="text" class="form-control" id="transferDescription" placeholder="Payment description">
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="bi bi-fingerprint"></i> Transfer Money (Biometric Required)
            </button>
        </form>
    `);
    modal.show();

    document.getElementById('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const fromAccountId = document.getElementById('fromAccount').value;
        const toAccountNumber = document.getElementById('toAccount').value;
        const amount = parseFloat(document.getElementById('transferAmount').value);
        const description = document.getElementById('transferDescription').value || 'Transfer';
        
        if (!fromAccountId || !toAccountNumber || !amount) {
            alert('Please fill in all required fields.');
            return;
        }

        // BIOMETRIC VERIFICATION REQUIRED
        if (typeof biometricTransaction !== 'undefined') {
            const verification = await biometricTransaction.verifyBeforeTransaction(
                `Transfer $${amount.toFixed(2)} to ${toAccountNumber}`,
                amount
            );
            
            if (!verification.verified) {
                if (!verification.cancelled) {
                    alert('❌ Transaction cancelled: Biometric verification failed');
                }
                return;
            }
        } else {
            alert('❌ Biometric verification system not loaded');
            return;
        }

        try {
            const response = await fetch('/api/transactions/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    fromAccountId: parseInt(fromAccountId),
                    toAccountNumber,
                    amount,
                    description
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Transfer successful!\n\n$${amount.toFixed(2)} transferred to ${toAccountNumber}\nNew balance: $${result.data.newSourceBalance.toFixed(2)}\n\n🔐 Verified with: Fingerprint`);
                bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
                await loadRealAccountData(); // Refresh account data
                if (typeof loadAccountSummary === 'function') {
                    await loadAccountSummary();
                }
                // Reload page to show updated balances
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                alert(`❌ Transfer failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Transfer error:', error);
            alert('❌ Transfer failed. Please try again.');
        }
    });
}

function showDepositModal() {
    if (!userAccounts || userAccounts.length === 0) {
        alert('Please wait for accounts to load or refresh the page.');
        return;
    }

    const accountOptions = userAccounts.map(account => 
        `<option value="${account.id}">${account.account_type_name} - ${account.account_number} ($${parseFloat(account.balance).toFixed(2)})</option>`
    ).join('');

    const modal = createSimpleModal('Make Deposit', `
        <form id="depositForm">
            <div class="mb-3">
                <label class="form-label">Account:</label>
                <select class="form-select" id="depositAccount" required>
                    <option value="">Select account...</option>
                    ${accountOptions}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Amount:</label>
                <input type="number" class="form-control" id="depositAmount" placeholder="0.00" step="0.01" min="0.01" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Description:</label>
                <input type="text" class="form-control" id="depositDescription" placeholder="Deposit description">
            </div>
            <button type="submit" class="btn btn-success">
                <i class="bi bi-plus-circle"></i> Make Deposit
            </button>
        </form>
    `);
    modal.show();

    document.getElementById('depositForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const accountId = document.getElementById('depositAccount').value;
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const description = document.getElementById('depositDescription').value || 'Deposit';
        
        if (!accountId || !amount) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const response = await fetch('/api/transactions/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    accountId: parseInt(accountId),
                    amount,
                    description
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Deposit successful!\n\n$${amount.toFixed(2)} deposited\nNew balance: $${result.data.newBalance.toFixed(2)}`);
                bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
                await loadRealAccountData(); // Refresh account data
                if (typeof loadAccountSummary === 'function') {
                    await loadAccountSummary();
                }
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                alert(`❌ Deposit failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Deposit error:', error);
            alert('❌ Deposit failed. Please try again.');
        }
    });
}

async function showTransactionHistory() {
    try {
        const response = await fetch('/api/transactions/history?limit=20', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const result = await response.json();
            const transactions = result.data;

            const transactionRows = transactions.length > 0 ? transactions.map(tx => {
                const date = new Date(tx.created_at).toLocaleDateString();
                const typeClass = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in' ? 'success' : 
                                 tx.transaction_type === 'withdraw' || tx.transaction_type === 'transfer_out' ? 'danger' : 'primary';
                const amountPrefix = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in' ? '+' : '-';
                const amountClass = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in' ? 'text-success' : 'text-danger';
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td><span class="badge bg-${typeClass}">${tx.transaction_type.replace('_', ' ')}</span></td>
                        <td>${tx.description || 'N/A'}</td>
                        <td class="${amountClass}">${amountPrefix}$${parseFloat(tx.amount).toFixed(2)}</td>
                        <td>$${parseFloat(tx.balance_after).toFixed(2)}</td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="5" class="text-center text-muted">No transactions found</td></tr>';

            const modal = createSimpleModal('Transaction History', `
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Balance After</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionRows}
                        </tbody>
                    </table>
                </div>
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 
                    Showing last 20 transactions. For complete history, download your statement.
                </div>
            `);
            modal.show();
        } else {
            alert('Failed to load transaction history. Please try again.');
        }
    } catch (error) {
        console.error('Error loading transaction history:', error);
        alert('Failed to load transaction history. Please try again.');
    }
}

function showLoanApplication() {
    const modal = createSimpleModal('Apply for Loan', `
        <form id="loanForm">
            <div class="mb-3">
                <label class="form-label">Loan Type:</label>
                <select class="form-select" id="loanType" required>
                    <option value="">Select loan type...</option>
                    <option value="personal">Personal Loan (8.99% APR)</option>
                    <option value="auto">Auto Loan (5.49% APR)</option>
                    <option value="home">Home Mortgage (3.99% APR)</option>
                    <option value="business">Business Loan (6.99% APR)</option>
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Loan Amount:</label>
                <input type="number" class="form-control" id="loanAmount" placeholder="10000" min="1000" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Purpose:</label>
                <textarea class="form-control" id="loanPurpose" rows="3" placeholder="Describe the purpose of this loan" required></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Term (months):</label>
                <select class="form-select" id="loanTerm" required>
                    <option value="">Select term...</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="60">60 months</option>
                </select>
            </div>
            <button type="submit" class="btn btn-success">
                <i class="bi bi-cash-coin"></i> Submit Application
            </button>
        </form>
    `);
    modal.show();

    document.getElementById('loanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('loanAmount').value;
        const type = document.getElementById('loanType').value;
        const term = document.getElementById('loanTerm').value;
        
        if (amount && type && term) {
            alert(`Loan application for $${amount} (${type}) submitted successfully! You will receive a response within 2-3 business days.`);
            bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
        }
    });
}

function showAccountStatements() {
    const modal = createSimpleModal('Account Statements', `
        <div class="mb-3">
            <h6>Available Statements:</h6>
            <div class="list-group">
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>October 2024 Statement</strong><br>
                        <small class="text-muted">Checking Account - ACC001000001</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadStatement('oct2024')">
                        <i class="bi bi-download"></i> Download PDF
                    </button>
                </div>
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>September 2024 Statement</strong><br>
                        <small class="text-muted">Checking Account - ACC001000001</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadStatement('sep2024')">
                        <i class="bi bi-download"></i> Download PDF
                    </button>
                </div>
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>August 2024 Statement</strong><br>
                        <small class="text-muted">Checking Account - ACC001000001</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="downloadStatement('aug2024')">
                        <i class="bi bi-download"></i> Download PDF
                    </button>
                </div>
            </div>
        </div>
        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> 
            Statements are available for the past 12 months. Older statements can be requested by contacting customer service.
        </div>
    `);
    modal.show();
}

function showWithdrawModal() {
    if (!userAccounts || userAccounts.length === 0) {
        alert('Please wait for accounts to load or refresh the page.');
        return;
    }

    const accountOptions = userAccounts.map(account => 
        `<option value="${account.id}">${account.account_type_name} - ${account.account_number} ($${parseFloat(account.balance).toFixed(2)})</option>`
    ).join('');

    const modal = createSimpleModal('Withdraw Money', `
        <form id="withdrawForm">
            <div class="mb-3">
                <label class="form-label">Account:</label>
                <select class="form-select" id="withdrawAccount" required>
                    <option value="">Select account...</option>
                    ${accountOptions}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Amount:</label>
                <input type="number" class="form-control" id="withdrawAmount" placeholder="0.00" step="0.01" min="0.01" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Description:</label>
                <input type="text" class="form-control" id="withdrawDescription" placeholder="Withdrawal description">
            </div>
            <button type="submit" class="btn btn-warning">
                <i class="bi bi-fingerprint"></i> Withdraw Money (Biometric Required)
            </button>
        </form>
    `);
    modal.show();

    document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const accountId = document.getElementById('withdrawAccount').value;
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const description = document.getElementById('withdrawDescription').value || 'Withdrawal';
        
        if (!accountId || !amount) {
            alert('Please fill in all required fields.');
            return;
        }

        // BIOMETRIC VERIFICATION REQUIRED
        if (typeof biometricTransaction !== 'undefined') {
            const verification = await biometricTransaction.verifyBeforeTransaction(
                `Withdraw $${amount.toFixed(2)}`,
                amount
            );
            
            if (!verification.verified) {
                if (!verification.cancelled) {
                    alert('❌ Withdrawal cancelled: Biometric verification failed');
                }
                return;
            }
        } else {
            alert('❌ Biometric verification system not loaded');
            return;
        }

        try {
            const response = await fetch('/api/transactions/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    accountId: parseInt(accountId),
                    amount,
                    description
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Withdrawal successful!\n\n$${amount.toFixed(2)} withdrawn\nNew balance: $${result.data.newBalance.toFixed(2)}\n\n🔐 Verified with: Fingerprint`);
                bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
                await loadRealAccountData(); // Refresh account data
                if (typeof loadAccountSummary === 'function') {
                    await loadAccountSummary();
                }
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                alert(`❌ Withdrawal failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            alert('❌ Withdrawal failed. Please try again.');
        }
    });
}

function downloadStatement(period) {
    alert(`Downloading ${period} statement... This feature will generate and download your PDF statement.`);
}

// Initialize banking functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load account data if on customer dashboard
    if (window.location.pathname.includes('enhanced-dashboard')) {
        // Load real account data
        setTimeout(async () => {
            await loadRealAccountData();
        }, 1000);
    }
});

console.log('🔐 Banking functions loaded with biometric verification requirement');
