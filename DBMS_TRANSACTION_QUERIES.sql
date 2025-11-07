-- ============================================
-- BANKSPHERE - DBMS PROJECT SQL QUERIES
-- Complete Transaction Demonstrations
-- ============================================

USE banksphere;

-- ============================================
-- 1. BASIC TRANSACTION OPERATIONS
-- ============================================

-- Example 1: Simple Money Transfer Transaction

-- Add to receiver account
UPDATE accounts 
SET balance = balance + 500.00,
    updated_at = NOW()
WHERE id = 2;

-- Record the transaction
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'transfer', 500.00, 'Transfer to Account #2', balance, NOW()
FROM accounts WHERE id = 1;

COMMIT;

-- ============================================
-- 2. TRANSACTION WITH ROLLBACK (Error Handling)
-- ============================================

START TRANSACTION;

-- Try to withdraw more than available balance
UPDATE accounts 
SET balance = balance - 10000.00
WHERE id = 1 AND balance >= 10000.00;

-- Check if update affected any rows
-- If no rows affected (insufficient funds), rollback
SELECT ROW_COUNT() INTO @affected_rows;

-- Rollback if insufficient funds
ROLLBACK;

-- ============================================
-- 3. CRYPTO PURCHASE TRANSACTION
-- ============================================

START TRANSACTION;

-- Get current account balance
SELECT balance INTO @current_balance 
FROM accounts 
WHERE id = 1 AND customer_id = 1;

-- Check if sufficient funds
SET @purchase_amount = 100.00;
SET @crypto_symbol = 'BTC';
SET @crypto_price = 45230.00;
SET @crypto_amount = @purchase_amount / @crypto_price;

-- Deduct USD from account
UPDATE accounts 
SET balance = balance - @purchase_amount,
    updated_at = NOW()
WHERE id = 1 AND balance >= @purchase_amount;

-- Record withdrawal transaction
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'crypto_purchase', @purchase_amount, 
       CONCAT('Crypto purchase: ', @crypto_amount, ' BTC'), 
       balance, NOW()
FROM accounts WHERE id = 1;

-- Update crypto wallet
INSERT INTO crypto_wallets (customer_id, crypto_symbol, crypto_name, amount, average_price)
VALUES (1, @crypto_symbol, 'Bitcoin', @crypto_amount, @crypto_price)
ON DUPLICATE KEY UPDATE 
    amount = amount + @crypto_amount,
    average_price = ((amount * average_price) + (@crypto_amount * @crypto_price)) / (amount + @crypto_amount),
    updated_at = NOW();

-- Record crypto transaction
INSERT INTO crypto_transactions (customer_id, account_id, crypto_symbol, transaction_type, crypto_amount, usd_amount, price_per_unit)
VALUES (1, 1, @crypto_symbol, 'buy', @crypto_amount, @purchase_amount, @crypto_price);

COMMIT;

-- ============================================
-- 4. CRYPTO SELL TRANSACTION
-- ============================================

START TRANSACTION;

-- Set variables
SET @sell_crypto_amount = 0.001;
SET @sell_crypto_symbol = 'BTC';
SET @sell_crypto_price = 45230.00;
SET @sell_usd_amount = @sell_crypto_amount * @sell_crypto_price;

-- Check if user has enough crypto
SELECT amount INTO @current_crypto 
FROM crypto_wallets 
WHERE customer_id = 1 AND crypto_symbol = @sell_crypto_symbol;

-- Deduct crypto from wallet
UPDATE crypto_wallets 
SET amount = amount - @sell_crypto_amount,
    updated_at = NOW()
WHERE customer_id = 1 
  AND crypto_symbol = @sell_crypto_symbol 
  AND amount >= @sell_crypto_amount;

-- Add USD to account
UPDATE accounts 
SET balance = balance + @sell_usd_amount,
    updated_at = NOW()
WHERE id = 1;

-- Record deposit transaction
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'crypto_sale', @sell_usd_amount, 
       CONCAT('Crypto sale: ', @sell_crypto_amount, ' BTC'), 
       balance, NOW()
FROM accounts WHERE id = 1;

-- Record crypto transaction
INSERT INTO crypto_transactions (customer_id, account_id, crypto_symbol, transaction_type, crypto_amount, usd_amount, price_per_unit)
VALUES (1, 1, @sell_crypto_symbol, 'sell', @sell_crypto_amount, @sell_usd_amount, @sell_crypto_price);

COMMIT;

-- ============================================
-- 5. LOAN APPLICATION TRANSACTION
-- ============================================

START TRANSACTION;

-- Generate loan number
SET @loan_number = CONCAT('LOAN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 1000000), 6, '0'));

-- Insert loan application
INSERT INTO loans (
    customer_id, 
    loan_type_id, 
    loan_number, 
    amount, 
    interest_rate, 
    term_months, 
    monthly_payment, 
    purpose, 
    status, 
    application_date
)
VALUES (
    1,                          -- customer_id
    1,                          -- loan_type_id (Personal Loan)
    @loan_number,               -- loan_number
    5000.00,                    -- amount
    8.99,                       -- interest_rate
    24,                         -- term_months
    228.18,                     -- monthly_payment (calculated)
    'Home improvement',         -- purpose
    'pending',                  -- status
    NOW()                       -- application_date
);

-- Get the loan ID
SET @loan_id = LAST_INSERT_ID();

-- Log the application
INSERT INTO audit_log (user_id, action, details, ip_address, created_at)
VALUES (1, 'LOAN_APPLICATION', CONCAT('Loan application submitted: ', @loan_number), '127.0.0.1', NOW());

COMMIT;

-- ============================================
-- 6. LOAN APPROVAL TRANSACTION (Admin)
-- ============================================

START TRANSACTION;

-- Approve the loan
UPDATE loans 
SET status = 'approved',
    approved_by = 2,            -- admin user_id
    approval_date = NOW(),
    updated_at = NOW()
WHERE id = @loan_id;

-- Disburse loan amount to customer account
UPDATE accounts 
SET balance = balance + 5000.00,
    updated_at = NOW()
WHERE customer_id = 1 AND account_type = 'checking';

-- Record loan disbursement transaction
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'loan_disbursement', 5000.00, 
       CONCAT('Loan disbursement: ', @loan_number), 
       balance, NOW()
FROM accounts WHERE customer_id = 1 AND account_type = 'checking';

-- Log the approval
INSERT INTO audit_log (user_id, action, details, ip_address, created_at)
VALUES (2, 'LOAN_APPROVAL', CONCAT('Loan approved: ', @loan_number), '127.0.0.1', NOW());

COMMIT;

-- ============================================
-- 7. BILL PAYMENT TRANSACTION
-- ============================================

START TRANSACTION;

-- Set bill payment details
SET @bill_amount = 150.00;
SET @bill_type = 'electricity';

-- Deduct from account
UPDATE accounts 
SET balance = balance - @bill_amount,
    updated_at = NOW()
WHERE id = 1 AND balance >= @bill_amount;

-- Record bill payment transaction
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'bill_payment', @bill_amount, 
       CONCAT('Bill payment: ', @bill_type), 
       balance, NOW()
FROM accounts WHERE id = 1;

COMMIT;

-- ============================================
-- 8. BUDGET CREATION TRANSACTION
-- ============================================

START TRANSACTION;

-- Create budget
INSERT INTO budgets (id, customer_id, name, period, start_date, end_date, total_amount, status)
VALUES (
    UUID(),
    1,
    'Monthly Budget - November 2024',
    'monthly',
    '2024-11-01',
    '2024-11-30',
    3000.00,
    'active'
);

SET @budget_id = LAST_INSERT_ID();

-- Add budget categories
INSERT INTO budget_categories (budget_id, category, allocated_amount) VALUES
(@budget_id, 'Food & Dining', 800.00),
(@budget_id, 'Transportation', 400.00),
(@budget_id, 'Shopping', 600.00),
(@budget_id, 'Entertainment', 300.00),
(@budget_id, 'Utilities', 500.00),
(@budget_id, 'Other', 400.00);

COMMIT;

-- ============================================
-- 9. MULTIPLE ACCOUNT OPERATIONS (Complex Transaction)
-- ============================================

START TRANSACTION;

-- Scenario: Customer deposits cash, transfers to savings, and pays a bill

-- 1. Deposit cash to checking
UPDATE accounts 
SET balance = balance + 1000.00,
    updated_at = NOW()
WHERE id = 1;

INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'deposit', 1000.00, 'Cash deposit', balance, NOW()
FROM accounts WHERE id = 1;

-- 2. Transfer to savings
UPDATE accounts 
SET balance = balance - 500.00,
    updated_at = NOW()
WHERE id = 1;

UPDATE accounts 
SET balance = balance + 500.00,
    updated_at = NOW()
WHERE id = 3 AND customer_id = 1 AND account_type = 'savings';

INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'transfer', 500.00, 'Transfer to savings', balance, NOW()
FROM accounts WHERE id = 1;

-- 3. Pay utility bill
UPDATE accounts 
SET balance = balance - 200.00,
    updated_at = NOW()
WHERE id = 1;

INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'bill_payment', 200.00, 'Utility bill payment', balance, NOW()
FROM accounts WHERE id = 1;

COMMIT;

-- ============================================
-- 10. TRANSACTION WITH SAVEPOINT
-- ============================================

START TRANSACTION;

-- First operation
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'withdrawal', 100.00, 'ATM withdrawal', balance, NOW() FROM accounts WHERE id = 1;

SAVEPOINT after_withdrawal;

-- Second operation
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'fee', 50.00, 'Service fee', balance, NOW() FROM accounts WHERE id = 1;

-- Rollback to savepoint (undo fee, keep withdrawal)
ROLLBACK TO SAVEPOINT after_withdrawal;

COMMIT;

-- ============================================
-- QUERY DEMONSTRATIONS
-- ============================================

-- View all transactions for a customer
SELECT 
    t.id,
    a.account_number,
    t.transaction_type,
    t.amount,
    t.description,
    t.balance_after,
    t.created_at
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.customer_id = 1
ORDER BY t.created_at DESC
LIMIT 20;

-- View crypto portfolio
SELECT 
    crypto_symbol,
    crypto_name,
    amount,
    average_price,
    (amount * 45230) as current_value,
    ((45230 - average_price) * amount) as profit_loss
FROM crypto_wallets
WHERE customer_id = 1;

-- View crypto transaction history
SELECT 
    ct.id,
    ct.crypto_symbol,
    ct.transaction_type,
    ct.crypto_amount,
    ct.usd_amount,
    ct.price_per_unit,
    ct.created_at,
    a.account_number
FROM crypto_transactions ct
JOIN accounts a ON ct.account_id = a.id
WHERE ct.customer_id = 1
ORDER BY ct.created_at DESC;

-- View all loans
SELECT 
    l.loan_number,
    lt.name as loan_type,
    l.amount,
    l.interest_rate,
    l.term_months,
    l.monthly_payment,
    l.status,
    l.application_date,
    l.approval_date
FROM loans l
JOIN loan_types lt ON l.loan_type_id = lt.id
WHERE l.customer_id = 1;

-- View account summary with total balance
SELECT 
    a.account_number,
    at.name as account_type,
    a.balance,
    a.status,
    COUNT(t.id) as transaction_count,
    MAX(t.created_at) as last_transaction
FROM accounts a
JOIN account_types at ON a.account_type_id = at.id
LEFT JOIN transactions t ON a.id = t.account_id
WHERE a.customer_id = 1
GROUP BY a.id, a.account_number, at.name, a.balance, a.status;

-- View budget vs actual spending
SELECT 
    bc.category,
    bc.allocated_amount,
    COALESCE(SUM(t.amount), 0) as spent_amount,
    (bc.allocated_amount - COALESCE(SUM(t.amount), 0)) as remaining
FROM budget_categories bc
LEFT JOIN transactions t ON t.category = bc.category 
    AND t.created_at BETWEEN '2024-11-01' AND '2024-11-30'
WHERE bc.budget_id = @budget_id
GROUP BY bc.category, bc.allocated_amount;

-- View audit log
SELECT 
    al.id,
    u.username,
    al.action,
    al.details,
    al.ip_address,
    al.created_at
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;

-- ============================================
-- TRANSACTION ISOLATION LEVEL DEMONSTRATIONS
-- ============================================

-- Set isolation level to READ COMMITTED
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;
-- Other operations...
COMMIT;

-- Set isolation level to REPEATABLE READ
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;
-- Other operations...
COMMIT;

-- Set isolation level to SERIALIZABLE
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Other operations...
COMMIT;

-- ============================================
-- DEADLOCK DEMONSTRATION (Educational Purpose)
-- ============================================

-- Session 1:
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Wait here...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- Session 2 (run simultaneously):
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;
-- Wait here...
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
COMMIT;

-- MySQL will detect deadlock and rollback one transaction

-- ============================================
-- PERFORMANCE ANALYSIS
-- ============================================

-- Show transaction execution time
SET profiling = 1;

START TRANSACTION;
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
INSERT INTO transactions (account_id, transaction_type, amount, description, balance_after, created_at)
SELECT id, 'withdrawal', 50.00, 'Test withdrawal', balance, NOW() FROM accounts WHERE id = 1;
COMMIT;

SHOW PROFILES;

-- ============================================
-- CLEANUP (Optional - for testing)
-- ============================================

-- Delete test transactions (use with caution)
-- DELETE FROM transactions WHERE description LIKE 'Test%';
-- DELETE FROM crypto_transactions WHERE id > 100;

-- ============================================
-- END OF TRANSACTION DEMONSTRATIONS
-- ============================================
