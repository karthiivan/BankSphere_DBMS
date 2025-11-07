# 🗄️ SQL Query Interface Guide

## ✅ ALL SQL OPERATIONS NOW ENABLED

The SQL query interface now allows **ALL SQL operations** for admin users with no restrictions.

---

## 🔓 Available Operations

### **Previously Restricted (NOW ALLOWED):**
- ✅ `DROP` - Drop tables, databases
- ✅ `TRUNCATE` - Empty tables
- ✅ `ALTER` - Modify table structure
- ✅ `CREATE` - Create tables, databases, indexes
- ✅ `GRANT` - Grant permissions
- ✅ `REVOKE` - Revoke permissions

### **Already Allowed:**
- ✅ `SELECT` - Query data
- ✅ `INSERT` - Add data
- ✅ `UPDATE` - Modify data
- ✅ `DELETE` - Remove data
- ✅ `SHOW` - Show databases, tables
- ✅ `DESCRIBE` - Describe table structure
- ✅ `EXPLAIN` - Explain query execution

---

## 🎯 How to Access

1. **Login as Admin:**
   - Username: `admin`
   - Password: `admin123`

2. **Navigate to Admin Dashboard**

3. **Find SQL Query Interface** (usually in Admin section)

4. **Execute any SQL query!**

---

## 📝 Example Queries

### **View Data:**
```sql
-- View all customers
SELECT * FROM customers LIMIT 10;

-- View all accounts with balances
SELECT account_number, balance, status FROM accounts;

-- View recent transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20;
```

### **Modify Data:**
```sql
-- Update account balance
UPDATE accounts SET balance = 10000 WHERE id = 1;

-- Insert new account type
INSERT INTO account_types (name, description, minimum_balance) 
VALUES ('VIP', 'VIP Account', 10000);

-- Delete old transactions
DELETE FROM transactions WHERE created_at < '2024-01-01';
```

### **Structure Operations (NOW ALLOWED):**
```sql
-- Create new table
CREATE TABLE test_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alter table structure
ALTER TABLE customers ADD COLUMN middle_name VARCHAR(50);

-- Drop table
DROP TABLE IF EXISTS test_table;

-- Truncate table (remove all data)
TRUNCATE TABLE audit_log;
```

### **Database Information:**
```sql
-- Show all tables
SHOW TABLES;

-- Describe table structure
DESCRIBE customers;

-- Show table creation SQL
SHOW CREATE TABLE accounts;

-- Show all databases
SHOW DATABASES;

-- Show indexes
SHOW INDEX FROM accounts;
```

### **Advanced Queries:**
```sql
-- Create index for performance
CREATE INDEX idx_account_number ON accounts(account_number);

-- Create view
CREATE VIEW active_accounts AS 
SELECT * FROM accounts WHERE status = 'active';

-- Explain query execution
EXPLAIN SELECT * FROM transactions WHERE account_id = 1;
```

---

## ⚠️ Important Warnings

### **🚨 USE WITH EXTREME CAUTION:**

1. **DROP Operations:**
   - `DROP TABLE` - Permanently deletes table and ALL data
   - `DROP DATABASE` - Permanently deletes entire database
   - **NO UNDO!** Data cannot be recovered

2. **TRUNCATE Operations:**
   - Removes ALL data from table
   - Faster than DELETE but cannot be rolled back
   - **NO UNDO!**

3. **ALTER Operations:**
   - Can break application if columns are removed
   - May cause data loss if not careful
   - Test on development first

4. **UPDATE/DELETE Without WHERE:**
   - `UPDATE accounts SET balance = 0` - Updates ALL accounts!
   - `DELETE FROM customers` - Deletes ALL customers!
   - **ALWAYS use WHERE clause!**

---

## 🛡️ Best Practices

### **1. Always Backup First:**
```sql
-- Create backup table before major changes
CREATE TABLE customers_backup AS SELECT * FROM customers;
```

### **2. Use Transactions:**
```sql
START TRANSACTION;
UPDATE accounts SET balance = balance + 100 WHERE id = 1;
-- Check if correct
SELECT * FROM accounts WHERE id = 1;
-- If good:
COMMIT;
-- If bad:
ROLLBACK;
```

### **3. Test with SELECT First:**
```sql
-- Before DELETE
SELECT * FROM transactions WHERE created_at < '2024-01-01';
-- If results look correct, then:
DELETE FROM transactions WHERE created_at < '2024-01-01';
```

### **4. Use LIMIT for Safety:**
```sql
-- Update only 10 records at a time
UPDATE accounts SET status = 'active' WHERE status = 'inactive' LIMIT 10;
```

### **5. Always Use WHERE Clause:**
```sql
-- ❌ DANGEROUS - Updates ALL records
UPDATE accounts SET balance = 0;

-- ✅ SAFE - Updates specific record
UPDATE accounts SET balance = 0 WHERE id = 1;
```

---

## 🔍 Useful Admin Queries

### **System Information:**
```sql
-- Check database size
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'bank_management'
GROUP BY table_schema;

-- Count records in all tables
SELECT 
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'bank_management'
ORDER BY table_rows DESC;
```

### **Data Analysis:**
```sql
-- Total balance across all accounts
SELECT SUM(balance) as total_balance FROM accounts;

-- Accounts by type
SELECT account_type_id, COUNT(*) as count, SUM(balance) as total
FROM accounts 
GROUP BY account_type_id;

-- Transactions by type today
SELECT transaction_type, COUNT(*), SUM(amount)
FROM transactions 
WHERE DATE(created_at) = CURDATE()
GROUP BY transaction_type;
```

### **Maintenance:**
```sql
-- Optimize tables
OPTIMIZE TABLE accounts, transactions, customers;

-- Analyze tables for query optimization
ANALYZE TABLE accounts;

-- Check table status
SHOW TABLE STATUS LIKE 'accounts';
```

---

## 🎓 Quick Reference

### **Data Query Language (DQL):**
- `SELECT` - Retrieve data

### **Data Manipulation Language (DML):**
- `INSERT` - Add new records
- `UPDATE` - Modify existing records
- `DELETE` - Remove records

### **Data Definition Language (DDL):**
- `CREATE` - Create database objects
- `ALTER` - Modify database objects
- `DROP` - Delete database objects
- `TRUNCATE` - Empty table

### **Data Control Language (DCL):**
- `GRANT` - Give permissions
- `REVOKE` - Remove permissions

### **Transaction Control:**
- `START TRANSACTION` - Begin transaction
- `COMMIT` - Save changes
- `ROLLBACK` - Undo changes

---

## 🚀 Getting Started

1. **Login as admin**
2. **Go to Admin Dashboard**
3. **Find SQL Query Interface**
4. **Start with safe queries:**
   ```sql
   SHOW TABLES;
   SELECT * FROM customers LIMIT 5;
   ```
5. **Gradually try more complex operations**

---

## 📞 Emergency Recovery

### **If You Accidentally Drop a Table:**
1. Stop the server immediately
2. Restore from database backup
3. Or re-run `init_database.js` to recreate tables

### **If You Delete Important Data:**
1. Check if you have a backup
2. Re-run sample data scripts
3. Or manually re-insert data

### **If Application Breaks:**
1. Check server logs for SQL errors
2. Verify table structure with `DESCRIBE table_name`
3. Re-run database schema updates if needed

---

## ✅ Summary

**You now have FULL SQL access with NO restrictions!**

- ✅ All operations allowed
- ✅ Complete database control
- ⚠️ Use responsibly
- 💾 Always backup first
- 🧪 Test on development data

**Happy querying!** 🗄️✨