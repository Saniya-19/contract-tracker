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
│   │   ├── controllers/   (auth.controller.js, contract.controller.js)
│   │   ├── middleware/    (authenticate.js, authorizeRoles.js, errorHandler.js, loadContract.js, notFound.js, validate.js)
│   │   ├── models/        (Contract.js, User.js)
│   │   ├── routes/        (index.js, health.routes.js, auth.routes.js, contract.routes.js)
│   │   ├── utils/         (ApiError.js, asyncHandler.js, contractStateMachine.js, tokens.js)
│   │   ├── validators/    (auth.validators.js, contract.validators.js)
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

---

## Contracts API Reference

All contract routes are mounted under the `/api/contracts` prefix and protected by the `authenticate` middleware.

### Status State Machine

Contracts transition through a strict state machine with terminal states and role-based permissions:

```text
       [ create ] (Freelancer)
           │
           ▼
        ┌──────┐
        │draft │ ──(cancel)──► ┌──────────┐
        └──────┘               │cancelled │◄──┐
           │                   └──────────┘   │
     (send)│                         ▲        │(cancel)
           ▼                         │(cancel)│
       ┌───────┐                     │        │
       │pending│ ────────────────────┘        │
       └───────┘                              │
        │     │                               │
(accept)│     │(reject)                       │
        ▼     ▼                               │
   ┌──────┐ ┌────────┐                        │
   │active│ │rejected│                        │
   └──────┘ └────────┘                        │
      │ ▲                                     │
      │ └─────────────────────────────────────┘
      ▼
 ┌─────────┐
 │completed│ (automatic in Phase 4/5)
 └─────────┘
```

#### Allowed Transitions:
- `draft` ➔ `pending` (Freelancer sends to client)
- `draft` ➔ `cancelled` (Freelancer cancels draft)
- `pending` ➔ `active` (Client accepts)
- `pending` ➔ `rejected` (Client rejects with optional reason)
- `pending` ➔ `cancelled` (Freelancer cancels pending offer)
- `active` ➔ `completed` (Triggered upon final deliverable completion)
- `active` ➔ `cancelled` (Freelancer cancels active project)

#### Terminal States:
- `rejected`, `completed`, `cancelled` (no further status transitions allowed; returns `409 Conflict`).

#### Permission Rules:
- **Freelancers** can create contracts (starts in `draft`), edit (`draft` only), delete (`draft` only), send (`draft` only), and cancel (`draft`, `pending`, or `active`).
- **Clients** can accept (`pending` only) and reject (`pending` only).
- **Participants**: Freelancer owner, or client matched by `client` ObjectId or `clientEmail`.
- **Non-participants** receive `404 Not Found` so existence is never leaked.
- **Clients** can never view contracts in `draft` status (returns `404 Not Found` and excluded from lists).

---

### Endpoints Overview

| Method | Endpoint | Allowed Role | Middleware Stack | Description |
|---|---|---|---|---|
| `POST` | `/api/contracts` | `freelancer` | `authenticate`, `authorizeRoles("freelancer")`, `validate` | Create contract in `draft` status |
| `GET` | `/api/contracts` | `freelancer`, `client` | `authenticate`, `validate(query)` | List contracts with filters and pagination |
| `GET` | `/api/contracts/:id` | Participant | `authenticate`, `loadContract` | Get contract with populated parties |
| `PATCH` | `/api/contracts/:id` | `freelancer` (owner) | `authenticate`, `authorizeRoles("freelancer")`, `loadContract`, `validate` | Update contract (`draft` status only) |
| `DELETE` | `/api/contracts/:id` | `freelancer` (owner) | `authenticate`, `authorizeRoles("freelancer")`, `loadContract` | Delete contract (`draft` status only) |
| `POST` | `/api/contracts/:id/send` | `freelancer` (owner) | `authenticate`, `authorizeRoles("freelancer")`, `loadContract` | Transition `draft` ➔ `pending` |
| `POST` | `/api/contracts/:id/accept` | `client` (target) | `authenticate`, `authorizeRoles("client")`, `loadContract` | Transition `pending` ➔ `active` |
| `POST` | `/api/contracts/:id/reject` | `client` (target) | `authenticate`, `authorizeRoles("client")`, `loadContract`, `validate` | Transition `pending` ➔ `rejected` |
| `POST` | `/api/contracts/:id/cancel` | `freelancer` (owner) | `authenticate`, `authorizeRoles("freelancer")`, `loadContract` | Transition to `cancelled` |

---

### 1. Create Contract

Creates a contract in `draft` status. If a registered user with role `"client"` and matching `clientEmail` exists, the `client` field is automatically linked.

- **Method**: `POST`
- **URL**: `/api/contracts`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body**:
```json
{
  "title": "E-Commerce Website Redesign",
  "description": "Full redesign and Next.js + Node.js architecture for online store",
  "clientEmail": "client@example.com",
  "totalAmount": 75000,
  "currency": "INR",
  "startDate": "2026-11-01",
  "endDate": "2026-12-01"
}
```
*Validation rules:*
- `title`: String, required, 3–100 chars, trimmed.
- `description`: String, optional, max 2000 chars, trimmed.
- `clientEmail`: String, required, valid email, trimmed, lowercase.
- `totalAmount`: Number, required, minimum 1.
- `currency`: String, optional, default `"INR"`.
- `startDate` & `endDate`: Optional Dates. If both provided, `endDate` must be strictly after `startDate`.

- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "title": "E-Commerce Website Redesign",
    "description": "Full redesign and Next.js + Node.js architecture for online store",
    "freelancer": "6706789abc1234567890def1",
    "client": "6706789abc1234567890def2",
    "clientEmail": "client@example.com",
    "totalAmount": 75000,
    "currency": "INR",
    "startDate": "2026-11-01T00:00:00.000Z",
    "endDate": "2026-12-01T00:00:00.000Z",
    "status": "draft",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
  }
}
```

- **Error Responses**:
  - `400 Bad Request`: Validation failure (missing required fields, `endDate <= startDate`, invalid email).
  - `403 Forbidden`: User role is not `freelancer`.

---

### 2. List Contracts

Retrieves contracts visible to the current authenticated user:
- **Freelancers** see contracts where `freelancer = req.user._id`.
- **Clients** see contracts where `client = req.user._id` OR `clientEmail = req.user.email`, excluding drafts.

- **Method**: `GET`
- **URL**: `/api/contracts`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `status` *(optional)*: Filter by status (`draft`, `pending`, `active`, `completed`, `rejected`, `cancelled`).
  - `search` *(optional)*: Case-insensitive search on title.
  - `page` *(optional)*: Page number (default: `1`, min: `1`).
  - `limit` *(optional)*: Items per page (default: `10`, min: `1`, max: `50`).
  - `sort` *(optional)*: `newest` (default, `-createdAt`) or `oldest` (`createdAt`).

- **Example URL**: `/api/contracts?status=pending&search=Redesign&page=1&limit=10`

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "6707123abc456def78901234",
      "title": "E-Commerce Website Redesign",
      "description": "Full redesign and Next.js + Node.js architecture for online store",
      "freelancer": {
        "_id": "6706789abc1234567890def1",
        "name": "Jane Freelancer",
        "email": "jane@example.com"
      },
      "client": {
        "_id": "6706789abc1234567890def2",
        "name": "Bob Client",
        "email": "client@example.com"
      },
      "clientEmail": "client@example.com",
      "totalAmount": 75000,
      "currency": "INR",
      "status": "pending",
      "sentAt": "2026-10-10T12:05:00.000Z",
      "createdAt": "2026-10-10T12:00:00.000Z",
      "updatedAt": "2026-10-10T12:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### 3. Get Single Contract

Retrieves contract details by ID. Freelancer and Client objects are populated with `name` and `email`.

- **Method**: `GET`
- **URL**: `/api/contracts/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "title": "E-Commerce Website Redesign",
    "description": "Full redesign and Next.js + Node.js architecture for online store",
    "freelancer": {
      "_id": "6706789abc1234567890def1",
      "name": "Jane Freelancer",
      "email": "jane@example.com"
    },
    "client": {
      "_id": "6706789abc1234567890def2",
      "name": "Bob Client",
      "email": "client@example.com"
    },
    "clientEmail": "client@example.com",
    "totalAmount": 75000,
    "currency": "INR",
    "status": "active",
    "acceptedAt": "2026-10-10T12:10:00.000Z",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:10:00.000Z"
  }
}
```
- **Error Responses**:
  - `404 Not Found`: Contract not found, user is not a participant, or user is client viewing a `draft`.

---

### 4. Update Contract

Updates fields on an existing contract. Allowed only for the owning freelancer while contract is in `draft` status.

- **Method**: `PATCH`
- **URL**: `/api/contracts/:id`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body** *(all fields optional)*:
```json
{
  "title": "E-Commerce Website Redesign (Phase 1 & 2)",
  "totalAmount": 85000
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "title": "E-Commerce Website Redesign (Phase 1 & 2)",
    "totalAmount": 85000,
    "status": "draft"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Validation failure or `endDate <= startDate`.
  - `403 Forbidden`: Authenticated freelancer is not the owner.
  - `409 Conflict`: Contract status is not `draft`.

---

### 5. Delete Contract

Deletes a contract document. Allowed only for the owning freelancer while contract is in `draft` status.

- **Method**: `DELETE`
- **URL**: `/api/contracts/:id`
- **Headers**: `Authorization: Bearer <freelancer_access_token>`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Contract deleted successfully"
}
```
- **Error Responses**:
  - `403 Forbidden`: Authenticated freelancer is not the owner.
  - `409 Conflict`: Contract status is not `draft`.

---

### 6. Send Contract to Client

Transitions contract from `draft` to `pending` and records `sentAt`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/send`
- **Headers**: `Authorization: Bearer <freelancer_access_token>`
- **Request Body**: None
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "status": "pending",
    "sentAt": "2026-10-10T12:05:00.000Z"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Authenticated freelancer is not the owner.
  - `409 Conflict`: Cannot change contract from current status to `pending`.

---

### 7. Accept Contract

Transitions contract from `pending` to `active`, associates `client` to current user ID, and records `acceptedAt`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/accept`
- **Headers**: `Authorization: Bearer <client_access_token>`
- **Request Body**: None
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "client": "6706789abc1234567890def2",
    "status": "active",
    "acceptedAt": "2026-10-10T12:10:00.000Z"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Authenticated client is not the target participant.
  - `409 Conflict`: Contract is not in `pending` status (e.g. already accepted or cancelled).

---

### 8. Reject Contract

Transitions contract from `pending` to `rejected`, records `rejectionReason` (if supplied), and records `rejectedAt`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/reject`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <client_access_token>`
- **Request Body**:
```json
{
  "rejectionReason": "Timeline does not align with our expected delivery window."
}
```
*`rejectionReason` is optional (max 500 characters).*

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "status": "rejected",
    "rejectionReason": "Timeline does not align with our expected delivery window.",
    "rejectedAt": "2026-10-10T12:12:00.000Z"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Authenticated client is not the target participant.
  - `409 Conflict`: Contract is not in `pending` status.

---

### 9. Cancel Contract

Transitions contract from `draft`, `pending`, or `active` to `cancelled`, and records `cancelledAt`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/cancel`
- **Headers**: `Authorization: Bearer <freelancer_access_token>`
- **Request Body**: None
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6707123abc456def78901234",
    "status": "cancelled",
    "cancelledAt": "2026-10-10T12:15:00.000Z"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Authenticated freelancer is not the owner.
  - `409 Conflict`: Contract is in a terminal state (`rejected`, `completed`, `cancelled`).