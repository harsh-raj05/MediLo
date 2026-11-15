# Technical Report — Medilo Pharmacy Management System

**Domain:** Pharmacy Management System (MERN Stack)  
**Author:** Medilo Engineering Submission  

---

## 1. Architectural Decisions

### Modular Monolith with Clear Layer Separation
The backend (`backend/src/`) is organized into:
- **`routes/` & `middleware/`**: Express routing, JWT authentication (`auth.js`), server-side role checks (`rbac.js`), Zod payload validation (`validate.js`), and duplicate-request protection (`idempotency.js`).
- **`controllers/`**: Thin HTTP adapters delegating to services.
- **`services/`**: Pure and database-backed domain logic (`inventoryService`, `saleService`, `purchaseService`, `returnService`, `reportService`, `auditService`, `medicineService`, `authService`).
- **`models/`**: Mongoose schemas with constraints, validators, and operational indexes.

This keeps domain rules (FEFO allocation, tax computation, reconciliation) decoupled from HTTP transport and UI components, making them easy to unit-test and reason about.

---

## 2. Batch Inventory & FEFO Design

Rather than storing a single undifferentiated `stockQuantity` on `Medicine`, every unit of stock lives in a `Batch` document keyed by `(medicineId, batchNumber)` with its own `expiryDate`, `purchasePrice`, `salePrice`, `quantityOnHand`, and `status`.

- **FEFO Allocation (`computeFefoPlan`)**: Filters batches where `status === 'active'`, `quantityOnHand > 0`, and `expiryDate > now`, sorted ascending by `(expiryDate, receivedAt)`. If a single batch cannot fulfill the requested quantity, the sale spans multiple batches and stores exact per-batch allocations inside `Sale.items[].allocations`.
- **Expired Batch Blocking**: Even when a pharmacist manually selects a specific `batchId` at the POS counter, `saleService` rejects any batch where `expiryDate <= now` or `status === 'expired'` with HTTP `409 Conflict` (`BATCH_EXPIRED`).

---

## 3. Concurrency, Transactions & Negative Stock Prevention

Critical mutations (`POST /sales`, `POST /purchases`, `POST /returns`, `POST /inventory/adjustments`) are protected by three layers:
1. **Transaction / Atomic Execution (`utils/tx.js`)**: Uses `session.withTransaction` when connected to a MongoDB replica set / `mongos`. When running on a standalone local `mongod` without a replica set, it falls back seamlessly to **atomic conditional updates** (`Batch.findOneAndUpdate({ _id, quantityOnHand: { $gte: qty }, expiryDate: { $gt: now }, status: 'active' }, { $inc: { quantityOnHand: -qty } })`) with compensating rollback if a multi-line checkout fails partway through.
2. **Idempotency (`middleware/idempotency.js`)**: Clients send an `Idempotency-Key` header on checkout, purchase, return, and adjustment submissions. Re-submitting the same payload replays the original invoice/response without double-deducting stock; reusing a key with a different payload returns `409 IDEMPOTENCY_CONFLICT`.
3. **Database Schema Guards**: `quantityOnHand` has `min: 0` at the Mongoose schema level.

---

## 4. Stock Reconciliation & Auditability

Every operation that changes stock writes an immutable `StockMovement` record (`OPENING`, `PURCHASE`, `SALE`, `SALE_RETURN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`) capturing `balanceBefore`, `balanceAfter`, `referenceCode`, `reason`, and `performedBy`.

- **Damaged Returns**: When a return is marked `DAMAGED`, the system records `SALE_RETURN (+qty)` followed immediately by `ADJUSTMENT_OUT (-qty)` so sellable `Batch.quantityOnHand` does not increase while the movement ledger remains 100% mathematically balanced.
- **Reconciliation Invariant**:
  $$\text{Expected Closing} = \text{Opening} + \text{Purchases} + \text{Sale Returns} - \text{Sales} + \text{Adjustments In} - \text{Adjustments Out}$$
  `GET /api/v1/reports/stock-reconciliation` verifies that `Actual Stock On Hand - Expected Closing == 0` across all products.

---

## 5. Security & Role-Based Access Control (RBAC)

- Passwords are hashed using `bcryptjs` (salt rounds: 10), and `passwordHash` is excluded from default Mongoose projections (`select: false`).
- Every protected route enforces `authenticate` (JWT verification + `isActive` user check) and `authorize(...roles)` server-side.
- Customer self-registration (`POST /auth/register`) hardcodes `role: 'customer'` to prevent privilege escalation.
- Customers can only view active OTC products, place `ONLINE_ORDER` checkouts (blocking non-OTC items with `403 OTC_ONLY_ONLINE`), and view only their own invoices.

---

## 6. Known Limitations & Future Improvements

1. **No Prescription File Upload / Pharmacist Approval Queue**: Non-OTC items are restricted to POS counter sales by staff rather than having an online prescription upload and verification workflow.
2. **Payment Gateway Simulation**: Payment methods (`CASH`, `CARD`, `UPI`, `ONLINE`) are recorded locally without an external payment processor (per no-paid-external-services rule).
3. **Single-Store Currency & Timezone**: Configured for single-branch USD (`$`) demonstration; multi-branch transfers and multi-currency tax regimes are out of scope.
