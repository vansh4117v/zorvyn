# Finance Dashboard Backend

A REST API backend for a finance dashboard system with role-based access control, CRUD operations on financial records, and aggregated analytics endpoints.

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM (with `@prisma/adapter-pg` driver adapter)
- **Auth:** JWT (JSON Web Tokens)
- **Validation:** Zod
- **Password Hashing:** bcrypt

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection string and a JWT secret:

```
DATABASE_URL="postgresql://user:password@localhost:5432/finance_dashboard?schema=public"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"
PORT=3000
```

### 3. Generate Prisma client & push schema

```bash
npm run db:generate
npm run db:push
```

### 4. Seed the database

```bash
npm run db:seed
```

### 5. Run the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The server runs on `http://localhost:3000` by default.

---

## Seed Credentials

| Role    | Email                | Password        |
|---------|----------------------|-----------------|
| ADMIN   | admin@finance.com    | Password@1234   |
| ANALYST | analyst@finance.com  | Password@1234   |
| VIEWER  | viewer@finance.com   | Password@1234   |

---

## API Reference

### Health Check

| Method | Path      | Auth | Roles | Description          |
|--------|-----------|------|-------|----------------------|
| GET    | `/health` | No   | —     | Server health check  |

### Auth

| Method | Path                 | Auth | Roles | Description                              |
|--------|----------------------|------|-------|------------------------------------------|
| POST   | `/api/auth/register` | No   | —     | Register a new user (defaults to VIEWER)  |
| POST   | `/api/auth/login`    | No   | —     | Login and receive JWT token               |
| GET    | `/api/auth/me`       | Yes  | All   | Get current authenticated user profile    |

### Users (ADMIN only)

| Method | Path              | Auth | Roles | Description              |
|--------|-------------------|------|-------|--------------------------|
| GET    | `/api/users`      | Yes  | ADMIN | Paginated list of users  |
| GET    | `/api/users/:id`  | Yes  | ADMIN | Get single user          |
| PATCH  | `/api/users/:id`  | Yes  | ADMIN | Update user (name, role, status) |
| DELETE | `/api/users/:id`  | Yes  | ADMIN | Hard delete a user       |

### Categories

| Method | Path                    | Auth | Roles           | Description         |
|--------|-------------------------|------|-----------------|---------------------|
| GET    | `/api/categories`       | Yes  | All             | List all categories |
| GET    | `/api/categories/:id`   | Yes  | All             | Get single category |
| POST   | `/api/categories`       | Yes  | ANALYST, ADMIN  | Create a category   |
| PATCH  | `/api/categories/:id`   | Yes  | ANALYST, ADMIN  | Update a category   |
| DELETE | `/api/categories/:id`   | Yes  | ADMIN           | Delete a category   |

### Financial Records

| Method | Path                | Auth | Roles | Description                        |
|--------|---------------------|------|-------|------------------------------------|
| GET    | `/api/records`      | Yes  | All   | Paginated list (filterable)        |
| GET    | `/api/records/:id`  | Yes  | All   | Get single record                  |
| POST   | `/api/records`      | Yes  | ADMIN | Create a financial record          |
| PATCH  | `/api/records/:id`  | Yes  | ADMIN | Update a financial record          |
| DELETE | `/api/records/:id`  | Yes  | ADMIN | Soft delete a financial record     |

**Query filters for `GET /api/records`:** `type`, `categoryId`, `startDate`, `endDate`, `page`, `limit`

### Dashboard — Analytics & Trends

All dashboard endpoints require authentication and are accessible to all roles. Most support optional `startDate` and `endDate` query params for date-range filtering.

| Method | Path                                | Filters | Description                              |
|--------|-------------------------------------|---------|------------------------------------------|
| GET    | `/api/dashboard/summary`            | `startDate`, `endDate` | Total income, expenses, net balance, record count |
| GET    | `/api/dashboard/category-breakdown` | `startDate`, `endDate`, `type` | Totals grouped by category and type |
| GET    | `/api/dashboard/monthly-trends`     | `year` | 12-month income/expense/net (zero-filled) |
| GET    | `/api/dashboard/recent-activity`    | `limit` | Last N records with creator & category info |
| GET    | `/api/dashboard/income-vs-expense`  | `granularity` (daily/weekly/monthly), `startDate`, `endDate` | Time-bucketed income vs expense for line charts |
| GET    | `/api/dashboard/top-categories`     | `limit`, `type`, `startDate`, `endDate` | Top N categories ranked by total amount for bar/pie charts |
| GET    | `/api/dashboard/category-trends`    | `year`, `type` | Per-category monthly breakdown for stacked area charts |
| GET    | `/api/dashboard/daily-cashflow`     | `startDate`, `endDate` | Daily income/expense/net with running cumulative balance |
| GET    | `/api/dashboard/year-comparison`    | `year1`, `year2` | Side-by-side 12-month comparison between two years |

---

## Role Permission Matrix

| Action                           | VIEWER | ANALYST | ADMIN |
|----------------------------------|--------|---------|-------|
| View financial records           | ✓      | ✓       | ✓     |
| View dashboard summaries         | ✓      | ✓       | ✓     |
| View categories                  | ✓      | ✓       | ✓     |
| Create / update categories       |        | ✓       | ✓     |
| Delete categories                |        |         | ✓     |
| Create / update / delete records |        |         | ✓     |
| Manage users                     |        |         | ✓     |

---

## Response Format

All endpoints return a consistent JSON shape:

**Success:**
```json
{
  "success": true,
  "message": "Description of result",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Description of error",
  "errors": [ ]
}
```

---

## Assumptions & Design Decisions

- **Soft delete for financial records:** Records are never permanently removed — `isDeleted` is set to `true`. This preserves data integrity and allows audit trails. All queries filter out soft-deleted records automatically.
- **Category deletion guard:** A category cannot be deleted if any financial records (including soft-deleted ones) reference it. This prevents orphaned records and maintains referential integrity. Returns 409 Conflict.
- **JWT-only auth:** Stateless authentication using JWT tokens. No session storage or refresh token mechanism — kept simple for the scope of this project. Tokens expire based on the `JWT_EXPIRES_IN` env var (default 24h).
- **Inactive user blocking:** Even with a valid JWT, inactive users receive 403 on all authenticated requests. This allows admins to disable accounts without invalidating tokens.
- **Admin self-delete prevention:** An admin cannot delete their own account to prevent accidental lockout.
- **Password hashing:** bcrypt with 10 salt rounds for secure password storage. `passwordHash` is never included in any API response.
- **Pagination:** `GET /api/records` and `GET /api/users` support `page` and `limit` query params. Dashboard recent-activity supports `limit`.
- **Monthly trends zero-fill:** All 12 months are always returned, with 0 values for months without data — the frontend can render consistent charts without gap handling.

---

## Project Structure

```
src/
├── config/
│   └── db.js                  # Shared Prisma client instance
├── middleware/
│   ├── auth.js                # JWT authentication & role authorization
│   ├── errorHandler.js        # Centralized error handling middleware
│   └── validate.js            # Zod schema validation middleware
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.routes.js
│   │   ├── auth.service.js
│   │   └── auth.validation.js
│   ├── categories/
│   │   ├── categories.controller.js
│   │   ├── categories.routes.js
│   │   ├── categories.service.js
│   │   └── categories.validation.js
│   ├── dashboard/
│   │   ├── dashboard.controller.js
│   │   ├── dashboard.routes.js
│   │   └── dashboard.service.js
│   ├── records/
│   │   ├── records.controller.js
│   │   ├── records.routes.js
│   │   ├── records.service.js
│   │   └── records.validation.js
│   └── users/
│       ├── users.controller.js
│       ├── users.routes.js
│       ├── users.service.js
│       └── users.validation.js
├── utils/
│   ├── AppError.js            # Custom error class
│   └── response.js            # Consistent response helpers
├── app.js                     # Express app setup & route mounting
└── server.js                  # Server entry point
prisma/
├── schema.prisma              # Database schema
└── seed.js                    # Database seed script
```
