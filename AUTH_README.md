# Authentication System

## Overview
The application now includes a complete authentication system to secure access.

## Login Credentials

**Username:** `marumaru`  
**Password:** `marusayang`

## Features

### 🔐 Secure Login
- Username and password authentication
- Session management with HTTP-only cookies
- Token-based authentication
- Automatic redirect to login page if not authenticated

### 🚪 Logout
- Logout button in the header (top-right corner)
- Clears session and redirects to login page

### 🛡️ Protected Routes
- All routes except `/login` require authentication
- Middleware automatically redirects unauthenticated users

## Usage

1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Username: `marumaru`
   - Password: `marusayang`
3. Click "Login" button
4. You'll be redirected to the main dashboard
5. Use the logout button (🚪 Keluar) in the header to sign out

## File Structure

```
app/
├── login/
│   └── page.tsx                    # Login page component
├── api/
│   └── auth/
│       ├── login/
│       │   └── route.ts           # Login API endpoint
│       └── logout/
│           └── route.ts           # Logout API endpoint
middleware.ts                       # Route protection middleware
```

## Security Features

- **HTTP-only Cookies**: Session tokens stored in HTTP-only cookies (more secure than localStorage)
- **Client-side Token**: Additional token in localStorage for client-side checks
- **Middleware Protection**: Automatic route protection at the Next.js middleware level
- **Session Expiry**: Tokens expire after 7 days

## Customization

To change credentials, edit:
```typescript
// app/api/auth/login/route.ts
const VALID_USERNAME = 'marumaru';
const VALID_PASSWORD = 'marusayang';
```

## Future Enhancements

- Database-backed user authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Multi-user support
- Password reset functionality
- Two-factor authentication (2FA)
