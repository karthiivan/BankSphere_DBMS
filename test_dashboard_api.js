const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testDashboardAPI() {
    try {
        // Create a test JWT token for john_doe
        const testUser = {
            userId: 2, // john_doe's user ID
            username: 'john_doe',
            role: 'customer'
        };
        
        const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('Test token created');
        
        // Test the dashboard API
        const response = await fetch('http://localhost:3000/api/profile/dashboard', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testDashboardAPI();