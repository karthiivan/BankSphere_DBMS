// Admin-specific JavaScript functionality
class AdminManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    init() {
        // Verify admin access
        if (!this.token || (this.user.role !== 'admin' && this.user.role !== 'employee')) {
            this.redirectToLogin();
            return;
        }
    }

    redirectToLogin() {
        alert('Access denied. Admin privileges required.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }

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
            console.error('Admin API call error:', error);
            throw error;
        }
    }

    // Admin-specific utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showAlert(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'warning' ? 'alert-warning' : 'alert-danger';
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle' : 
                                  type === 'warning' ? 'exclamation-triangle' : 'x-circle'}"></i>
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

    // Customer management functions
    async getCustomers() {
        return await this.apiCall('/api/admin/customers');
    }

    async getCustomerDetails(customerId) {
        return await this.apiCall(`/api/admin/customers/${customerId}`);
    }

    async updateCustomerStatus(customerId, status) {
        return await this.apiCall(`/api/admin/customers/${customerId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    // Account management functions
    async getAllAccounts() {
        return await this.apiCall('/api/admin/accounts');
    }

    async createAccount(accountData) {
        return await this.apiCall('/api/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData)
        });
    }

    // Loan management functions
    async getLoans(status = null) {
        const url = status ? `/api/admin/loans?status=${status}` : '/api/admin/loans';
        return await this.apiCall(url);
    }

    async updateLoanStatus(loanId, status) {
        return await this.apiCall(`/api/loans/${loanId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    // System functions
    async getDashboardStats() {
        return await this.apiCall('/api/admin/dashboard');
    }

    async executeSQLQuery(query) {
        return await this.apiCall('/api/admin/sql-query', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    async generateReport(reportType, params = {}) {
        return await this.apiCall(`/api/admin/reports/${reportType}`, {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    // Utility function to create Bootstrap modals
    createModal(title, content, size = 'xl') {
        const modalId = 'adminModal' + Date.now();
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-${size}">
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
        document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
        return modal;
    }

    // Create data table from array of objects
    createDataTable(data, actions = []) {
        if (!data || data.length === 0) {
            return '<p class="text-center text-muted">No data available</p>';
        }

        const headers = Object.keys(data[0]);
        const hasActions = actions.length > 0;

        return `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            ${headers.map(header => `<th>${this.formatHeader(header)}</th>`).join('')}
                            ${hasActions ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((row, index) => `
                            <tr>
                                ${headers.map(header => `<td>${this.formatCellValue(row[header], header)}</td>`).join('')}
                                ${hasActions ? `
                                    <td>
                                        ${actions.map(action => `
                                            <button class="btn btn-sm btn-${action.class || 'primary'} me-1" 
                                                    onclick="${action.onclick}(${row.id || index})">
                                                <i class="bi bi-${action.icon}"></i> ${action.label}
                                            </button>
                                        `).join('')}
                                    </td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    formatHeader(header) {
        return header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatCellValue(value, header) {
        if (value === null || value === undefined) return '';
        
        // Format specific types
        if (header.includes('date') || header.includes('created_at') || header.includes('updated_at')) {
            return this.formatDate(value);
        }
        
        if (header.includes('amount') || header.includes('balance') || header.includes('fee')) {
            return this.formatCurrency(parseFloat(value) || 0);
        }
        
        if (header.includes('status')) {
            const statusClass = value === 'active' || value === 'approved' ? 'success' : 
                               value === 'pending' ? 'warning' : 'danger';
            return `<span class="badge bg-${statusClass}">${value}</span>`;
        }
        
        return value;
    }
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin-dashboard')) {
        window.adminManager = new AdminManager();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}