# 🚀 BankSphere Deployment Guide

## Step-by-Step Deployment Instructions

---

## 📋 Prerequisites

1. **GitHub Account** - [Sign up here](https://github.com)
2. **Render Account** - [Sign up here](https://render.com)
3. **Vercel Account** - [Sign up here](https://vercel.com)
4. **Git installed** on your computer

---

## 🔧 Step 1: Push to GitHub

### Initialize Git Repository

```bash
cd banksphere-main

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - BankSphere Banking System"
```

### Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click "+" → "New repository"
3. Name: `banksphere`
4. Description: "Complete Banking Management System with Crypto Trading & AI"
5. Keep it **Public** or **Private**
6. **DO NOT** initialize with README (we already have one)
7. Click "Create repository"

### Push to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/banksphere.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Render (Recommended for Full-Stack)

### A. Create MySQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "MySQL"
3. Configure:
   - **Name**: `banksphere-db`
   - **Database**: `banksphere`
   - **User**: `banksphere_user`
   - **Region**: Choose closest to you
   - **Plan**: Free
4. Click "Create Database"
5. **Save the connection details** (Internal Database URL)

### B. Import Database Schema

1. Download MySQL client or use Render's shell
2. Connect to your Render MySQL database
3. Import schema:
```bash
mysql -h <host> -u <user> -p<password> banksphere < database_schema.sql
```

Or use Render's shell:
```bash
# In Render dashboard, go to your database → Shell
# Copy and paste the contents of database_schema.sql
```

### C. Deploy Web Service

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub account
3. Select `banksphere` repository
4. Configure:
   - **Name**: `banksphere`
   - **Environment**: `Node`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. **Add Environment Variables**:
   ```
   NODE_ENV = production
   PORT = 3000
   DB_HOST = <your-render-mysql-host>
   DB_USER = <your-render-mysql-user>
   DB_PASSWORD = <your-render-mysql-password>
   DB_NAME = banksphere
   DB_PORT = 3306
   JWT_SECRET = <generate-random-string>
   SESSION_SECRET = <generate-random-string>
   ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Your app will be live at: `https://banksphere.onrender.com`

---

## ⚡ Step 3: Deploy to Vercel (Alternative - Frontend Focus)

**Note**: Vercel is great for frontend but has limitations with MySQL. Better for static sites or serverless functions.

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd banksphere-main
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? banksphere
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `npm install`
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   ```
   NODE_ENV = production
   DB_HOST = <your-database-host>
   DB_USER = <your-database-user>
   DB_PASSWORD = <your-database-password>
   DB_NAME = banksphere
   JWT_SECRET = <random-string>
   SESSION_SECRET = <random-string>
   ```

6. Click "Deploy"
7. Your app will be live at: `https://banksphere.vercel.app`

---

## 🗄️ Step 4: Database Options

### Option 1: Render MySQL (Recommended)
- **Free tier available**
- Easy integration with Render web service
- Automatic backups

### Option 2: Railway MySQL
1. Go to [Railway](https://railway.app)
2. Create new project → Add MySQL
3. Get connection string
4. Use in environment variables

### Option 3: PlanetScale (Serverless MySQL)
1. Go to [PlanetScale](https://planetscale.com)
2. Create database
3. Get connection string
4. Use in environment variables

### Option 4: AWS RDS (Production)
- More expensive but production-ready
- Better performance
- Advanced features

---

## ✅ Step 5: Verify Deployment

### Test Your Deployed App

1. **Visit your URL**:
   - Render: `https://banksphere.onrender.com`
   - Vercel: `https://banksphere.vercel.app`

2. **Test Login**:
   - Admin: `admin` / `admin123`
   - Customer: `john_doe` / `password123`

3. **Test Features**:
   - ✅ Dashboard loads
   - ✅ Accounts visible
   - ✅ Transactions work
   - ✅ Crypto trading works
   - ✅ AI chatbot responds

### Check Logs

**Render**:
- Go to your service → Logs tab
- Check for errors

**Vercel**:
- Go to your project → Deployments → View Function Logs

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution**: Check DB_HOST, DB_USER, DB_PASSWORD in environment variables

#### 2. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Render/Vercel handles ports automatically. Remove hardcoded port in server.js

#### 3. Module Not Found
```
Error: Cannot find module 'express'
```
**Solution**: Ensure `npm install` runs in build command

#### 4. CORS Errors
**Solution**: Update CORS settings in server.js to allow your domain

---

## 🔐 Security Checklist

Before going live:

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review CORS settings
- [ ] Enable SQL injection protection
- [ ] Set up monitoring/alerts

---

## 📊 Monitoring

### Render
- Built-in metrics dashboard
- View CPU, memory, requests
- Set up alerts

### Vercel
- Analytics dashboard
- Function logs
- Performance metrics

---

## 💰 Cost Estimates

### Free Tier (Good for Projects)
- **Render**: Free (with limitations)
- **Vercel**: Free (hobby plan)
- **Database**: Free tier available
- **Total**: $0/month

### Production (Recommended)
- **Render**: $7-25/month
- **Database**: $7-15/month
- **Total**: $14-40/month

---

## 🚀 Going Live Checklist

- [ ] Code pushed to GitHub
- [ ] Database created and schema imported
- [ ] Environment variables configured
- [ ] Web service deployed
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Default passwords changed
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated

---

## 📞 Support

If you encounter issues:

1. Check deployment logs
2. Verify environment variables
3. Test database connection
4. Review GitHub issues
5. Contact support:
   - Render: support@render.com
   - Vercel: support@vercel.com

---

## 🎉 Success!

Your BankSphere application is now live! 

Share your deployment URL:
- **Render**: `https://banksphere.onrender.com`
- **Vercel**: `https://banksphere.vercel.app`

---

Made with ❤️ for your DBMS Project
