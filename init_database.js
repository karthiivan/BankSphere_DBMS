const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        console.log('🔄 Connecting to PostgreSQL server...');
        
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL server');

        // PostgreSQL databases are created via Render dashboard
        // We'll just run the schema file

        console.log('🔄 Running PostgreSQL schema...');
        
        // Read and execute the PostgreSQL schema file
        const schemaPath = path.join(__dirname, 'complete_database_schema_postgresql.sql');
        
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schema);
            console.log('✅ PostgreSQL schema executed successfully');
        } else {
            console.log('⚠️  Schema file not found. Creating basic tables...');
            
            // Fallback: Create basic tables if schema file not found
            await createBasicTables(client);
        }

        client.release();
        await pool.end();
        // Customers table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNIQUE NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                date_of_birth DATE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address VARCHAR(255) NOT NULL,
                city VARCHAR(50) NOT NULL,
                state VARCHAR(2) NOT NULL,
                zip_code VARCHAR(10) NOT NULL,
                ssn VARCHAR(11) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Branches table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS branches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                address VARCHAR(255) NOT NULL,
                city VARCHAR(50) NOT NULL,
                state VARCHAR(2) NOT NULL,
                zip_code VARCHAR(10) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                manager_id INT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Account types table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS account_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                minimum_balance DECIMAL(15,2) DEFAULT 0,
                interest_rate DECIMAL(5,4) DEFAULT 0,
                monthly_fee DECIMAL(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Accounts table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                account_type_id INT NOT NULL,
                branch_id INT NOT NULL,
                account_number VARCHAR(12) UNIQUE NOT NULL,
                balance DECIMAL(15,2) DEFAULT 0,
                status ENUM('active', 'inactive', 'frozen', 'closed') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (account_type_id) REFERENCES account_types(id),
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            )
        `);

        // Transactions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id INT NOT NULL,
                transaction_type ENUM('deposit', 'withdraw', 'transfer_in', 'transfer_out', 'fee', 'interest', 'crypto_purchase', 'crypto_sale') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description TEXT,
                balance_after DECIMAL(15,2) NOT NULL,
                category VARCHAR(50) NULL,
                auto_categorized BOOLEAN DEFAULT FALSE,
                categorized_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id)
            )
        `);

        // Loan types table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS loan_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                interest_rate DECIMAL(5,4) NOT NULL,
                min_amount DECIMAL(15,2) DEFAULT 1000,
                max_amount DECIMAL(15,2) DEFAULT 1000000,
                min_term_months INT DEFAULT 6,
                max_term_months INT DEFAULT 360,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Loans table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS loans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                loan_type_id INT NOT NULL,
                loan_number VARCHAR(12) UNIQUE NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                interest_rate DECIMAL(5,4) NOT NULL,
                term_months INT NOT NULL,
                monthly_payment DECIMAL(15,2) NOT NULL,
                balance DECIMAL(15,2) NOT NULL,
                purpose TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected', 'active', 'paid_off', 'defaulted') DEFAULT 'pending',
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (loan_type_id) REFERENCES loan_types(id)
            )
        `);

        // Audit log table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('✅ Basic tables created successfully');

        // Insert sample data
        console.log('🔄 Inserting sample data...');

        // Insert sample branch
        await connection.execute(`
            INSERT IGNORE INTO branches (id, name, address, city, state, zip_code, phone) 
            VALUES (1, 'Main Branch', '123 Main Street', 'New York', 'NY', '10001', '(555) 123-4567')
        `);

        // Insert sample account types
        await connection.execute(`
            INSERT IGNORE INTO account_types (id, name, description, minimum_balance, interest_rate) VALUES
            (1, 'Savings', 'Standard savings account', 100.00, 0.0150),
            (2, 'Checking', 'Standard checking account', 25.00, 0.0050),
            (3, 'Premium', 'Premium account with benefits', 5000.00, 0.0200),
            (4, 'Business', 'Business banking account', 500.00, 0.0100)
        `);

        // Insert sample loan types
        await connection.execute(`
            INSERT IGNORE INTO loan_types (id, name, description, interest_rate, min_amount, max_amount) VALUES
            (1, 'Personal', 'Personal loan for various purposes', 0.0899, 1000.00, 50000.00),
            (2, 'Auto', 'Auto loan for vehicle purchase', 0.0549, 5000.00, 100000.00),
            (3, 'Home', 'Home mortgage loan', 0.0399, 50000.00, 1000000.00),
            (4, 'Business', 'Business loan for commercial purposes', 0.0699, 10000.00, 500000.00)
        `);

        // Create admin user
        const bcrypt = require('bcrypt');
        const adminPassword = await bcrypt.hash('admin123', 12);
        
        await connection.execute(`
            INSERT IGNORE INTO users (id, username, email, password_hash, role) 
            VALUES (1, 'admin', 'admin@bank.com', ?, 'admin')
        `, [adminPassword]);

        // Create sample customer
        const customerPassword = await bcrypt.hash('password123', 12);
        
        await connection.execute(`
            INSERT IGNORE INTO users (id, username, email, password_hash, role) 
            VALUES (2, 'john_doe', 'john@example.com', ?, 'customer')
        `, [customerPassword]);

        await connection.execute(`
            INSERT IGNORE INTO customers (id, user_id, first_name, last_name, date_of_birth, phone, address, city, state, zip_code, ssn) 
            VALUES (1, 2, 'John', 'Doe', '1990-01-01', '(555) 123-4567', '456 Oak Street', 'New York', 'NY', '10002', '123-45-6789')
        `);

        // Create sample account for John Doe
        await connection.execute(`
            INSERT IGNORE INTO accounts (id, customer_id, account_type_id, branch_id, account_number, balance) 
            VALUES (1, 1, 2, 1, 'ACC001000001', 5000.00)
        `);

        client.release();
        await pool.end();
        
        console.log('');
        console.log('🎉 Database initialization completed!');
        console.log('');
        console.log('📋 Sample Login Credentials:');
        console.log('   Admin: username=admin, password=admin123');
        console.log('   Customer: username=john_doe, password=password123');
        console.log('');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function createBasicTables(client) {
    console.log('Creating basic PostgreSQL tables...');
    
    // Create ENUM types
    await client.query(`
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('customer', 'admin', 'manager');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);
    
    await client.query(`
        DO $$ BEGIN
            CREATE TYPE account_status AS ENUM ('active', 'inactive', 'frozen', 'closed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);
    
    // Users table
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role user_role DEFAULT 'customer',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Customers table
    await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            date_of_birth DATE NOT NULL,
            phone VARCHAR(20),
            address TEXT,
            city VARCHAR(50),
            state VARCHAR(50),
            zip_code VARCHAR(10),
            ssn VARCHAR(20) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    
    // Accounts table
    await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            account_number VARCHAR(20) UNIQUE NOT NULL,
            account_type VARCHAR(20) NOT NULL,
            balance DECIMAL(15,2) DEFAULT 0.00,
            status account_status DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);
    
    console.log('✅ Basic tables created');
}

// Run initialization
initializeDatabase();