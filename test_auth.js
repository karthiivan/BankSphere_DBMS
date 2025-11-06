const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testLogin() {
    console.log('\n🔐 Testing Login...');
    
    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Login successful!');
            console.log('   Token:', result.token.substring(0, 50) + '...');
            console.log('   User:', result.user);
            return result.token;
        } else {
            console.log('❌ Login failed:', result.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Login error:', error.message);
        return null;
    }
}

async function testRegister() {
    console.log('\n📝 Testing Registration...');
    
    const randomNum = Math.floor(Math.random() * 10000);
    const ssnPart1 = Math.floor(Math.random() * 900 + 100); // 100-999
    const ssnPart2 = Math.floor(Math.random() * 90 + 10);   // 10-99
    const ssnPart3 = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
    
    const testData = {
        username: `testuser${randomNum}`,
        email: `test${randomNum}@example.com`,
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        phone: '(555) 123-4567',
        address: '123 Test Street',
        city: 'Test City',
        state: 'NY',
        zipCode: '12345',
        ssn: `${ssnPart1}-${ssnPart2}-${ssnPart3}`
    };

    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Registration successful!');
            console.log('   Username:', testData.username);
            console.log('   Email:', testData.email);
            return testData;
        } else {
            console.log('❌ Registration failed:', result.message);
            if (result.errors) {
                console.log('   Validation errors:', result.errors);
            }
            return null;
        }
    } catch (error) {
        console.log('❌ Registration error:', error.message);
        return null;
    }
}

async function testGetCurrentUser(token) {
    console.log('\n👤 Testing Get Current User...');
    
    try {
        const response = await fetch(`${BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Get current user successful!');
            console.log('   User data:', result.data);
            return result.data;
        } else {
            console.log('❌ Get current user failed:', result.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Get current user error:', error.message);
        return null;
    }
}

async function testGetAccounts(token) {
    console.log('\n🏦 Testing Get Accounts...');
    
    try {
        const response = await fetch(`${BASE_URL}/accounts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Get accounts successful!');
            console.log(`   Found ${result.data.length} accounts`);
            if (result.data.length > 0) {
                console.log('   First account:', {
                    accountNumber: result.data[0].account_number,
                    type: result.data[0].account_type_name,
                    balance: result.data[0].balance
                });
            }
            return result.data;
        } else {
            console.log('❌ Get accounts failed:', result.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Get accounts error:', error.message);
        return null;
    }
}

async function testEnhancedFeatures(token) {
    console.log('\n✨ Testing Enhanced Features...');
    
    // Test Crypto Market Data
    try {
        const response = await fetch(`${BASE_URL}/enhanced/crypto/market`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Crypto market data retrieved!');
            console.log('   Available cryptocurrencies:', Object.keys(result.data).join(', '));
        } else {
            console.log('❌ Crypto market data failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Crypto market data error:', error.message);
    }

    // Test Investment Market Insights
    try {
        const response = await fetch(`${BASE_URL}/enhanced/investment/market-insights`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Investment market insights retrieved!');
            console.log('   Market trends available');
        } else {
            console.log('❌ Investment market insights failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Investment market insights error:', error.message);
    }
}

async function runAllTests() {
    console.log('🧪 Starting Authentication and API Tests...');
    console.log('='.repeat(50));

    // Test 1: Login with existing user
    const token = await testLogin();
    
    if (token) {
        // Test 2: Get current user
        await testGetCurrentUser(token);
        
        // Test 3: Get accounts
        await testGetAccounts(token);
        
        // Test 4: Enhanced features
        await testEnhancedFeatures(token);
    }

    // Test 5: Register new user
    const newUser = await testRegister();
    
    if (newUser) {
        // Test 6: Login with new user
        console.log('\n🔐 Testing Login with New User...');
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUser.username,
                    password: newUser.password
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ New user login successful!');
            } else {
                console.log('❌ New user login failed:', result.message);
            }
        } catch (error) {
            console.log('❌ New user login error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed!');
}

// Run tests
runAllTests().catch(console.error);