const { executeQuery } = require('./config/database');

async function cleanupUsers() {
    try {
        console.log('🧹 Cleaning up users...\n');

        // Get all users except admin and johndoe
        const usersToDelete = await executeQuery(
            `SELECT u.id, u.username, c.id as customer_id 
             FROM users u 
             LEFT JOIN customers c ON u.id = c.user_id 
             WHERE u.username NOT IN ('admin', 'johndoe')`
        );

        console.log(`Found ${usersToDelete.length} users to delete:\n`);

        for (const user of usersToDelete) {
            console.log(`Deleting user: ${user.username} (ID: ${user.id})`);

            // Delete biometric data first
            await executeQuery(
                'DELETE FROM biometric_data WHERE user_id = ?',
                [user.id]
            );
            console.log('  ✓ Deleted biometric data');

            // Delete biometric audit log
            await executeQuery(
                'DELETE FROM biometric_audit_log WHERE user_id = ?',
                [user.id]
            );
            console.log('  ✓ Deleted biometric audit log');

            if (user.customer_id) {
                // Delete crypto wallets
                await executeQuery(
                    'DELETE FROM crypto_wallets WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted crypto wallets');

                // Delete budgets
                await executeQuery(
                    'DELETE FROM budgets WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted budgets');

                // Delete loans
                await executeQuery(
                    'DELETE FROM loans WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted loans');

                // Delete chat messages
                await executeQuery(
                    'DELETE FROM chat_messages WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted chat messages');

                // Delete crypto activity log
                await executeQuery(
                    'DELETE FROM crypto_activity_log WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted crypto activity log');

                // Delete support tickets
                await executeQuery(
                    'DELETE FROM support_tickets WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted support tickets');

                // Get accounts for this customer
                const accounts = await executeQuery(
                    'SELECT id FROM accounts WHERE customer_id = ?',
                    [user.customer_id]
                );

                // Delete transactions for each account
                for (const account of accounts) {
                    await executeQuery(
                        'DELETE FROM transactions WHERE account_id = ?',
                        [account.id]
                    );
                }
                console.log(`  ✓ Deleted transactions for ${accounts.length} accounts`);

                // Delete accounts
                await executeQuery(
                    'DELETE FROM accounts WHERE customer_id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted accounts');

                // Delete customer profile
                await executeQuery(
                    'DELETE FROM customers WHERE id = ?',
                    [user.customer_id]
                );
                console.log('  ✓ Deleted customer profile');
            }

            // Delete user
            await executeQuery(
                'DELETE FROM users WHERE id = ?',
                [user.id]
            );
            console.log('  ✓ Deleted user\n');
        }

        // Show remaining users
        const remainingUsers = await executeQuery(
            'SELECT username, role FROM users ORDER BY username'
        );

        console.log('✅ Cleanup complete!\n');
        console.log('Remaining users:');
        for (const user of remainingUsers) {
            console.log(`  - ${user.username} (${user.role})`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

cleanupUsers();
