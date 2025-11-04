# Multi-Profile Authentication Setup Guide

## Overview
Your PantryPal application now supports multiple user profiles/roles with different permission levels using Neon database.

## User Roles & Permissions

### 1. **Admin** (Full Access)
- Manage all users (create, update roles, activate/deactivate)
- Full CRUD on products
- Full CRUD on customers
- Full CRUD on bills and inventory
- View all reports and dashboard

### 2. **Manager** (Business Operations)
- Create and update products
- Manage inventory transactions
- Create bills and customers
- View all reports and dashboard
- Cannot manage users

### 3. **Staff** (Daily Operations)
- View products (read-only)
- Create customers
- Create bills
- View dashboard
- Cannot modify products or inventory

### 4. **Viewer** (Read-Only)
- View dashboard
- View products, customers, bills
- Cannot create or modify anything

## Setup Instructions

### Step 1: Update Your Database Schema

Run this command to push the updated schema to Neon:

```powershell
npm run db:push
```

This will update your `users` table with new fields:
- `email` (unique)
- `role` (admin, manager, staff, viewer)
- `full_name`
- `phone`
- `is_active` (boolean)
- `created_at` and `updated_at` timestamps

### Step 2: Add Environment Variables

Add to your `.env` file:

```env
SESSION_SECRET=your-super-secret-session-key-change-in-production
```

### Step 3: Create Your First Admin User

You can create the first admin user in two ways:

#### Option A: Using API endpoint (direct registration)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@pantrypal.com",
    "password": "admin123",
    "role": "admin",
    "full_name": "System Administrator"
  }'
```

#### Option B: Using SQL directly in Neon Console
```sql
INSERT INTO users (username, email, password, role, full_name, is_active)
VALUES ('admin', 'admin@pantrypal.com', 'admin123', 'admin', 'System Administrator', true);
```

## API Endpoints

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "staff",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Logout
```http
POST /api/auth/logout
```

#### Get Current User
```http
GET /api/auth/me
```

#### Get All Users (Admin Only)
```http
GET /api/auth/users
```

#### Update User Role (Admin Only)
```http
PATCH /api/auth/users/:id/role
Content-Type: application/json

{
  "role": "manager"
}
```

#### Deactivate User (Admin Only)
```http
PATCH /api/auth/users/:id/deactivate
```

#### Activate User (Admin Only)
```http
PATCH /api/auth/users/:id/activate
```

### Protected API Routes

All existing routes now require authentication:

**Products** (View: All, Create/Update: Admin & Manager)
- `GET /api/products` - View all products
- `GET /api/products/:id` - View single product
- `POST /api/products` - Create product (Admin, Manager)
- `PUT /api/products/:id` - Update product (Admin, Manager)

**Customers** (View: All, Create: Admin, Manager, Staff)
- `GET /api/customers` - View all customers
- `POST /api/customers` - Create customer (Admin, Manager, Staff)

**Bills** (View: All, Create: Admin, Manager, Staff)
- `GET /api/bills` - View all bills
- `GET /api/bills/today` - Today's bills
- `POST /api/bills` - Create bill (Admin, Manager, Staff)

**Inventory** (View: All, Create: Admin, Manager)
- `GET /api/inventory-transactions` - View transactions
- `POST /api/inventory-transactions` - Create transaction (Admin, Manager)

**Dashboard** (View: All authenticated)
- `GET /api/dashboard/stats` - Dashboard statistics

## Frontend Integration

### Create a Login Page

```typescript
// client/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Logged in as:', data.user);
      navigate('/dashboard');
    } else {
      alert('Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Create an Auth Context

```typescript
// client/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const hasRole = (...roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```typescript
// client/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
```

### Usage Example

```typescript
// client/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/products/add"
            element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <AddProduct />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

## Security Best Practices

### 🔒 **IMPORTANT: For Production**

1. **Replace Password Hashing**: The current implementation uses plain text. Install and use bcrypt:

```powershell
npm install bcrypt
npm install --save-dev @types/bcrypt
```

Update `server/auth.ts`:

```typescript
import bcrypt from 'bcrypt';

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  return bcrypt.compareSync(inputPassword, storedPassword);
}
```

2. **Use Environment Variables**: Never hardcode secrets
3. **Enable HTTPS**: In production, use HTTPS only
4. **Secure Cookies**: Set `secure: true` for production
5. **Rate Limiting**: Add rate limiting to prevent brute force
6. **CORS**: Configure CORS properly for your domain

## Testing the Setup

1. Start your development server:
```powershell
npm run dev
```

2. Create an admin user (see Step 3 above)

3. Test login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt
```

4. Test authenticated request:
```bash
curl http://localhost:5000/api/auth/me -b cookies.txt
```

5. Test role-based access:
```bash
# This should work (admin can create products)
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Test Product","category":"Food","mrp":"10.99","buying_cost":"8.99"}'
```

## Troubleshooting

### "Unauthorized" errors
- Make sure you're including credentials in fetch requests: `credentials: 'include'`
- Check that SESSION_SECRET is set in .env

### "Forbidden" errors
- User doesn't have the required role
- Check user role: `GET /api/auth/me`

### Session not persisting
- Clear browser cookies
- Check that cookies are being sent with requests
- Verify SESSION_SECRET is set

## Next Steps

1. ✅ Push schema to Neon: `npm run db:push`
2. ✅ Create admin user
3. ✅ Create Login page in frontend
4. ✅ Add AuthContext to your app
5. ✅ Protect routes with ProtectedRoute component
6. ✅ Add role checks in UI (hide buttons based on role)
7. ✅ Replace password hashing with bcrypt for production

## Role Permission Matrix

| Feature | Admin | Manager | Staff | Viewer |
|---------|-------|---------|-------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Products | ✅ | ✅ | ❌ | ❌ |
| View Customers | ✅ | ✅ | ✅ | ✅ |
| Create Customers | ✅ | ✅ | ✅ | ❌ |
| View Bills | ✅ | ✅ | ✅ | ✅ |
| Create Bills | ✅ | ✅ | ✅ | ❌ |
| Inventory Transactions | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |

---

**Need help?** Check the console logs or create an issue in your repository.
