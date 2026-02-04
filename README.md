# DNCR Checker

A full-stack internal tool for verifying UAE phone numbers against the Etisalat **Do Not Call Registry (DNCR)** to ensure telemarketing compliance. Built with React, Express, Prisma, and MySQL.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Default Admin Account](#default-admin-account)
- [Scripts Reference](#scripts-reference)

---

## Overview

This system allows employees to check whether a UAE phone number (mobile or landline) is registered on the DNCR before initiating telemarketing calls. All checks are logged in a MySQL database with full API transaction details for auditing purposes.

Key features:
- Real-time phone number verification against Etisalat DNCR API
- Role-based access control (Admin / Employee)
- User management (add, edit, disable, delete, reset password)
- Check logs with full API transaction history
- Connection diagnostics tool (3-stage: Connectivity, Authentication, DNCR Endpoint)
- CSV export for call logs

---

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌─────────────────────────────┐
│   Frontend   │──────>│   Backend    │──────>│  Etisalat DNCR API          │
│  React/Vite  │ :4001 │  Express     │ :4000 │  apihub.etisalat.ae:9443    │
│              │<──────│              │<──────│                             │
└──────────────┘       └──────┬───────┘       └─────────────────────────────┘
                              │
                              v
                       ┌──────────────┐
                       │    MySQL     │
                       │   Database   │
                       └──────────────┘
```

- **Frontend** (port 4001): React SPA served by Vite dev server
- **Backend** (port 4000): Express API server handling auth, DNCR proxy, and DB operations
- **Vite Proxy**: All `/api` requests from the frontend are proxied to the backend
- **Etisalat API**: OAuth2 Client Credentials flow for authentication, then DNCR check endpoint

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Lucide Icons |
| Backend | Express 5, TypeScript, tsx (runtime) |
| Database | MySQL (via Prisma ORM v5) |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| API Integration | Etisalat DNCR API (OAuth2) |
| Build Tool | Vite 6 |

---

## Project Structure

```
dncr-checker-with-api/
├── server/                         # Backend
│   ├── index.ts                    # Express server entry point
│   ├── seed.ts                     # Database seeder (creates admin user)
│   ├── prisma/
│   │   └── schema.prisma           # Database schema definition
│   ├── middleware/
│   │   ├── auth.ts                 # JWT authentication middleware
│   │   └── roles.ts                # Role-based access middleware
│   └── routes/
│       ├── auth.ts                 # Login & user session endpoints
│       ├── users.ts                # User management CRUD (Admin only)
│       ├── dncr.ts                 # DNCR check proxy + diagnostics
│       └── logs.ts                 # Check logs & API logs endpoints
├── components/                     # React components
│   ├── Login.tsx                   # Login page
│   ├── Dashboard.tsx               # Main DNCR checker interface
│   ├── CallLogs.tsx                # Call verification logs table
│   ├── ApiLogs.tsx                 # API transaction logs (Admin only)
│   ├── UserManagement.tsx          # User CRUD interface (Admin only)
│   ├── Settings.tsx                # Connection diagnostics (Admin only)
│   ├── Sidebar.tsx                 # Navigation sidebar
│   ├── CheckHistory.tsx            # Recent verifications widget
│   ├── StatusBadge.tsx             # Status display component
│   ├── TransactionModal.tsx        # API transaction detail modal
│   └── ConnectionTester.tsx        # 3-stage diagnostics component
├── services/
│   ├── authService.ts              # Frontend auth (login, token management)
│   └── dncrService.ts              # Frontend DNCR API calls
├── types.ts                        # TypeScript type definitions
├── App.tsx                         # Root app component with routing
├── index.html                      # HTML entry point
├── vite.config.ts                  # Vite configuration + proxy
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies & scripts
├── .env                            # Backend environment variables
└── .env.local                      # Frontend environment variables
```

---

## Database Schema

### Users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Employee name |
| email | String (unique) | Email for login |
| password | String | bcrypt hashed password |
| role | Enum: ADMIN / EMPLOYEE | User role |
| isActive | Boolean | Account status |
| createdAt | DateTime | Creation date |
| updatedAt | DateTime | Last update date |

### Check Logs (check_logs)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| phoneNumber | String | Checked phone number |
| status | Enum: ALLOWED / BLOCKED / ERROR | Check result |
| dncrStatus | String | Raw DNCR status from API |
| transactionId | String | Etisalat transaction ID |
| userId | UUID (FK) | User who performed the check |
| createdAt | DateTime | Check timestamp |

### API Logs (api_logs)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| checkLogId | UUID (FK) | Related check log |
| requestUrl | Text | API endpoint URL |
| requestMethod | String | HTTP method |
| requestHeaders | JSON | Request headers |
| requestBody | JSON | Request payload |
| responseStatus | Int | HTTP response code |
| responseBody | JSON | Response payload |
| createdAt | DateTime | Timestamp |

---

## User Roles & Permissions

| Feature | Admin | Employee |
|---------|:-----:|:--------:|
| Dashboard (check numbers) | Yes | Yes |
| Call Verification Logs | Yes | Yes |
| Call Logs - Details column | Yes | No |
| API Logs | Yes | No |
| Settings / Diagnostics | Yes | No |
| User Management | Yes | No |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email/password | No |
| GET | `/api/auth/me` | Get current user info | JWT |

### DNCR
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/dncr/check` | Check phone number against DNCR | JWT |
| POST | `/api/dncr/diagnostics` | Run connection diagnostics | JWT |

### Users (Admin only)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users | JWT + Admin |
| POST | `/api/users` | Create a new user | JWT + Admin |
| PUT | `/api/users/:id` | Update user details | JWT + Admin |
| POST | `/api/users/:id/reset-password` | Reset user password | JWT + Admin |
| PATCH | `/api/users/:id/toggle-active` | Enable/disable user | JWT + Admin |
| DELETE | `/api/users/:id` | Delete user and related data | JWT + Admin |

### Logs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/logs/checks` | Get all check logs | JWT |
| GET | `/api/logs/api` | Get all API logs | JWT + Admin |
| GET | `/api/logs/checks/:id/transactions` | Get API logs for a check | JWT + Admin |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Server health check | No |

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- MySQL database (local or remote)
- Etisalat DNCR API credentials (Client ID & Secret)

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables** (see [Environment Variables](#environment-variables))

3. **Push database schema:**
   ```bash
   npm run db:push
   ```

4. **Seed the admin account:**
   ```bash
   npm run seed
   ```

5. **Start the application:**
   ```bash
   npm run dev:all
   ```

---

## Environment Variables

Create `.env` in the project root:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_jwt_secret_key
ETISALAT_CLIENT_ID=your_etisalat_client_id
ETISALAT_CLIENT_SECRET=your_etisalat_client_secret
```

Create `.env.local` for Vite frontend variables (if needed):

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## Running the Application

### Development (both servers)
```bash
npm run dev:all
```
This starts both the backend (port 4000) and frontend (port 4001) concurrently.

### Backend only
```bash
npm run dev:server
```

### Frontend only
```bash
npm run dev
```

### Production build
```bash
npm run build
```

---

## Default Admin Account

After running the seed command:

| Field | Value |
|-------|-------|
| Email | `admin@dncr.ae` |
| Password | `admin123` |
| Role | ADMIN |

> Change the default password after first login.

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start frontend dev server |
| `dev:server` | `tsx watch server/index.ts` | Start backend with hot reload |
| `dev:all` | `concurrently` | Start both frontend & backend |
| `build` | `vite build` | Production build |
| `seed` | `tsx server/seed.ts` | Seed admin user |
| `db:push` | `prisma db push` | Sync schema to database |

---

## License

Private internal tool. Not for public distribution.

---

Developed by **Mert Sadek**
