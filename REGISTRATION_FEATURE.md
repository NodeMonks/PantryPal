# User Registration Feature

## ✅ Feature Added: Public User Registration

Users can now register for new accounts directly from the login page!

---

## 🎯 What's New

### New Pages Created:
- ✅ **Register Page** (`/register`) - Full registration form with validation

### Updated Pages:
- ✅ **Login Page** - Added "Register here" link
- ✅ **App.tsx** - Added `/register` public route

---

## 📝 Registration Form Fields

### Required Fields:
- **Username** (min 3 characters)
- **Email** (valid email format)
- **Password** (min 6 characters)
- **Confirm Password** (must match)
- **Account Type** (Staff or Viewer)

### Optional Fields:
- **Full Name**
- **Phone Number**

---

## 🔐 Account Types Available for Self-Registration

### Staff
- Can create bills and customers
- Can view products (read-only)
- Can view dashboard and reports
- **Default role for new registrations**

### Viewer
- Read-only access to all data
- Can view dashboard, products, bills, customers
- Cannot create or modify anything

**Note:** Manager and Admin accounts can only be created by existing administrators through the User Management page.

---

## 🚀 How to Use

### For New Users:

1. **Navigate to:** http://localhost:5000/login
2. **Click** "Register here" link
3. **Fill out the registration form:**
   - Choose a unique username
   - Enter a valid email address
   - Create a strong password (min 6 characters)
   - Confirm your password
   - Select account type (Staff or Viewer)
   - Optionally add your full name and phone
4. **Click** "Create Account"
5. **Success!** You'll be redirected to login
6. **Login** with your new credentials

### From Login Page:
- Look for "Don't have an account? Register here" link
- Click to go to registration page

---

## 🔒 Security Features

### Password Validation:
- ✅ Minimum 6 characters required
- ✅ Password confirmation check
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Secure storage in database

### Email Validation:
- ✅ Valid email format required
- ✅ Unique email check (no duplicates)

### Username Validation:
- ✅ Minimum 3 characters
- ✅ Unique username check (no duplicates)

### Account Security:
- ✅ All new accounts are active by default
- ✅ Can be deactivated by admins if needed
- ✅ Role-based access control enforced

---

## 🎨 User Interface

### Registration Page Features:
- ✅ Clean, modern design matching login page
- ✅ Real-time form validation
- ✅ Error messages for invalid input
- ✅ Loading states during submission
- ✅ Success/error alerts
- ✅ Link back to login page
- ✅ Helpful tooltips for role selection

### Login Page Updates:
- ✅ Added "Register here" link
- ✅ Updated admin credentials display
- ✅ Maintains existing functionality

---

## 📋 Registration Flow

```
1. User clicks "Register here" on login page
   ↓
2. Fills out registration form
   ↓
3. Submits form
   ↓
4. Backend validates data:
   - Checks username uniqueness
   - Checks email uniqueness
   - Validates password strength
   - Hashes password with bcrypt
   ↓
5. Creates new user in database
   ↓
6. Shows success message
   ↓
7. Redirects to login page
   ↓
8. User logs in with new credentials
   ↓
9. Redirected to dashboard
```

---

## 🛡️ Admin Controls

Administrators can still:
- ✅ View all registered users in User Management
- ✅ Change user roles (upgrade Staff to Manager, etc.)
- ✅ Activate/deactivate user accounts
- ✅ Create users with any role (including Admin/Manager)
- ✅ Manage all user permissions

---

## 🧪 Testing

### Test Self-Registration:

1. **Go to register page:**
   ```
   http://localhost:5000/register
   ```

2. **Create a new staff account:**
   - Username: `teststaff`
   - Email: `teststaff@example.com`
   - Password: `Test123!`
   - Role: Staff

3. **Login with new account:**
   - Should successfully login
   - Should see dashboard
   - Can create bills and customers
   - Cannot create/edit products

4. **Create a viewer account:**
   - Username: `testviewer`
   - Email: `testviewer@example.com`
   - Password: `Test123!`
   - Role: Viewer

5. **Login as viewer:**
   - Should have read-only access
   - Cannot create anything

---

## 🔍 Error Handling

### Registration Errors Handled:
- ✅ Username already exists
- ✅ Email already exists
- ✅ Password too short (< 6 chars)
- ✅ Passwords don't match
- ✅ Invalid email format
- ✅ Network errors
- ✅ Server errors

### User-Friendly Messages:
- Clear error descriptions
- Suggestions for fixing issues
- Visual error alerts

---

## 📱 Responsive Design

- ✅ Works on desktop
- ✅ Works on tablet
- ✅ Works on mobile
- ✅ Proper form spacing
- ✅ Touch-friendly buttons

---

## 🎯 Benefits

### For Users:
- ✅ Easy self-service registration
- ✅ No need to wait for admin
- ✅ Immediate access for staff/viewer roles
- ✅ Simple, intuitive process

### For Admins:
- ✅ Less manual user creation
- ✅ Users start with appropriate default roles
- ✅ Can still upgrade roles as needed
- ✅ Maintains security (no self-service admin creation)

### For the Application:
- ✅ Scalable user onboarding
- ✅ Reduced admin workload
- ✅ Better user experience
- ✅ Maintains security standards

---

## 🔧 Configuration

### Default Role:
- Set in `Register.tsx`: `role: "staff"`
- Can be changed to `"viewer"` if preferred

### Available Roles for Registration:
- Staff (default)
- Viewer

### Restricted Roles:
- Manager (admin-only creation)
- Admin (admin-only creation)

---

## 📚 API Endpoints Used

### Registration:
```
POST /api/auth/register
Body: {
  username: string (required, min 3 chars)
  email: string (required, valid email)
  password: string (required, min 6 chars)
  role: "staff" | "viewer" (required)
  full_name?: string (optional)
  phone?: string (optional)
}
```

### Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "role": "staff",
    "full_name": "John Doe",
    "is_active": true
  }
}
```

---

## ✅ Implementation Complete

Your PantryPal application now supports:
- ✅ Self-service user registration
- ✅ Role selection (Staff/Viewer)
- ✅ Secure password handling
- ✅ Email and username validation
- ✅ Seamless registration flow
- ✅ Beautiful, responsive UI
- ✅ Admin controls maintained

**Users can now register and start using PantryPal immediately!** 🎉

---

## 🆘 Troubleshooting

### Can't register with admin/manager role?
- This is intentional for security
- Only existing admins can create admin/manager accounts
- Use User Management page if you're an admin

### Registration successful but can't login?
- Make sure you're using the exact username and password
- Check for typos
- Try resetting browser cookies

### Email already exists?
- Use a different email address
- Contact admin if you need to recover an account

---

**Ready to accept new user registrations!** 🚀
