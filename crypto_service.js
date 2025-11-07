const crypto = require('crypto');
const { getConnection } = require('./config/database');

class CryptocurrencyService {
    constructor() {
        this.supportedCryptos = {
            BTC: { name: 'Bitcoin', decimals: 8, minAmount: 0.00001 },
            ETH: { name: 'Ethereum', decimals: 18, minAmount: 0.001 },
            LTC: { name: 'Litecoin', decimals: 8, minAmount: 0.001 },
            ADA: { name: 'Cardano', decimals: 6, minAmount: 1 },
            DOT: { name: 'Polkadot', decimals: 10, minAmount: 0.1 }
        };
        
        // Simulated exchange rates (in real system, would fetch from crypto APIs)
        this.exchangeRates = {
            BTC: 45000,
            ETH: 3000,
            LTC: 150,
            ADA: 0.5,
            DOT: 25
        };
    }

    async createCryptoWallet(customerId, cryptoType) {
        if (!this.supportedCryptos[cryptoType]) {
            throw new Error('Unsupported cryptocurrency');
        }

        const connection = await getConnection();
        
        try {
            // Generate wallet address (simplified - real system would use actual crypto libraries)
            const walletAddress = this.generateWalletAddress(cryptoType);
            const privateKey = this.generatePrivateKey();
            const encryptedPrivateKey = this.encryptPrivateKey(privateKey);
            
            const walletId = crypto.randomUUID();
            
            await connection.execute(`
                INSERT INTO crypto_wallets (id, customer_id, crypto_type, wallet_address, 
                                          encrypted_private_key, balance, status, created_at)
                VALUES (?, ?, ?, ?, ?, 0, 'active', NOW())
            `, [walletId, customerId, cryptoType, walletAddress, encryptedPrivateKey]);
            
            // Log wallet creation
            await this.logCryptoActivity(customerId, 'WALLET_CREATED', cryptoType, 0, walletAddress);
            
            return {
                walletId,
                walletAddress,
                cryptoType,
                balance: 0,
                status: 'active'
            };
            
        } finally {
            connection.release();
        }
    }

    async getCryptoWallets(customerId) {
        const connection = await getConnection();
        
        try {
            const [wallets] = await connection.execute(`
                SELECT id, crypto_type, wallet_address, balance, status, created_at
                FROM crypto_wallets 
                WHERE customer_id = ? AND status = 'active'
                ORDER BY created_at DESC
            `, [customerId]);
            
            // Add current USD values
            const walletsWithValues = wallets.map(wallet => ({
                ...wallet,
                cryptoInfo: this.supportedCryptos[wallet.crypto_type],
                usdValue: (wallet.balance * this.exchangeRates[wallet.crypto_type]).toFixed(2),
                currentRate: this.exchangeRates[wallet.crypto_type]
            }));
            
            return walletsWithValues;
            
        } finally {
            connection.release();
        }
    }

    async buyCryptocurrency(customerId, accountId, cryptoType, usdAmount) {
        const connection = await getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Validate account balance
            const [account] = await connection.execute(`
                SELECT balance FROM accounts WHERE id = ? AND customer_id = ?
            `, [accountId, customerId]);
            
            if (account.length === 0 || account[0].balance < usdAmount) {
                throw new Error('Insufficient funds');
            }
            
            // Calculate crypto amount
            const cryptoRate = this.exchangeRates[cryptoType];
            const cryptoAmount = usdAmount / cryptoRate;
            const minAmount = this.supportedCryptos[cryptoType].minAmount;
            
            if (cryptoAmount < minAmount) {
                throw new Error(`Minimum purchase amount is ${minAmount} ${cryptoType}`);
            }
            
            // Get or create crypto wallet
            let [wallet] = await connection.execute(`
                SELECT id, balance FROM crypto_wallets 
                WHERE customer_id = ? AND crypto_type = ? AND status = 'active'
            `, [customerId, cryptoType]);
            
            if (wallet.length === 0) {
                const newWallet = await this.createCryptoWallet(customerId, cryptoType);
                wallet = [{ id: newWallet.walletId, balance: 0 }];
            }
            
            // Deduct from bank account
            await connection.execute(`
                UPDATE accounts SET balance = balance - ? WHERE id = ?
            `, [usdAmount, accountId]);
            
            // Add to crypto wallet
            await connection.execute(`
                UPDATE crypto_wallets SET balance = balance + ? WHERE id = ?
            `, [cryptoAmount, wallet[0].id]);
            
            // Record bank transaction
            await connection.execute(`
                INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                        balance_after, created_at)
                VALUES (?, 'crypto_purchase', ?, ?, 
                        (SELECT balance FROM accounts WHERE id = ?), NOW())
            `, [accountId, usdAmount, `Purchased ${cryptoAmount} ${cryptoType}`, accountId]);
            
            // Record crypto transaction
            const cryptoTxId = crypto.randomUUID();
            await connection.execute(`
                INSERT INTO crypto_transactions (id, wallet_id, transaction_type, crypto_amount, 
                                               usd_amount, exchange_rate, status, created_at)
                VALUES (?, ?, 'buy', ?, ?, ?, 'completed', NOW())
            `, [cryptoTxId, wallet[0].id, cryptoAmount, usdAmount, cryptoRate]);
            
            await connection.commit();
            
            // Log activity
            await this.logCryptoActivity(customerId, 'BUY', cryptoType, cryptoAmount);
            
            return {
                success: true,
                transactionId: cryptoTxId,
                cryptoAmount,
                usdAmount,
                exchangeRate: cryptoRate,
                newBalance: wallet[0].balance + cryptoAmount
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async sellCryptocurrency(customerId, walletId, cryptoAmount, accountId) {
        const connection = await getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get wallet info
            const [wallet] = await connection.execute(`
                SELECT crypto_type, balance FROM crypto_wallets 
                WHERE id = ? AND customer_id = ? AND status = 'active'
            `, [walletId, customerId]);
            
            if (wallet.length === 0 || wallet[0].balance < cryptoAmount) {
                throw new Error('Insufficient crypto balance');
            }
            
            // Calculate USD amount
            const cryptoRate = this.exchangeRates[wallet[0].crypto_type];
            const usdAmount = cryptoAmount * cryptoRate;
            
            // Update crypto wallet
            await connection.execute(`
                UPDATE crypto_wallets SET balance = balance - ? WHERE id = ?
            `, [cryptoAmount, walletId]);
            
            // Add to bank account
            await connection.execute(`
                UPDATE accounts SET balance = balance + ? WHERE id = ?
            `, [usdAmount, accountId]);
            
            // Record bank transaction
            await connection.execute(`
                INSERT INTO transactions (account_id, transaction_type, amount, description, 
                                        balance_after, created_at)
                VALUES (?, 'crypto_sale', ?, ?, 
                        (SELECT balance FROM accounts WHERE id = ?), NOW())
            `, [accountId, usdAmount, `Sold ${cryptoAmount} ${wallet[0].crypto_type}`, accountId]);
            
            // Record crypto transaction
            const cryptoTxId = crypto.randomUUID();
            await connection.execute(`
                INSERT INTO crypto_transactions (id, wallet_id, transaction_type, crypto_amount, 
                                               usd_amount, exchange_rate, status, created_at)
                VALUES (?, ?, 'sell', ?, ?, ?, 'completed', NOW())
            `, [cryptoTxId, walletId, cryptoAmount, usdAmount, cryptoRate]);
            
            await connection.commit();
            
            // Log activity
            await this.logCryptoActivity(customerId, 'SELL', wallet[0].crypto_type, cryptoAmount);
            
            return {
                success: true,
                transactionId: cryptoTxId,
                cryptoAmount,
                usdAmount,
                exchangeRate: cryptoRate,
                newBalance: wallet[0].balance - cryptoAmount
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async transferCryptocurrency(customerId, fromWalletId, toAddress, cryptoAmount) {
        const connection = await getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get wallet info
            const [wallet] = await connection.execute(`
                SELECT crypto_type, balance FROM crypto_wallets 
                WHERE id = ? AND customer_id = ? AND status = 'active'
            `, [fromWalletId, customerId]);
            
            if (wallet.length === 0 || wallet[0].balance < cryptoAmount) {
                throw new Error('Insufficient crypto balance');
            }
            
            // Calculate network fee (simplified)
            const networkFee = this.calculateNetworkFee(wallet[0].crypto_type, cryptoAmount);
            const totalAmount = cryptoAmount + networkFee;
            
            if (wallet[0].balance < totalAmount) {
                throw new Error('Insufficient balance for transfer including network fee');
            }
            
            // Update wallet balance
            await connection.execute(`
                UPDATE crypto_wallets SET balance = balance - ? WHERE id = ?
            `, [totalAmount, fromWalletId]);
            
            // Record crypto transaction
            const cryptoTxId = crypto.randomUUID();
            await connection.execute(`
                INSERT INTO crypto_transactions (id, wallet_id, transaction_type, crypto_amount, 
                                               network_fee, to_address, status, created_at)
                VALUES (?, ?, 'transfer', ?, ?, ?, 'pending', NOW())
            `, [cryptoTxId, fromWalletId, cryptoAmount, networkFee, toAddress]);
            
            await connection.commit();
            
            // Simulate blockchain confirmation (in real system, would interact with blockchain)
            setTimeout(async () => {
                await this.confirmCryptoTransaction(cryptoTxId);
            }, 30000); // 30 seconds simulation
            
            // Log activity
            await this.logCryptoActivity(customerId, 'TRANSFER', wallet[0].crypto_type, cryptoAmount, toAddress);
            
            return {
                success: true,
                transactionId: cryptoTxId,
                cryptoAmount,
                networkFee,
                toAddress,
                status: 'pending'
            };
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getCryptoTransactionHistory(customerId, cryptoType = null, limit = 50) {
        const connection = await getConnection();
        
        try {
            let query = `
                SELECT ct.*, cw.crypto_type, cw.wallet_address
                FROM crypto_transactions ct
                JOIN crypto_wallets cw ON ct.wallet_id = cw.id
                WHERE cw.customer_id = ?
            `;
            
            const params = [customerId];
            
            if (cryptoType) {
                query += ' AND cw.crypto_type = ?';
                params.push(cryptoType);
            }
            
            query += ' ORDER BY ct.created_at DESC LIMIT ?';
            params.push(limit);
            
            const [transactions] = await connection.execute(query, params);
            
            return transactions;
            
        } finally {
            connection.release();
        }
    }

    async getCryptoMarketData() {
        // Simulate market data (in real system, would fetch from crypto APIs)
        const marketData = {};
        
        for (const [symbol, info] of Object.entries(this.supportedCryptos)) {
            const currentPrice = this.exchangeRates[symbol];
            const change24h = (Math.random() - 0.5) * 0.1; // Random change between -5% and +5%
            
            marketData[symbol] = {
                name: info.name,
                symbol,
                currentPrice,
                change24h: (change24h * 100).toFixed(2),
                volume24h: Math.floor(Math.random() * 1000000000), // Random volume
                marketCap: Math.floor(currentPrice * Math.random() * 100000000),
                lastUpdated: new Date().toISOString()
            };
        }
        
        return marketData;
    }

    // Helper methods
    generateWalletAddress(cryptoType) {
        // Simplified address generation (real system would use proper crypto libraries)
        const prefixes = { BTC: '1', ETH: '0x', LTC: 'L', ADA: 'addr1', DOT: '1' };
        const prefix = prefixes[cryptoType] || '1';
        const randomPart = crypto.randomBytes(20).toString('hex');
        return prefix + randomPart;
    }

    generatePrivateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    encryptPrivateKey(privateKey) {
        // Use createCipheriv instead of deprecated createCipher
        const key = crypto.scryptSync(process.env.CRYPTO_ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Prepend IV to encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }

    calculateNetworkFee(cryptoType, amount) {
        // Simplified fee calculation
        const feeRates = { BTC: 0.0001, ETH: 0.002, LTC: 0.001, ADA: 0.17, DOT: 0.01 };
        return feeRates[cryptoType] || 0.001;
    }

    async confirmCryptoTransaction(transactionId) {
        const connection = await getConnection();
        
        try {
            await connection.execute(`
                UPDATE crypto_transactions SET status = 'completed', confirmed_at = NOW()
                WHERE id = ?
            `, [transactionId]);
            
        } finally {
            connection.release();
        }
    }

    async logCryptoActivity(customerId, action, cryptoType, amount, address = null) {
        const connection = await getConnection();
        
        try {
            await connection.execute(`
                INSERT INTO crypto_activity_log (customer_id, action, crypto_type, amount, 
                                                address, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [customerId, action, cryptoType, amount, address]);
            
        } finally {
            connection.release();
        }
    }
}

module.exports = CryptocurrencyService;