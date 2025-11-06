// Password Verification for Banking Transactions
// Biometric is only used for account registration and login

// Transaction Verification Object - Password Only
const transactionVerification = {
    async verifyBeforeTransaction(description, amount) {
        // Use password verification for transactions
        return await this.verifyWithPassword(description, amount);
    },
    
    async verifyWithPassword(description, amount) {
        return new Promise((resolve) => {
            const password = prompt(`🔐 Verify Transaction\n\n${description}\n$${amount.toFixed(2)}\n\nEnter your password:`);
            
            if (!password) {
                resolve({ verified: false, method: 'password', cancelled: true });
                return;
            }
            
            // Verify password with API
            fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ password })
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    resolve({ verified: true, method: 'password', cancelled: false });
                } else {
                    alert('❌ Incorrect password');
                    resolve({ verified: false, method: 'password', cancelled: false });
                }
            })
            .catch(error => {
                alert('❌ Verification failed');
                resolve({ verified: false, method: 'password', cancelled: false });
            });
        });
    }
};

// Store original functions
const originalShowTransferModal = window.showTransferModal;
const originalProcessWithdrawal = window.processWithdrawal;
const originalProcessCryptoPurchase = window.processCryptoPurchase;
const originalProcessCryptoSale = window.processCryptoSale;

// Override showTransferModal with password verification
window.showTransferModal = function() {
    // Call original function
    originalShowTransferModal();
    
    // Wait for form to be added to DOM
    setTimeout(() => {
        const transferForm = document.getElementById('transferForm');
        if (transferForm) {
            // Override with password verification
            transferForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const amount = parseFloat(document.getElementById('transferAmount').value);
                const toAccount = document.getElementById('toAccount').value;
                
                // Verify with password
                const verification = await transactionVerification.verifyBeforeTransaction(
                    `Transfer $${amount.toFixed(2)} to ${toAccount}`,
                    amount
                );
                
                if (!verification.verified) {
                    if (!verification.cancelled) {
                        alert('❌ Transaction cancelled: Password verification failed');
                    }
                    return false;
                }
                
                // Continue with transfer
                const fromAccountId = document.getElementById('fromAccount').value;
                const description = document.getElementById('transferDescription').value || 'Transfer';
                
                try {
                    const response = await fetch('/api/transactions/transfer', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            fromAccountId: parseInt(fromAccountId),
                            toAccountNumber: toAccount,
                            amount,
                            description
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        alert(`✅ Transfer successful!\n\n$${amount.toFixed(2)} transferred to ${toAccount}\nNew balance: $${result.data.newSourceBalance.toFixed(2)}`);
                        bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
                        
                        // Force refresh of all account data
                        if (typeof loadRealAccountData === 'function') {
                            await loadRealAccountData();
                        }
                        if (typeof loadAccountSummary === 'function') {
                            await loadAccountSummary();
                        }
                        
                        // Reload the page to ensure all data is fresh
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
                
                return false;
            }, true); // Use capture phase
        }
    }, 100);
};

// Override withdrawal with password verification
window.processWithdrawal = async function() {
    const accountId = document.getElementById('withdrawAccount').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    
    if (!accountId || !amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    // Verify with password
    const verification = await transactionVerification.verifyBeforeTransaction(
        `Withdraw $${amount.toFixed(2)}`,
        amount
    );
    
    if (!verification.verified) {
        if (!verification.cancelled) {
            alert('❌ Withdrawal cancelled: Password verification failed');
        }
        return;
    }
    
    // Proceed with withdrawal
    try {
        const response = await fetch('/api/transactions/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                accountId: parseInt(accountId),
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Withdrawal successful!\n\n$${amount.toFixed(2)} withdrawn\nNew balance: $${result.data.newBalance.toFixed(2)}`);
            bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
            
            // Force refresh of all account data
            if (typeof loadRealAccountData === 'function') {
                await loadRealAccountData();
            }
            if (typeof loadAccountSummary === 'function') {
                await loadAccountSummary();
            }
            
            // Reload the page to ensure all data is fresh
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
};

// Override crypto purchase with password verification
window.processCryptoPurchase = async function() {
    const crypto = document.getElementById('cryptoSelect').value;
    const amount = parseFloat(document.getElementById('cryptoAmount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    // Verify with password
    const verification = await transactionVerification.verifyBeforeTransaction(
        `Buy $${amount.toFixed(2)} of ${crypto}`,
        amount
    );
    
    if (!verification.verified) {
        if (!verification.cancelled) {
            alert('❌ Purchase cancelled: Password verification failed');
        }
        return;
    }
    
    // Proceed with purchase
    try {
        const accountsResponse = await fetch('/api/accounts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!accountsResponse.ok) {
            alert('Failed to load account information');
            return;
        }
        
        const accountsResult = await accountsResponse.json();
        if (!accountsResult.data || accountsResult.data.length === 0) {
            alert('No accounts found. Please create an account first.');
            return;
        }
        
        const accountId = accountsResult.data[0].id;
        
        const response = await fetch('/api/crypto/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                cryptoSymbol: crypto,
                usdAmount: amount,
                accountId: accountId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Crypto purchase successful!\n\nBought ${result.data.cryptoAmount} ${crypto} for $${amount}\nNew balance: $${result.data.newAccountBalance}`);
            bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
            
            // Force refresh of all account data
            if (typeof loadRealAccountData === 'function') {
                await loadRealAccountData();
            }
            if (typeof loadAccountSummary === 'function') {
                await loadAccountSummary();
            }
            
            // Reload the page to ensure all data is fresh
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            alert(`❌ Purchase failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Crypto purchase error:', error);
        alert('❌ Purchase failed. Please try again.');
    }
};

// Override crypto sale with password verification
window.processCryptoSale = async function() {
    const crypto = document.getElementById('cryptoSellSelect').value;
    const amount = parseFloat(document.getElementById('cryptoSellAmount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount to sell');
        return;
    }
    
    // Verify with password
    const verification = await transactionVerification.verifyBeforeTransaction(
        `Sell ${amount} ${crypto}`,
        0
    );
    
    if (!verification.verified) {
        if (!verification.cancelled) {
            alert('❌ Sale cancelled: Password verification failed');
        }
        return;
    }
    
    // Proceed with sale
    try {
        const accountsResponse = await fetch('/api/accounts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!accountsResponse.ok) {
            alert('Failed to load account information');
            return;
        }
        
        const accountsResult = await accountsResponse.json();
        if (!accountsResult.data || accountsResult.data.length === 0) {
            alert('No accounts found.');
            return;
        }
        
        const accountId = accountsResult.data[0].id;
        
        const response = await fetch('/api/crypto/sell', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                cryptoSymbol: crypto,
                cryptoAmount: amount,
                accountId: accountId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Crypto sale successful!\n\nSold ${result.data.cryptoAmount} ${crypto} for $${result.data.usdAmount}\nNew balance: $${result.data.newAccountBalance}`);
            bootstrap.Modal.getInstance(document.querySelector('.modal.show')).hide();
            
            // Force refresh of all account data
            if (typeof loadRealAccountData === 'function') {
                await loadRealAccountData();
            }
            if (typeof loadAccountSummary === 'function') {
                await loadAccountSummary();
            }
            
            // Reload the page to ensure all data is fresh
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            alert(`❌ Sale failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Crypto sale error:', error);
        alert('❌ Sale failed. Please try again.');
    }
};

console.log('🔐 Password verification enabled for all transactions');
console.log('👆 Biometric authentication is only used for account registration and login');
