// Biometric Transaction Verification

class BiometricTransaction {
    constructor() {
        this.biometricAuth = new BiometricAuth();
    }

    // Verify biometric before transaction
    async verifyBeforeTransaction(transactionType, amount) {
        if (!this.biometricAuth.isSupported) {
            // If biometric not supported, proceed without verification
            return { verified: true, method: 'password' };
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                throw new Error('User not logged in');
            }

            // Check if user has biometric registered
            const hasRegistered = await this.biometricAuth.hasBiometricRegistered(user.username);
            
            if (!hasRegistered) {
                // No biometric registered, ask for password
                return await this.verifyWithPassword(transactionType, amount);
            }

            // Show biometric verification modal
            const confirmed = await this.showBiometricVerificationModal(transactionType, amount);
            
            if (!confirmed) {
                return { verified: false, cancelled: true };
            }

            // Verify with biometric
            await this.biometricAuth.showBiometricPrompt(`Verify ${transactionType}`);
            
            const result = await this.biometricAuth.authenticateBiometric(user.username);
            
            if (result.success) {
                return { verified: true, method: 'biometric' };
            } else {
                throw new Error('Biometric verification failed');
            }

        } catch (error) {
            console.error('Biometric verification error:', error);
            // Fallback to password verification
            return await this.verifyWithPassword(transactionType, amount);
        }
    }

    // Show biometric verification modal
    showBiometricVerificationModal(transactionType, amount) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'biometricVerifyModal';
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-shield-lock"></i> Verify Transaction
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center p-4">
                            <i class="bi bi-fingerprint" style="font-size: 5rem; color: #0d6efd;"></i>
                            <h5 class="mt-3">${transactionType}</h5>
                            ${amount ? `<h3 class="text-primary">$${parseFloat(amount).toFixed(2)}</h3>` : ''}
                            <p class="text-muted mt-3">Touch your fingerprint sensor to authorize this transaction</p>
                            <div class="d-grid gap-2 mt-4">
                                <button class="btn btn-primary btn-lg" onclick="document.getElementById('biometricVerifyModal').confirmBiometric()">
                                    <i class="bi bi-fingerprint"></i> Use Fingerprint
                                </button>
                                <button class="btn btn-outline-secondary" onclick="document.getElementById('biometricVerifyModal').usePassword()">
                                    <i class="bi bi-key"></i> Use Password Instead
                                </button>
                                <button class="btn btn-outline-danger" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            
            modal.confirmBiometric = () => {
                bsModal.hide();
                resolve(true);
            };
            
            modal.usePassword = () => {
                bsModal.hide();
                modal.remove();
                this.verifyWithPassword(transactionType, amount).then(resolve);
            };
            
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(false);
            });
            
            bsModal.show();
        });
    }

    // Fallback password verification
    async verifyWithPassword(transactionType, amount) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">
                                <i class="bi bi-key"></i> Verify with Password
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>${transactionType}</strong></p>
                            ${amount ? `<h4 class="text-primary">$${parseFloat(amount).toFixed(2)}</h4>` : ''}
                            <form id="passwordVerifyForm">
                                <div class="mb-3">
                                    <label class="form-label">Enter your password to confirm:</label>
                                    <input type="password" class="form-control" id="verifyPassword" required autofocus>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle"></i> Confirm
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            const bsModal = new bootstrap.Modal(modal);
            
            modal.querySelector('#passwordVerifyForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = modal.querySelector('#verifyPassword').value;
                const user = JSON.parse(localStorage.getItem('user'));
                
                try {
                    const response = await fetch('/api/auth/verify-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ password })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        bsModal.hide();
                        modal.remove();
                        resolve({ verified: true, method: 'password' });
                    } else {
                        alert('Incorrect password. Please try again.');
                    }
                } catch (error) {
                    alert('Verification failed: ' + error.message);
                }
            });
            
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve({ verified: false, cancelled: true });
            });
            
            bsModal.show();
        });
    }

    // Quick verification for small amounts (optional)
    async quickVerify(amount) {
        // For amounts under $100, might skip biometric
        if (amount < 100) {
            return { verified: true, method: 'quick' };
        }
        return await this.verifyBeforeTransaction('Transaction', amount);
    }
}

// Initialize biometric transaction
const biometricTransaction = new BiometricTransaction();
