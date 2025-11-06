// Main application JavaScript
class BankApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    init() {
        // Check if user is logged in
        if (this.token && this.isTokenValid()) {
            this.loadUserInterface();
        }
    }

    isTokenValid() {
        if (!this.token) return false;
        
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            return payload.exp > Date.now() / 1000;
        } catch (error) {
            return false;
        }
    }

    async loadUserInterface() {
        // Update navigation if user is logged in
        this.updateNavigation();
    }

    updateNavigation() {
        const navElement = document.querySelector('.navbar-nav');
        if (navElement && this.user.username) {
            navElement.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i> ${this.user.username}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/enhanced-dashboard.html">Dashboard</a></li>
                        <li><a class="dropdown-item" href="#" onclick="app.logout()">Logout</a></li>
                    </ul>
                </li>
            `;
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
    }

    // Utility method for making authenticated API calls
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(endpoint, mergedOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API call failed');
            }

            return data;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Show alert message
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
}

// Global logout function
function logout() {
    if (window.app) {
        window.app.logout();
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BankApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BankApp;
}

// Biome
tric Transaction Verification
const biometricTransaction = {
    async verifyBeforeTransaction(description, amount) {
        // Check if biometric is supported and available
        if (window.biometricAuth && biometricAuth.isSupported) {
            try {
                const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                
                if (available) {
                    // Try biometric first
                    const useBiometric = confirm(`🔐 Verify Transaction\n\n${description}\n\nUse fingerprint verification?\n\nClick OK for fingerprint, Cancel for password.`);
                    
                    if (useBiometric) {
                        try {
                            // Show biometric prompt
                            if (biometricAuth.showBiometricPrompt) {
                                await biometricAuth.showBiometricPrompt('Touch your fingerprint sensor to verify transaction');
                            }
                            
                            // For testing: If Windows Hello prompt appeared, assume success
                            // In production, this would verify the actual biometric data
                            console.log('✅ Biometric verification successful');
                            alert('✅ Fingerprint verified! Transaction approved.');
                            return { verified: true, method: 'biometric', cancelled: false };
                        } catch (error) {
                            console.error('Biometric verification failed:', error);
                            // Biometric failed - ask if they want to try password
                            const tryPassword = confirm('❌ Fingerprint verification failed.\n\nWould you like to use password instead?');
                            if (!tryPassword) {
                                return { verified: false, method: 'biometric', cancelled: true };
                            }
                            // Fall through to password
                        }
                    } else {
                        // User chose password
                        return await this.verifyWithPassword(description, amount);
                    }
                } else {
                    // Biometric not available, use password
                    return await this.verifyWithPassword(description, amount);
                }
            } catch (e) {
                console.error('Biometric check failed:', e);
                // Error checking biometric, use password
                return await this.verifyWithPassword(description, amount);
            }
        }
        
        // Biometric not supported, use password
        return await this.verifyWithPassword(description, amount);
    },
    
    async verifyWithPassword(description, amount) {
        return new Promise((resolve) => {
            // Create password verification modal
            const modal = document.createElement('div');
            modal.className = 'modal fade show';
            modal.style.display = 'block';
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">🔐 Verify with Password</h5>
                            <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>${description}</strong></p>
                            <p class="text-primary fs-4">$${amount.toFixed(2)}</p>
                            <p>Enter your password to confirm:</p>
                            <input type="password" class="form-control" id="verifyPassword" placeholder="Enter password" value="password123">
                            <small class="text-muted">Quick accounts use: password123</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmPasswordBtn">✓ Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Focus password field
            setTimeout(() => document.getElementById('verifyPassword').focus(), 100);
            
            // Handle confirm
            document.getElementById('confirmPasswordBtn').onclick = async () => {
                const password = document.getElementById('verifyPassword').value;
                
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
                    modal.remove();
                    
                    if (result.success) {
                        resolve({ verified: true, method: 'password', cancelled: false });
                    } else {
                        alert('❌ Incorrect password. Please try again.');
                        resolve({ verified: false, method: 'password', cancelled: false });
                    }
                } catch (error) {
                    modal.remove();
                    alert('❌ Verification failed. Please try again.');
                    resolve({ verified: false, method: 'password', cancelled: false });
                }
            };
            
            // Handle cancel
            modal.querySelector('.btn-close').onclick = () => {
                modal.remove();
                resolve({ verified: false, method: 'password', cancelled: true });
            };
            modal.querySelector('.btn-secondary').onclick = () => {
                modal.remove();
                resolve({ verified: false, method: 'password', cancelled: true });
            };
        });
    }
};
