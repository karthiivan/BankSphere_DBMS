# 📝 Registration Guide - SecureBank

## ✅ How to Register Successfully

### **Quick Steps:**
1. Click "Register" button on main page
2. Fill in ALL required fields with correct formats
3. Click "Register" button
4. Login with your new credentials

---

## 📋 Required Field Formats

### **Username:**
- **Format:** Letters, numbers, and underscores only
- **Length:** 3-50 characters
- **Example:** `john_doe123`
- ❌ **Invalid:** `john-doe`, `john.doe`, `jo`

### **Email:**
- **Format:** Valid email address
- **Example:** `john@example.com`
- ❌ **Invalid:** `john@`, `john.com`, `@example.com`

### **Password:**
- **Requirements:**
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (@$!%*?&)
- **Example:** `Test123!@#`
- ❌ **Invalid:** `password`, `Test123`, `test123!`

### **Phone:**
- **Format:** `(XXX) XXX-XXXX`
- **Example:** `(555) 123-4567`
- ❌ **Invalid:** `5551234567`, `555-123-4567`, `(555)123-4567`

### **State:**
- **Format:** 2 letters only
- **Example:** `NY`, `CA`, `TX`
- ❌ **Invalid:** `New York`, `N.Y.`, `ny`

### **ZIP Code:**
- **Format:** 5 digits or 5+4 digits
- **Example:** `12345` or `12345-6789`
- ❌ **Invalid:** `1234`, `ABCDE`

### **SSN:**
- **Format:** `XXX-XX-XXXX`
- **Example:** `123-45-6789`
- ❌ **Invalid:** `123456789`, `123-456-789`, `12-34-5678`

---

## 🎯 Quick Registration Template

Use these values for quick testing:

```
Username: testuser123
Email: test@example.com
Password: Test123!@#
First Name: John
Last Name: Doe
Date of Birth: 1990-01-01
Phone: (555) 123-4567
Address: 123 Main Street
City: New York
State: NY
ZIP Code: 10001
SSN: 987-65-4321
```

---

## ⚠️ Common Errors

### **"Validation failed"**
- Check all fields match the required formats above
- Make sure password has uppercase, lowercase, number, and special character
- Verify phone is in (XXX) XXX-XXXX format
- Verify SSN is in XXX-XX-XXXX format

### **"Username or email already exists"**
- Try a different username
- Try a different email
- Use the test forms page to auto-generate unique data

### **"Too many authentication attempts"**
- Wait 15 minutes
- Or restart the server

---

## 🚀 Easiest Way to Register

### **Use the Test Forms Page:**

1. Go to: http://localhost:3000/test-forms.html
2. Click "Fill with Random Data" button
3. All fields will be auto-filled with valid data
4. Click "Test Registration"
5. Success! ✅

This automatically generates:
- Unique username
- Unique email
- Valid SSN format
- Valid phone format
- All other required fields

---

## 🔍 Troubleshooting

### **Registration Button Not Working?**
1. Check browser console (F12) for errors
2. Make sure all fields are filled
3. Verify formats match requirements
4. Try using test forms page instead

### **Getting 400 Error?**
- This means validation failed
- Check the error message for specific field issues
- Use the formats shown above
- Or use test forms page for auto-generated valid data

### **Getting 500 Error?**
- Server error - check server logs
- Restart server: Ctrl+C then `npm start`
- Check database is running

---

## ✅ After Registration

1. You'll see "Registration successful!" message
2. Login modal will appear automatically
3. Enter your new username and password
4. Click "Login"
5. You'll be redirected to the enhanced dashboard

---

## 🎉 Success!

Once registered, you can:
- ✅ Login to your account
- ✅ View dashboard
- ✅ Access all banking features
- ✅ Use enhanced features (after account creation by admin)

---

**Need Help?** Use the test forms page for guaranteed success:
http://localhost:3000/test-forms.html