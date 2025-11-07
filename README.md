# 🏦 BankSphere - Complete Banking Management System

A full-stack banking management system with advanced features including cryptocurrency trading, fraud detection, AI chatbot, and comprehensive transaction management.

## 🚀 Features

### Core Banking
- ✅ Customer & Admin Dashboards
- ✅ Multiple Account Types (Checking, Savings, Premium)
- ✅ Money Transfers & Transactions
- ✅ Bill Payments
- ✅ Loan Applications & Management
- ✅ Account Management

### Advanced Features
- 💰 **Cryptocurrency Trading** - Buy/Sell BTC, ETH, ADA
- 🤖 **AI Chatbot Assistant** - Natural language banking support
- 🚨 **Fraud Detection System** - Real-time transaction monitoring
- 📊 **Budget Management** - Track expenses and set budgets
- 📈 **Investment Advisory** - Portfolio management
- 🔐 **Biometric Authentication** - Enhanced security
- 📱 **Responsive Design** - Works on all devices

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **HTML5/CSS3** - Structure and styling
- **Bootstrap 5** - UI framework
- **JavaScript** - Client-side logic
- **Chart.js** - Data visualization

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/banksphere.git
cd banksphere
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure database**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE banksphere;
exit;

# Import schema
mysql -u root -p banksphere < database_schema.sql
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. **Run the application**
```bash
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:3000/api

## 🔐 Default Login Credentials

### Admin
- Username: `admin`
- Password: `admin123`

### Customer
- Username: `john_doe`
- Password: `password123`

## 🌐 Deployment

### Deploy to Render

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add DB credentials
6. Click "Create Web Service"

### Deploy to Vercel

1. Install Vercel CLI
```bash
npm install -g vercel
```

2. Deploy
```bash
vercel
```

3. Configure environment variables in Vercel dashboard

**Note**: Vercel is better for frontend. For full-stack with database, use Render or Railway.

## 📊 Database Schema

### Main Tables
- `users` - User authentication
- `customers` - Customer information
- `accounts` - Bank accounts
- `transactions` - Transaction history
- `loans` - Loan applications
- `crypto_wallets` - Cryptocurrency holdings
- `crypto_transactions` - Crypto trading history
- `fraud_alerts` - Fraud detection logs
- `chat_messages` - AI chatbot conversations
- `budgets` - Budget management
- `support_tickets` - Customer support

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Accounts
- `GET /api/accounts` - Get user accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details

### Transactions
- `GET /api/transactions` - Get transactions
- `POST /api/transactions/transfer` - Transfer money
- `POST /api/transactions/deposit` - Deposit money
- `POST /api/transactions/withdraw` - Withdraw money

### Cryptocurrency
- `GET /api/crypto/portfolio` - Get crypto holdings
- `POST /api/crypto/buy` - Buy cryptocurrency
- `POST /api/crypto/sell` - Sell cryptocurrency
- `GET /api/crypto/transactions` - Get crypto history

### Loans
- `POST /api/loans/apply` - Apply for loan
- `GET /api/loans` - Get user loans
- `PUT /api/admin/loans/:id/approve` - Approve loan (admin)

### AI Chatbot
- `POST /api/chatbot/message` - Send message to chatbot
- `GET /api/chatbot/history` - Get chat history

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Crypto Trading
```bash
node test_crypto.js
```

### Test Fraud Detection
```bash
node test_fraud.js
```

## 📝 DBMS Project Queries

All SQL transaction queries for DBMS project demonstration are in:
- `DBMS_TRANSACTION_QUERIES.sql` - Complete transaction examples

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Bootstrap for UI components
- Chart.js for data visualization
- Express.js community
- MySQL documentation

## 📞 Support

For support, email support@banksphere.com or open an issue on GitHub.

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Integration with real crypto exchanges
- [ ] Advanced ML fraud detection
- [ ] Voice banking
- [ ] Blockchain integration

---

Made with ❤️ for DBMS Project
