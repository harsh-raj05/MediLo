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

- Payment methods (`CASH`, `CARD`, `UPI`, `ONLINE`) are recorded locally without external payment gateway integration.
- Online customer self-checkout is limited to `isOtc: true` fictional items; non-OTC items (`Novacillin Broad 250mg`) require Pharmacist POS handling without prescription upload workflow.
- Local demo runs standalone or Docker replica-set MongoDB; multi-tenant/multi-branch stock transfers are out of scope.
