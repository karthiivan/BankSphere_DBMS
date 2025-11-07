const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = 'admin123';
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash is valid:', isValid);
}

hashPassword().catch(console.error);