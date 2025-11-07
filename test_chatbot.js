const { executeQuery } = require('./config/database');

async function testChatbot() {
    try {
        console.log('🔍 Checking chat_messages table...');
        
        // Check if table exists
        const tables = await executeQuery("SHOW TABLES LIKE 'chat_messages'");
        
        if (tables.length === 0) {
            console.log('❌ chat_messages table does not exist!');
            console.log('📝 Creating chat_messages table...');
            
            await executeQuery(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    customer_id INT NOT NULL,
                    session_id VARCHAR(36) NOT NULL,
                    message TEXT NOT NULL,
                    sender ENUM('user', 'bot') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    INDEX idx_chat_messages_customer (customer_id),
                    INDEX idx_chat_messages_session (session_id),
                    INDEX idx_chat_messages_created (created_at)
                )
            `);
            
            console.log('✅ chat_messages table created!');
        } else {
            console.log('✅ chat_messages table exists');
        }
        
        // Test chatbot
        console.log('\n🤖 Testing AI Chatbot...');
        const AIChatbot = require('./ai_chatbot');
        const chatbot = new AIChatbot();
        
        const sessionId = 'test-session-' + Date.now();
        const customerId = 1; // john_doe
        
        // Test 1: Greeting
        console.log('\n📝 Test 1: Greeting');
        const response1 = await chatbot.processMessage(customerId, 'hello', sessionId);
        console.log('Response:', response1.text);
        
        // Test 2: Balance inquiry
        console.log('\n📝 Test 2: Balance Inquiry');
        const response2 = await chatbot.processMessage(customerId, 'show my balance', sessionId);
        console.log('Response:', response2.text.substring(0, 100) + '...');
        
        // Test 3: Transaction history
        console.log('\n📝 Test 3: Transaction History');
        const response3 = await chatbot.processMessage(customerId, 'show my transactions', sessionId);
        console.log('Response:', response3.text.substring(0, 100) + '...');
        
        console.log('\n✅ All chatbot tests passed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
}

testChatbot();
