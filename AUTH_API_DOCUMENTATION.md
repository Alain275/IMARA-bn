# IMARA Authentication API Documentation

## Overview
Complete authentication system with OTP email verification, JWT tokens, and password reset functionality.

## User Roles
- **Farmer** - Regular farmers using the platform
- **Agronomist** - Agricultural experts providing advice
- **Admin** - Platform administrators
- **Cooperative** - Farming cooperatives/organizations

## Authentication Flow

### 1. Registration Flow
```
User → Register → OTP Sent to Email → Verify OTP → Email Verified → Login
```

### 2. Login Flow
```
User → Login → Check Email Verified → Generate JWT → Return Tokens
```

### 3. Password Reset Flow
```
User → Forgot Password → Reset Email Sent → Click Link → Reset Password → Login
```

---

## API Endpoints

### Base URL
```
Development: http://localhost:5000/api/auth
Production: https://api.imara.rw/api/auth
```

---

## 1. Register User

**POST** `/register`

Register a new user and send OTP for email verification.

**Request Body:**
```json
{
  "name": "Jean Mugabo",
  "email": "jean@example.com",
  "password": "SecurePass123!",
  "phone": "+250788123456",
  "role": "farmer",
  "location": "Kigali, Gasabo",
  "farmSize": 2.5
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email with the OTP sent to your inbox.",
  "data": {
    "userId": "uuid-here",
    "email": "jean@example.com",
    "name": "Jean Mugabo",
    "role": "farmer",
    "isEmailVerified": false
  }
}
```

---

## 2. Verify Email with OTP

**POST** `/verify-email`

Verify user's email address using the OTP sent during registration.

**Request Body:**
```json
{
  "email": "jean@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "Jean Mugabo",
      "email": "jean@example.com",
      "phone": "+250788123456",
      "role": "farmer",
      "location": "Kigali, Gasabo",
      "farmSize": 2.5,
      "isEmailVerified": true
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

---

## 3. Resend OTP

**POST** `/resend-otp`

Resend OTP if the previous one expired or wasn't received.

**Request Body:**
```json
{
  "email": "jean@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP resent successfully"
}
```

---

## 4. Login

**POST** `/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "jean@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "Jean Mugabo",
      "email": "jean@example.com",
      "phone": "+250788123456",
      "role": "farmer",
      "location": "Kigali, Gasabo",
      "farmSize": 2.5,
      "isEmailVerified": true
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

---

## 5. Get Current User

**GET** `/me`

Get the currently logged-in user's profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Jean Mugabo",
    "email": "jean@example.com",
    "phone": "+250788123456",
    "role": "farmer",
    "location": "Kigali, Gasabo",
    "farmSize": 2.5,
    "isEmailVerified": true,
    "isActive": true,
    "lastLogin": "2024-03-15T10:30:00Z",
    "createdAt": "2024-03-01T08:00:00Z"
  }
}
```

---

## 6. Forgot Password

**POST** `/forgot-password`

Request a password reset email.

**Request Body:**
```json
{
  "email": "jean@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

## 7. Reset Password

**POST** `/reset-password`

Reset password using the token from the email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

---

## 8. Refresh Token

**POST** `/refresh-token`

Get a new access token using the refresh token.

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Please verify your email before logging in"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Something went wrong"
}
```

---

## Usage Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

// Register
const register = async () => {
  const response = await axios.post(`${API_URL}/register`, {
    name: 'Jean Mugabo',
    email: 'jean@example.com',
    password: 'SecurePass123!',
    role: 'farmer',
    location: 'Kigali',
    farmSize: 2.5
  });
  return response.data;
};

// Verify Email
const verifyEmail = async (email: string, otp: string) => {
  const response = await axios.post(`${API_URL}/verify-email`, {
    email,
    otp
  });
  
  // Store tokens
  localStorage.setItem('token', response.data.data.token);
  localStorage.setItem('refreshToken', response.data.data.refreshToken);
  
  return response.data;
};

// Login
const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, {
    email,
    password
  });
  
  // Store tokens
  localStorage.setItem('token', response.data.data.token);
  localStorage.setItem('refreshToken', response.data.data.refreshToken);
  
  return response.data;
};

// Get Profile (Protected)
const getProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
```

---

## Security Features

✅ **Password Hashing** - Bcrypt with salt rounds of 12  
✅ **JWT Tokens** - Access token (7 days) + Refresh token (30 days)  
✅ **OTP Verification** - 6-digit OTP with 10-minute expiration  
✅ **Email Verification** - Required before login  
✅ **Password Reset** - Secure token-based reset (1 hour expiration)  
✅ **Role-Based Access** - Farmer, Agronomist, Admin, Cooperative  
✅ **Account Status** - Active/Inactive flag  

---

## Testing with Swagger

Visit: `http://localhost:5000/api-docs`

The Swagger UI provides interactive API documentation where you can:
- Test all endpoints
- View request/response schemas
- Authorize with JWT tokens
- See example payloads

---

## Environment Variables Required

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=IMARA Platform <noreply@imara.rw>

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_EXPIRES_IN=10
OTP_LENGTH=6

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## Next Steps

1. **Install dependencies**: `npm install`
2. **Configure environment**: Copy `.env.example` to `.env`
3. **Setup PostgreSQL**: Create database `imara_db`
4. **Run server**: `npm run dev`
5. **Test API**: Visit `http://localhost:5000/api-docs`
