const bcrypt = require('bcrypt');

async function generateHashes() {
    const passwords = {
        'admin123': 'admin',
        'password123': ['john_doe', 'jane_smith', 'bob_johnson'],
        'employee123': 'emp_manager'
    };

    for (const [password, users] of Object.entries(passwords)) {
        const hash = await bcrypt.hash(password, 12);
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}`);

        if (Array.isArray(users)) {
            for (const user of users) {
                console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '${user}';`);
            }
        } else {
            console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '${users}';`);
        }
        console.log('---');
    }
}

generateHashes().catch(console.error);