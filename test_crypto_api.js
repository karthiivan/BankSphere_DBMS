const fetch = require('node-fetch');

async function testCryptoAPI() {
    try {
        // Login first to get token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'john_doe', password: 'password123' })
        });
        
        const loginResult = await loginResponse.json();
        
        if (!loginResult.success) {
            console.log('❌ Login failed');
            return;
        }
        
        const token = loginResult.token;
        console.log('✅ Logged in successfully\n');
        
        // Get crypto portfolio
        const portfolioResponse = await fetch('http://localhost:3000/api/crypto/portfolio', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const portfolioResult = await portfolioResponse.json();
        
        console.log('📊 Crypto Portfolio API Response:');
        console.log(JSON.stringify(portfolioResult, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

testCryptoAPI();
