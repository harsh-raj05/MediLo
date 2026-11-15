# Medilo — Pharmacy Management System (MERN Stack)

A full-stack **Pharmacy Management System** built with **MongoDB, Express, React, and Node.js (MERN)**. Supports end-to-end customer OTC ordering, staff POS counter sales with **FEFO (First-Expiry-First-Out)** batch allocation, expired-batch blocking, supplier purchases (GRN), returns & stock adjustments with mandatory reasons, immutable stock movement & audit trails, printable invoices, and full **Stock Reconciliation** reporting.

> **Demonstration & Safety Notice:** All products, prices, batches, and user credentials in this application are fictional for software engineering demonstration only. This system does not provide medical advice, diagnosis, or clinical prescribing.

---

## Key Features

- **Customer & Staff/Admin End-to-End Journeys:**
  - **Customer Portal (`/store`, `/orders`):** Browse fictional OTC medicines, filter by category/search, place idempotent orders fulfilled automatically via FEFO batch allocation, and view/print itemized invoices. Orders appear immediately in Staff/Admin Sales & Reports.
  - **Pharmacist / Staff Portal (`/dashboard`, `/pos`, `/inventory`, `/purchases`, `/sales`, `/suppliers`, `/reports`, `/audit`):** Receive supplier purchases into distinct batches, run POS sales (FEFO auto-allocation or manual batch pick with expired-batch blocking), process returns & stock adjustments with mandatory reasons, and monitor low-stock & near-expiry alerts.
  - **Admin Portal:** Full catalog, category, supplier, user/role management (`/users`), and system audit log access.
- **Strict Inventory & Concurrency Safeguards:**
  - Stock is always tracked per **Batch** (`medicineId + batchNumber`, `expiryDate`, `purchasePrice`, `salePrice`, `quantityOnHand`).
  - **FEFO allocation** selects the earliest non-expired active batch first and spans multiple batches when needed.
  - **Expired batches are blocked** server-side (`409 BATCH_EXPIRED`) from POS or online sales.
  - **Negative stock is impossible** via schema constraints (`min: 0`), MongoDB transactions (when on replica set), and atomic `$gte` conditional deductions.
  - **`Idempotency-Key` header support** prevents duplicate sales, purchases, returns, and adjustments on network retries.
- **Reports & Auditability:**
  - **Stock Reconciliation Report** verifying `Opening + Purchases + Sale Returns - Sales + Adjustments In - Adjustments Out = Actual Stock On Hand` (`0 Variance`).
  - **Sales & Margin Report**, **Stock Valuation Report**, **Expiry Horizon Report**, **Stock Movement Ledger**, and **System Audit Trail**.

---

## Architecture & Documentation

- [System Architecture & Transaction Flows](docs/ARCHITECTURE.md)
- [Entity-Relationship Diagram & Schema Indexes](docs/ER_DIAGRAM.md)
- [Technical Design Report](docs/TECHNICAL_REPORT.md)
- **Interactive API Docs (Swagger UI):** `http://localhost:5000/api/docs` (OpenAPI JSON at `/api/openapi.json`) when the backend is running.

---

## Project Structure

```text
Medilo/
├── backend/
│   ├── src/
│   │   ├── config/        # Env, MongoDB connection, OpenAPI spec
│   │   ├── controllers/   # Thin HTTP handlers
│   │   ├── middleware/    # JWT auth, RBAC, Zod validation, Idempotency, Error handler
│   │   ├── models/        # 11 Mongoose schemas with constraints & indexes
│   │   ├── routes/        # Versioned REST routes (/api/v1/*)
│   │   ├── seeds/         # Index sync (migrate) & deterministic seed script
│   │   ├── services/      # FEFO, Sales, Purchases, Returns, Reconciliation, Audit
│   │   └── utils/         # AppError, transaction/atomic helper, pagination
│   └── tests/
│       ├── unit/          # Pure unit tests (FEFO allocation & tax rounding)
│       └── integration/   # End-to-end API tests against real MongoDB
├── frontend/
│   └── src/
│       ├── api/           # Fetch wrapper with JWT & Idempotency-Key support
│       ├── components/    # Layout, ProtectedRoute, InvoiceModal (printable), Table UI
│       ├── context/       # AuthContext
│       └── pages/         # Storefront, MyOrders, Dashboard, POS, Inventory, Purchases, Sales, Reports, Audit, Users
└── docs/                  # Architecture, ER Diagram, Technical Report
```

---

## Demo Credentials (Dummy Accounts Only)

Seeded automatically by `npm run seed`:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@medilo.demo` | `DemoPassword123!` | Full catalog, suppliers, users/roles, purchases, POS, returns, reports, audit logs |
| **Pharmacist** | `pharmacist@medilo.demo` | `DemoPassword123!` | Dashboard alerts, POS counter, batches, purchases, returns, adjustments, reports |
| **Customer** | `customer@medilo.demo` | `DemoPassword123!` | OTC Storefront, cart checkout, own order history & printable invoices |

Quick-fill buttons for all three accounts are also available on the `/login` screen.

---

## Local Setup & Run Instructions

### Prerequisites
- **Node.js** `>= 20` (tested on `v22.20.0`)
- **MongoDB** `>= 7.0` (tested on `v8.2.2`) running locally on `127.0.0.1:27017` (or via `docker compose up -d` using `docker-compose.yml`).

### 1. Environment Variables
Copy the example env files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Default `backend/.env` values:
- `PORT=5000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/medilo_pharmacy`
- `JWT_SECRET=replace-with-a-strong-random-32-char-secret`
- `JWT_EXPIRES_IN=8h`
- `CORS_ORIGIN=http://localhost:5173`
- `LOW_STOCK_DEFAULT=15`
- `NEAR_EXPIRY_DAYS=30`

### 2. Install Dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Migration (Index Sync) & Seed
Make sure MongoDB is running, then run:
```bash
cd backend
npm run migrate
npm run seed
```
To wipe and re-seed fresh demo data at any time:
```bash
npm run seed:reset
```

### 4. Start Backend & Frontend
In Terminal 1 (Backend API + Swagger Docs):
```bash
cd backend
npm run dev
```
In Terminal 2 (React Frontend):
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser. Swagger API docs are at **`http://localhost:5000/api/docs`**.

---

## Running Automated Tests

The test suite uses Node's built-in test runner (`node --test`) and `supertest`, spawning an isolated temporary `mongod` instance so it never modifies your development database:

```bash
cd backend
npm test
```

Covered tests include:
1. Unit tests for `computeFefoPlan` (expiry ordering, spanning multiple batches, ignoring expired/quarantined batches) and `calculateLinePricing`.
2. Server-side RBAC enforcement (401/403 checks, OTC-only online checkout enforcement).
3. **Acceptance Test 1:** FEFO sale deduction across batches + `StockMovement` creation + Customer order appearing in Staff Sales view + Idempotency replay protection.
4. **Acceptance Test 2:** Blocking expired batch sales (`409 BATCH_EXPIRED`).
5. **Acceptance Test 3:** Low-stock, near-expiry, and expired batch alerts.
6. **Acceptance Test 4:** Mandatory reason validation on returns/adjustments, negative stock prevention (`409 INSUFFICIENT_STOCK`), over-return prevention (`409 RETURN_EXCEEDS_SOLD`), and audit trail recording.
7. **Acceptance Test 5:** Stock Reconciliation Report verifying `0` variance across opening stock, purchases, sales, returns, and adjustments.

---

## Production Deployment & Cloud Database Setup

Medilo connects to a real MongoDB database via Mongoose with atomic updates and multi-document ACID transactions. For production, connect a free or dedicated **MongoDB Atlas** cluster and deploy the frontend/backend on cloud platforms (e.g. Vercel, Render, Railway).

### 1. Cloud Database (MongoDB Atlas)
1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free M0 cluster and database user (e.g., `medilo_admin`).
3. Under **Network Access**, allow IP `0.0.0.0/0` (or your host's specific IPs).
4. Copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/medilo_pharmacy?retryWrites=true&w=majority
   ```

### 2. Deploy Backend (e.g. Render / Railway)
- **Root Directory:** `backend` (or root if using root scripts)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:**
  ```env
  NODE_ENV=production
  PORT=5000
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/medilo_pharmacy?retryWrites=true&w=majority
  JWT_SECRET=generate-a-secure-random-64-character-string
  JWT_EXPIRES_IN=8h
  CORS_ORIGIN=https://your-frontend.vercel.app
  ```
- **Seed Initial Catalog on Cloud:**
  Run `npm run seed` in the cloud terminal or run it once locally pointing to your Atlas URI.

### 3. Deploy Frontend (e.g. Vercel / Netlify)
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  ```env
  VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1
  ```
- `vercel.json` is pre-configured with SPA route rewrites for client-side navigation.

---

## Known Limitations & Assumptions

- Payment methods (`CASH`, `CARD`, `UPI`, `ONLINE`) are recorded locally without external payment gateway integration.
- Online customer self-checkout is limited to `isOtc: true` fictional items; non-OTC items (`Novacillin Broad 250mg`) require Pharmacist POS handling without prescription upload workflow.
- Local demo runs standalone or Docker replica-set MongoDB; multi-tenant/multi-branch stock transfers are out of scope.
