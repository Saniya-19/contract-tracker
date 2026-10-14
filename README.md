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
│   │   ├── controllers/   (auth.controller.js, contract.controller.js, milestone.controller.js)
│   │   ├── middleware/    (authenticate.js, authorizeRoles.js, errorHandler.js, loadContract.js, loadMilestone.js, notFound.js, validate.js)
│   │   ├── models/        (Contract.js, Milestone.js, User.js)
│   │   ├── routes/        (index.js, health.routes.js, auth.routes.js, contract.routes.js, milestone.routes.js)
│   │   ├── services/      (contractCompletion.js)
│   │   ├── utils/         (ApiError.js, asyncHandler.js, contractStateMachine.js, milestoneStateMachine.js, tokens.js)
│   │   ├── validators/    (auth.validators.js, contract.validators.js, milestone.validators.js)
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
JWT_ACCESS_EXPIRES_IN=15m   # optional – defaults to 15m; set to e.g. 4h for local dev
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

---

## Milestones API Reference

All milestone routes are nested under the `/api/contracts/:id/milestones` prefix and protected by `authenticate` and `loadContract` middleware.

### Milestone State Machine

Milestones progress through an explicit role-based workflow state machine:

```text
       [ create ] (Freelancer, Draft Contract)
           │
           ▼
        ┌───────┐
   ┌──► │pending│
   │    └───────┘
   │        │
   │ (start)│ (Freelancer, Contract Active)
   │        ▼
   │  ┌───────────┐
   │  │in_progress│
   │  └───────────┘
   │        │
   │(submit)│ (Freelancer, Contract Active)
   │        ▼
   │  ┌─────────┐
   │  │submitted│
   │  └─────────┘
   │   │       │
(request-      │(approve)
revision)      │(Client, Contract Active)
   │           ▼
┌──────────────────┐  (mark-paid)   ┌────┐
│revision_requested│ ◄───────────── │paid│ (Auto-completes contract
└──────────────────┘ (Client,       └────┘  when all milestones paid)
       │              Contract Active) ▲
(start)│                               │
       └───────────────────────────────┘
```

#### Status Transition Table (Who Can Move What)

| Action | Current Status (`from`) | Target Status (`to`) | Allowed Role | Trigger / Requirements |
|---|---|---|---|---|
| `start` | `pending` | `in_progress` | `freelancer` | Starts work. Requires all earlier milestones (lower order) to be `approved` or `paid`. |
| `start` | `revision_requested` | `in_progress` | `freelancer` | Resumes work after client feedback. Automatically clears `revisionNotes`. |
| `submit` | `in_progress` | `submitted` | `freelancer` | Submits deliverable for review. Accepts optional `submissionNote`. |
| `approve` | `submitted` | `approved` | `client` | Client approves deliverables. Records `approvedAt`. |
| `request-revision` | `submitted` | `revision_requested` | `client` | Client requests changes. Requires `revisionNotes` (min 5 characters). |
| `mark-paid` | `approved` | `paid` | `client` | Client marks milestone paid. Records `paidAt`, accepts optional `paymentReference`. Automatically transitions contract to `completed` if all milestones are paid. |

#### Core Business Rules:
1. **Draft Modifications Only**: Adding (`POST /`), editing (`PATCH /:milestoneId`), deleting (`DELETE /:milestoneId`), and reordering (`PUT /reorder`) milestones are allowed **only while the contract status is `"draft"`** and **only by the contract's freelancer**. Otherwise returns `409 Conflict` (or `403 Forbidden`).
2. **Total Amount Budget Constraint**: The sum of milestone amounts must never exceed the contract `totalAmount`. Any addition or edit that exceeds it returns `400 Bad Request` with a clear message indicating the remaining balance.
3. **Exact Milestone Sum on Send**: Sending a contract (`POST /contracts/:id/send`) requires at least one milestone and requires the sum of all milestone amounts to equal `totalAmount` exactly (calculated in integer paise).
4. **Active Contract Requirement**: Milestone workflow actions (`start`, `submit`, `approve`, `request-revision`, `mark-paid`) are allowed **only when the contract status is `"active"`**. Otherwise returns `409 Conflict`.
5. **Sequential Progression Rule**: A milestone can only be started if **all earlier milestones (lower order) are already in `"approved"` or `"paid"` status**. Otherwise returns `409 Conflict`.
6. **Revision Notes Lifecycle**: Calling `request-revision` requires non-empty `revisionNotes` (5–1000 characters). When the freelancer calls `start` again, `revisionNotes` are automatically cleared (`null`).
7. **Concurrency Safety**: All state transitions execute atomically via `findOneAndUpdate` with the expected current status in the filter query. Concurrent requests returning no match yield `409 Conflict`.
8. **Automatic Contract Completion**: Upon successfully marking the final unpaid milestone as `"paid"`, the system automatically transitions the contract to `"completed"`, records `completedAt`, and validates transition through the contract state machine.

---

### Endpoints Overview

| Method | Endpoint | Allowed Participant | Middleware Stack | Description |
|---|---|---|---|---|
| `POST` | `/api/contracts/:id/milestones` | `freelancer` (owner) | `authenticate`, `loadContract`, `validate` | Create milestone (`order = last + 1`) |
| `GET` | `/api/contracts/:id/milestones` | Participant | `authenticate`, `loadContract` | List contract milestones sorted by order |
| `PUT` | `/api/contracts/:id/milestones/reorder` | `freelancer` (owner) | `authenticate`, `loadContract`, `validate` | Reorder milestones `{ order: [ids] }` |
| `PATCH` | `/api/contracts/:id/milestones/:milestoneId` | `freelancer` (owner) | `authenticate`, `loadContract`, `loadMilestone`, `validate` | Update milestone in draft contract |
| `DELETE` | `/api/contracts/:id/milestones/:milestoneId` | `freelancer` (owner) | `authenticate`, `loadContract`, `loadMilestone` | Delete milestone and renumber orders |
| `POST` | `/api/contracts/:id/milestones/:milestoneId/start` | `freelancer` (owner) | `authenticate`, `loadContract`, `loadMilestone` | Start milestone work |
| `POST` | `/api/contracts/:id/milestones/:milestoneId/submit` | `freelancer` (owner) | `authenticate`, `loadContract`, `loadMilestone`, `validate` | Submit deliverable for review |
| `POST` | `/api/contracts/:id/milestones/:milestoneId/approve` | `client` (target) | `authenticate`, `loadContract`, `loadMilestone` | Approve submitted milestone |
| `POST` | `/api/contracts/:id/milestones/:milestoneId/request-revision` | `client` (target) | `authenticate`, `loadContract`, `loadMilestone`, `validate` | Request revisions on milestone |
| `POST` | `/api/contracts/:id/milestones/:milestoneId/mark-paid` | `client` (target) | `authenticate`, `loadContract`, `loadMilestone`, `validate` | Mark milestone as paid |

---

### 1. Create Milestone

Creates a new milestone in `"pending"` status with `order = last + 1`. Allowed only for the owning freelancer while contract is in `"draft"`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body**:
```json
{
  "title": "Milestone 1: Wireframes & High-Fidelity UI",
  "description": "Figma design system, interactive prototypes, and design approval",
  "amount": 25000,
  "dueDate": "2026-11-10T18:00:00.000Z"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "contract": "6707123abc456def78901234",
    "title": "Milestone 1: Wireframes & High-Fidelity UI",
    "description": "Figma design system, interactive prototypes, and design approval",
    "amount": 25000,
    "dueDate": "2026-11-10T18:00:00.000Z",
    "order": 1,
    "status": "pending",
    "revisionNotes": null,
    "submissionNote": null,
    "paymentReference": null,
    "createdAt": "2026-10-12T12:00:00.000Z",
    "updatedAt": "2026-10-12T12:00:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Validation failure or amount exceeds remaining contract balance.
  - `403 Forbidden`: Authenticated user is not the contract freelancer.
  - `409 Conflict`: Contract is not in `draft` status.

---

### 2. List Milestones

Retrieves all milestones for a contract sorted in ascending order (`order: 1`).

- **Method**: `GET`
- **URL**: `/api/contracts/:id/milestones`
- **Headers**: `Authorization: Bearer <access_token>`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "6708001abc456def78900001",
      "contract": "6707123abc456def78901234",
      "title": "Milestone 1: Wireframes & High-Fidelity UI",
      "amount": 25000,
      "dueDate": "2026-11-10T18:00:00.000Z",
      "order": 1,
      "status": "pending"
    }
  ]
}
```

---

### 3. Reorder Milestones

Reorders milestones by accepting an array containing exactly all milestone IDs of the contract.

- **Method**: `PUT`
- **URL**: `/api/contracts/:id/milestones/reorder`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body**:
```json
{
  "order": [
    "6708002abc456def78900002",
    "6708001abc456def78900001",
    "6708003abc456def78900003"
  ]
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    { "_id": "6708002abc456def78900002", "order": 1, "title": "Milestone 2" },
    { "_id": "6708001abc456def78900001", "order": 2, "title": "Milestone 1" },
    { "_id": "6708003abc456def78900003", "order": 3, "title": "Milestone 3" }
  ]
}
```
- **Error Responses**:
  - `400 Bad Request`: Array count does not match, contains duplicates, or contains unknown IDs.
  - `409 Conflict`: Contract status is not `draft`.

---

### 4. Update Milestone

Updates milestone fields in a draft contract.

- **Method**: `PATCH`
- **URL**: `/api/contracts/:id/milestones/:milestoneId`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body** *(all fields optional)*:
```json
{
  "title": "Milestone 1: Updated Scope",
  "amount": 30000
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "title": "Milestone 1: Updated Scope",
    "amount": 30000,
    "order": 1,
    "status": "pending"
  }
}
```

---

### 5. Delete Milestone

Deletes a milestone and automatically renumbers remaining milestones (`1, 2, 3...`).

- **Method**: `DELETE`
- **URL**: `/api/contracts/:id/milestones/:milestoneId`
- **Headers**: `Authorization: Bearer <freelancer_access_token>`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Milestone deleted successfully"
}
```

---

### 6. Start Milestone

Transitions milestone from `pending` (or `revision_requested`) to `in_progress`. Enforces the sequential rule (earlier milestones must be `approved` or `paid`) and clears `revisionNotes`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/start`
- **Headers**: `Authorization: Bearer <freelancer_access_token>`
- **Request Body**: None
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "status": "in_progress",
    "startedAt": "2026-10-12T12:30:00.000Z",
    "revisionNotes": null
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Caller is not the contract freelancer.
  - `409 Conflict`: Contract is not active, milestone status does not permit start, or earlier milestone is incomplete.

---

### 7. Submit Milestone Deliverable

Transitions milestone from `in_progress` to `submitted`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/submit`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <freelancer_access_token>`
- **Request Body**:
```json
{
  "submissionNote": "Designs published to Figma link: https://figma.com/file/xyz"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "status": "submitted",
    "submittedAt": "2026-10-12T13:00:00.000Z",
    "submissionNote": "Designs published to Figma link: https://figma.com/file/xyz"
  }
}
```

---

### 8. Approve Milestone

Transitions milestone from `submitted` to `approved`.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/approve`
- **Headers**: `Authorization: Bearer <client_access_token>`
- **Request Body**: None
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "status": "approved",
    "approvedAt": "2026-10-12T13:15:00.000Z"
  }
}
```
- **Error Responses**:
  - `403 Forbidden`: Caller is not the contract client.
  - `409 Conflict`: Milestone is not in `submitted` status.

---

### 9. Request Milestone Revision

Transitions milestone from `submitted` to `revision_requested`. Requires detailed notes (minimum 5 characters).

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/request-revision`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <client_access_token>`
- **Request Body**:
```json
{
  "revisionNotes": "Please improve contrast on mobile headers and add user profile dropdown states."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "status": "revision_requested",
    "revisionNotes": "Please improve contrast on mobile headers and add user profile dropdown states."
  }
}
```

---

### 10. Mark Milestone as Paid

Transitions milestone from `approved` to `paid`. If every milestone in the contract is now paid, automatically updates the contract status to `"completed"` with `completedAt` timestamp.

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/mark-paid`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <client_access_token>`
- **Request Body** *(optional)*:
```json
{
  "paymentReference": "UPI-REF-9876543210"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "_id": "6708001abc456def78900001",
    "status": "paid",
    "paidAt": "2026-10-12T13:30:00.000Z",
    "paymentReference": "UPI-REF-9876543210"
  }
}
```

---

## Submissions API

Deliverables (uploaded files or external links) are attached to milestones via the Submissions API.

All routes are mounted under `/api/contracts/:id/milestones/:milestoneId/submissions`.
All routes require `Authorization: Bearer <access_token>`.

> [!NOTE]
> **Storage note**: Files are stored in Cloudinary with randomly generated, unguessable public IDs. However, the URLs themselves are **not access-controlled** — anyone who knows the URL can access the file. Signed/private URLs are a planned future improvement.

### Environment Variables (Cloudinary)

Add these to your `.env` to enable file uploads. They are **optional** — the server boots without them and returns `503` for file-upload requests while link submissions continue to work.

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Allowed File Types

| Extension | MIME type |
|-----------|-----------|
| `.pdf` | `application/pdf` |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` | `image/jpeg` |
| `.webp` | `image/webp` |
| `.zip` | `application/zip` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.txt` | `text/plain` |
| `.md` | `text/markdown` |

**Maximum file size**: 10 MB. Exceeding this returns `413`.

### 1. Add a Submission (Freelancer only)

- **Method**: `POST`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/submissions`
- **Content-Type**: `multipart/form-data` (for file uploads) or `application/json` / `multipart/form-data` (for links)
- **Multipart field name**: `file`
- **Text fields**: `linkUrl` (optional), `note` (optional, max 500 chars)
- **Rules**: Exactly one of `file` or `linkUrl` must be provided (not both, not neither).

**File upload example (multipart/form-data)**:

| Field | Value |
|-------|-------|
| `file` | *(attach PDF or other allowed file, max 10 MB)* |
| `note` | `"First draft"` *(optional)* |

**Link submission example (multipart/form-data or JSON)**:

```json
{
  "linkUrl": "https://figma.com/file/abc123/Design-v1",
  "note": "Figma prototype link"
}
```

- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "type": "file",
    "fileUrl": "https://res.cloudinary.com/your-cloud/...",
    "originalName": "report.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "revisionRound": 1,
    "submittedBy": "...",
    "createdAt": "2026-10-14T12:00:00.000Z"
  }
}
```

- **Error Responses**:
  - `400`: No file or link provided / both provided / invalid URL scheme (`javascript:` etc.) / unsupported file type.
  - `403`: Caller is not the contract freelancer.
  - `409`: Contract not active / milestone not `in_progress` / max 10 submissions per round exceeded.
  - `413`: File exceeds 10 MB.
  - `503`: Cloudinary not configured (file-only; links still work).

---

### 2. List Submissions (Any participant)

- **Method**: `GET`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/submissions`

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [ ... ],
  "grouped": {
    "1": [ ... ],
    "2": [ ... ]
  }
}
```

Results are newest-first; `grouped` organises them by `revisionRound`.

---

### 3. Delete a Submission (Freelancer who uploaded it)

- **Method**: `DELETE`
- **URL**: `/api/contracts/:id/milestones/:milestoneId/submissions/:submissionId`

Allowed only while the milestone is `in_progress` and only for submissions belonging to the **current** revision round. Deleting a file submission also removes the asset from Cloudinary.

- **Success Response (`200 OK`)**:
```json
{ "success": true, "message": "Submission deleted successfully" }
```

- **Error Responses**:
  - `403`: Not the uploader.
  - `404`: Submission not found.
  - `409`: Milestone not in `in_progress` status, or submission belongs to a previous revision round.