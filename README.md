# Contract Tracker

Contract Tracker is a full-stack MERN platform enabling freelancers and clients to seamlessly manage contracts, define project milestones, submit deliverables, process approvals, and track payment status in real time.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Security & Utilities**: `helmet`, `cors`, `morgan`, `express-rate-limit`, `cookie-parser`, `zod`, `jsonwebtoken`, `bcryptjs`, `dotenv`
- **Development Tools**: `nodemon`

## Folder Structure

```text
contract-tracker/
├── server/
│   ├── src/
│   │   ├── config/        (db.js, env.js)
│   │   ├── controllers/   (auth.controller.js)
│   │   ├── middleware/    (authenticate.js, authorizeRoles.js, errorHandler.js, notFound.js, validate.js)
│   │   ├── models/        (User.js)
│   │   ├── routes/        (index.js, health.routes.js, auth.routes.js)
│   │   ├── utils/         (ApiError.js, asyncHandler.js, tokens.js)
│   │   ├── validators/    (auth.validators.js)
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── .env
│   └── package.json
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

Navigate into the `server` directory and install dependencies:

```bash
cd server
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` if not already present, and configure your environment variables:

```bash
cp .env.example .env
```

Ensure variables are set:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/contract_tracker
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
CLIENT_URL=http://localhost:5173
```

### 3. Run Application

Start the development server with hot-reloading:

```bash
npm run dev
```

Or run in production mode:

```bash
npm start
```

### 4. Health Check

Verify the API server is operational:
`GET http://localhost:5000/api/health`

---

## Auth API Reference

All authentication routes are mounted under the `/api/auth` prefix.

### 1. Register User

Creates a new user account as either a freelancer or a client, generates JWT tokens, and sets an `httpOnly` refresh token cookie.

- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123",
  "role": "freelancer"
}
```
*Field requirements:*
  - `name`: String, 2–50 characters, trimmed.
  - `email`: Valid email format, lowercase, trimmed.
  - `password`: Minimum 8 characters, at least one letter and one number.
  - `role`: `"freelancer"` or `"client"`.

- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "user": {
    "_id": "6706789abc1234567890def1",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "freelancer",
    "createdAt": "2026-10-09T11:45:00.000Z",
    "updatedAt": "2026-10-09T11:45:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
*Sets `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`*

- **Error Responses**:
  - `400 Bad Request`: Validation failure (weak password, invalid email format, missing fields).
  - `409 Conflict`: Email already registered.

---

### 2. Login

Authenticates user credentials, generates new JWT tokens, and sets an `httpOnly` refresh token cookie.
*Rate limited to 10 requests per 15 minutes per IP.*

- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password123"
}
```

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "user": {
    "_id": "6706789abc1234567890def1",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "freelancer",
    "createdAt": "2026-10-09T11:45:00.000Z",
    "updatedAt": "2026-10-09T11:45:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
*Sets `Set-Cookie: refreshToken=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`*

- **Error Responses**:
  - `400 Bad Request`: Malformed or missing email/password.
  - `401 Unauthorized`: `"Invalid email or password"` (generic message for non-existent email or incorrect password).
  - `429 Too Many Requests`: Exceeded 10 attempts in 15 minutes.

---

### 3. Refresh Token

Rotates the access token and refresh token using the `httpOnly` cookie. Stored SHA-256 hash is verified and replaced.

- **Method**: `POST`
- **URL**: `/api/auth/refresh`
- **Headers**: Requires `Cookie: refreshToken=<token>`
- **Request Body**: None

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
*Sets new rotated `Set-Cookie: refreshToken=...`*

- **Error Responses**:
  - `401 Unauthorized`: Missing, expired, invalid, or revoked refresh token.

---

### 4. Logout

Invalidates stored `refreshTokenHash` in database and clears the refresh token cookie.

- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: None

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
*Clears `refreshToken` cookie.*

- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid Bearer access token.

---

### 5. Get Authenticated User (`/me`)

Retrieves profile details for the currently authenticated user.

- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "user": {
    "_id": "6706789abc1234567890def1",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "freelancer",
    "createdAt": "2026-10-09T11:45:00.000Z",
    "updatedAt": "2026-10-09T11:45:00.000Z"
  }
}
```

- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid Bearer access token.

---

### 6. Freelancer Only (RBAC Verification)

Temporary test route protected by `authenticate` and `authorizeRoles("freelancer")`.

- **Method**: `GET`
- **URL**: `/api/auth/freelancer-only`
- **Headers**: `Authorization: Bearer <accessToken>`

- **Success Response (`200 OK` - when called with a freelancer token)**:
```json
{
  "success": true,
  "message": "Freelancer access granted",
  "user": { ... }
}
```

- **Forbidden Response (`403 Forbidden` - when called with a client token)**:
```json
{
  "success": false,
  "message": "Access denied: insufficient permissions"
}
```