// Test admin endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

// Login as admin first
async function loginAsAdmin() {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });
    
    const result = await response.json();
    if (result.success) {
        console.log('✅ Admin login successful');
        return result.token || result.data?.token;
    } else {
        console.log('❌ Admin login failed:', result.message);
        return null;
    }
}

async function testAdminEndpoints(token) {
    console.log('\n📊 Testing Admin Endpoints...\n');
    
    // Test dashboard
    try {
        const dashResponse = await fetch(`${BASE_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashResult = await dashResponse.json();
        console.log('✅ Dashboard:', dashResult.success ? 'Working' : 'Failed');
        if (dashResult.success) {
            console.log('   Stats:', dashResult.data);
        }
    } catch (error) {
        console.log('❌ Dashboard error:', error.message);
    }
    
    // Test customers
    try {
        const custResponse = await fetch(`${BASE_URL}/admin/customers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const custResult = await custResponse.json();
        console.log('✅ Customers:', custResult.success ? `Working (${custResult.data.length} customers)` : 'Failed');
    } catch (error) {
        console.log('❌ Customers error:', error.message);
    }
    
    // Test accounts
    try {
        const accResponse = await fetch(`${BASE_URL}/admin/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const accResult = await accResponse.json();
        console.log('✅ Accounts:', accResult.success ? `Working (${accResult.data.length} accounts)` : 'Failed');
    } catch (error) {
        console.log('❌ Accounts error:', error.message);
    }
    
    // Test loans
    try {
        const loanResponse = await fetch(`${BASE_URL}/admin/loans`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const loanResult = await loanResponse.json();
        console.log('✅ Loans:', loanResult.success ? `Working (${loanResult.data.length} loans)` : 'Failed');
    } catch (error) {
        console.log('❌ Loans error:', error.message);
    }
    
    // Test transactions
    try {
        const txResponse = await fetch(`${BASE_URL}/admin/transactions?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const txResult = await txResponse.json();
        console.log('✅ Transactions:', txResult.success ? `Working (${txResult.data.length} transactions)` : 'Failed');
    } catch (error) {
        console.log('❌ Transactions error:', error.message);
    }
    
    // Test SQL query
    try {
        const sqlResponse = await fetch(`${BASE_URL}/admin/sql-query`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'SELECT COUNT(*) as total FROM users' })
        });
        const sqlResult = await sqlResponse.json();
        console.log('✅ SQL Query:', sqlResult.success ? 'Working' : 'Failed');
        if (sqlResult.success) {
            console.log('   Result:', sqlResult.data);
        }
    } catch (error) {
        console.log('❌ SQL Query error:', error.message);
    }
}

async function main() {
    console.log('🔧 Testing Admin Dashboard Endpoints\n');
    
    const token = await loginAsAdmin();
    if (!token) {
        console.log('\n❌ Cannot proceed without admin token');
        return;
    }
    
    await testAdminEndpoints(token);
    
    console.log('\n✅ Admin endpoint testing complete!');
}

main().catch(console.error);
