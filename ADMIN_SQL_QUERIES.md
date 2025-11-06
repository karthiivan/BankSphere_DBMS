# 🔍 BankSphere - Admin SQL Queries Reference

## 📊 **USEFUL SQL QUERIES FOR ADMIN DASHBOARD**

### 🏦 **ACCOUNT QUERIES**

#### **View All Accounts with Customer Details**
```sql
SELECT a.account_number, a.balance, a.status,
       CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       at.name as account_type, b.name as branch_name,
       a.created_at
FROM accounts a
JOIN customers c ON a.customer_id = c.id
JOIN account_types at ON a.account_type_id = at.id
JOIN branches b ON a.branch_id = b.id
ORDER BY a.created_at DESC;
```

#### **Find High Balance Accounts**
```sql
SELECT a.account_number, a.balance,
       CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       at.name as account_type
FROM accounts a
JOIN customers c ON a.customer_id = c.id
JOIN account_types at ON a.account_type_id = at.id
WHERE a.balance > 5000
ORDER BY a.balance DESC;
```

#### **Account Summary by Type**
```sql
SELECT at.name as account_type,
       COUNT(a.id) as total_accounts,
       SUM(a.balance) as total_balance,
       AVG(a.balance) as average_balance
FROM accounts a
JOIN account_types at ON a.account_type_id = at.id
WHERE a.status = 'active'
GROUP BY at.name;
```

---

### 👥 **CUSTOMER QUERIES**

#### **View All Customers with Account Info**
```sql
SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
       u.username, u.is_active,
       COUNT(a.id) as total_accounts,
       SUM(a.balance) as total_balance
FROM customers c
JOIN users u ON c.user_id = u.id
LEFT JOIN accounts a ON c.id = a.customer_id
GROUP BY c.id
ORDER BY total_balance DESC;
```

#### **Find Customers by City**
```sql
SELECT c.first_name, c.last_name, c.city, c.state,
       u.email, u.is_active
FROM customers c
JOIN users u ON c.user_id = u.id
WHERE c.city = 'New York'
ORDER BY c.last_name;
```

#### **Inactive Customers**
```sql
SELECT c.first_name, c.last_name, u.email, u.username,
       c.created_at
FROM customers c
JOIN users u ON c.user_id = u.id
WHERE u.is_active = FALSE;
```

---

### 💸 **TRANSACTION QUERIES**

#### **Recent Transactions with Customer Details**
```sql
SELECT t.created_at, t.transaction_type, t.amount, t.description,
       a.account_number, CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       t.balance_after
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN customers c ON a.customer_id = c.id
ORDER BY t.created_at DESC
LIMIT 20;
```

#### **Large Transactions (Suspicious Activity)**
```sql
SELECT t.created_at, t.transaction_type, t.amount,
       a.account_number, CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       t.description
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN customers c ON a.customer_id = c.id
WHERE t.amount > 10000
ORDER BY t.amount DESC;
```

#### **Daily Transaction Summary**
```sql
SELECT DATE(t.created_at) as transaction_date,
       t.transaction_type,
       COUNT(*) as transaction_count,
       SUM(t.amount) as total_amount
FROM transactions t
WHERE t.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(t.created_at), t.transaction_type
ORDER BY transaction_date DESC, t.transaction_type;
```

#### **Transaction Volume by Account Type**
```sql
SELECT at.name as account_type,
       COUNT(t.id) as transaction_count,
       SUM(t.amount) as total_volume
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN account_types at ON a.account_type_id = at.id
WHERE DATE(t.created_at) = CURDATE()
GROUP BY at.name;
```

---

### 🏠 **LOAN QUERIES**

#### **All Loans with Customer Details**
```sql
SELECT l.loan_number, l.amount, l.status, l.interest_rate,
       CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       lt.name as loan_type, l.created_at
FROM loans l
JOIN customers c ON l.customer_id = c.id
JOIN loan_types lt ON l.loan_type_id = lt.id
ORDER BY l.created_at DESC;
```

#### **Pending Loan Applications**
```sql
SELECT l.loan_number, l.amount, l.purpose,
       CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       c.email, lt.name as loan_type, l.created_at
FROM loans l
JOIN customers c ON l.customer_id = c.id
JOIN loan_types lt ON l.loan_type_id = lt.id
WHERE l.status = 'pending'
ORDER BY l.created_at ASC;
```

#### **Loan Summary by Type**
```sql
SELECT lt.name as loan_type,
       COUNT(l.id) as total_loans,
       SUM(l.amount) as total_amount,
       AVG(l.amount) as average_amount,
       COUNT(CASE WHEN l.status = 'pending' THEN 1 END) as pending_count
FROM loans l
JOIN loan_types lt ON l.loan_type_id = lt.id
GROUP BY lt.name;
```

---

### 📊 **SYSTEM ANALYTICS QUERIES**

#### **Daily System Summary**
```sql
SELECT 
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM accounts WHERE status = 'active') as active_accounts,
    (SELECT SUM(balance) FROM accounts WHERE status = 'active') as total_balance,
    (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = CURDATE()) as today_transactions,
    (SELECT COUNT(*) FROM loans WHERE status = 'pending') as pending_loans;
```

#### **Monthly Growth Statistics**
```sql
SELECT 
    YEAR(created_at) as year,
    MONTH(created_at) as month,
    COUNT(*) as new_customers
FROM customers
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY YEAR(created_at), MONTH(created_at)
ORDER BY year DESC, month DESC;
```

#### **Account Activity Report**
```sql
SELECT a.account_number,
       CONCAT(c.first_name, ' ', c.last_name) as customer_name,
       a.balance,
       COUNT(t.id) as transaction_count,
       MAX(t.created_at) as last_transaction
FROM accounts a
JOIN customers c ON a.customer_id = c.id
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id
HAVING transaction_count > 0
ORDER BY last_transaction DESC;
```

---

### 🔍 **SECURITY & AUDIT QUERIES**

#### **Failed Login Attempts (if audit table exists)**
```sql
SELECT DATE(created_at) as date,
       COUNT(*) as failed_attempts
FROM audit_log
WHERE action = 'failed_login'
  AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### **User Activity Summary**
```sql
SELECT u.username, u.role,
       CONCAT(c.first_name, ' ', c.last_name) as full_name,
       u.is_active,
       COUNT(a.id) as account_count,
       SUM(a.balance) as total_balance
FROM users u
LEFT JOIN customers c ON u.id = c.user_id
LEFT JOIN accounts a ON c.id = a.customer_id
GROUP BY u.id
ORDER BY total_balance DESC;
```

---

### 🏢 **BRANCH & OPERATIONAL QUERIES**

#### **Branch Performance**
```sql
SELECT b.name as branch_name,
       COUNT(a.id) as total_accounts,
       SUM(a.balance) as total_balance,
       COUNT(DISTINCT a.customer_id) as unique_customers
FROM branches b
LEFT JOIN accounts a ON b.id = a.branch_id
GROUP BY b.id
ORDER BY total_balance DESC;
```

#### **Account Types Performance**
```sql
SELECT at.name as account_type,
       at.minimum_balance,
       at.interest_rate,
       COUNT(a.id) as account_count,
       SUM(a.balance) as total_balance
FROM account_types at
LEFT JOIN accounts a ON at.id = a.account_type_id
WHERE at.is_active = TRUE
GROUP BY at.id;
```

---

### 📋 **DATABASE STRUCTURE QUERIES**

#### **Show All Tables**
```sql
SHOW TABLES;
```

#### **Describe Table Structure**
```sql
DESCRIBE users;
DESCRIBE customers;
DESCRIBE accounts;
DESCRIBE transactions;
DESCRIBE loans;
```

#### **Show Table Relationships**
```sql
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'bank_management'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## 🎯 **QUICK REFERENCE COMMANDS**

### **Most Useful Admin Queries:**

1. **System Overview:**
   ```sql
   SELECT 
       (SELECT COUNT(*) FROM customers) as customers,
       (SELECT COUNT(*) FROM accounts) as accounts,
       (SELECT SUM(balance) FROM accounts) as total_balance;
   ```

2. **Recent Activity:**
   ```sql
   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
   ```

3. **Customer List:**
   ```sql
   SELECT c.first_name, c.last_name, u.email, u.is_active 
   FROM customers c JOIN users u ON c.user_id = u.id;
   ```

4. **Account Balances:**
   ```sql
   SELECT account_number, balance, status FROM accounts ORDER BY balance DESC;
   ```

5. **Pending Loans:**
   ```sql
   SELECT * FROM loans WHERE status = 'pending';
   ```

---

**💡 Pro Tip:** Always use `LIMIT` in your queries to avoid overwhelming results, especially for large tables like transactions!

**🔒 Security Note:** Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed in the admin SQL interface for security reasons.