# System Architecture

Medilo follows a **3-tier Modular Monolith** architecture using the **MERN** stack (MongoDB, Express, React, Node.js), separating UI presentation, HTTP transport/validation, domain business logic, and persistence.

```mermaid
flowchart LR
    subgraph Client ["React + Vite SPA (frontend/)"]
        CustomerUI["Customer Portal\n(Storefront, Cart, My Orders)"]
        StaffUI["Staff / Admin Portal\n(Dashboard, POS, Batches, Purchases, Reports, Audit)"]
        InvoicePrint["Printable Invoice View"]
    end

    subgraph API ["Express Modular Monolith (backend/src/)"]
        Middleware["Auth (JWT) + RBAC + Zod Validation + Idempotency"]
        Controllers["REST Controllers (/api/v1/*)"]
        Services["Domain Services\n(FEFO, Sales, Purchases, Returns, Reconciliation, Audit)"]
        Swagger["OpenAPI / Swagger UI (/api/docs)"]
    end

    subgraph DB ["MongoDB"]
        Collections["Users, Categories, Suppliers, Medicines,\nBatches, Purchases, Sales, Returns,\nStockMovements, AuditLogs, IdempotencyKeys"]
    end

    CustomerUI --> Middleware
    StaffUI --> Middleware
    Middleware --> Controllers --> Services --> Collections
```

## Critical Transaction & Concurrency Flow (Sale Checkout)

```mermaid
sequenceDiagram
    participant UI as Frontend (POS / Storefront)
    participant Idem as Idempotency Middleware
    participant SaleSvc as Sale Service
    participant DB as MongoDB (Batch & StockMovement)

    UI->>Idem: POST /api/v1/sales (Idempotency-Key + JWT)
    Idem->>DB: Check existing key + payload hash
    alt Replayed request with same payload
        Idem-->>UI: Return cached 201 Invoice (X-Idempotency-Replayed: true)
    else New request
        Idem->>SaleSvc: Validate OTC/role rules & compute FEFO plan
        SaleSvc->>DB: Atomic Batch update { quantityOnHand: {$gte: qty}, expiryDate: {$gt: now}, status: 'active' }
        alt Expired or insufficient stock
            DB-->>SaleSvc: No matching batch updated
            SaleSvc-->>UI: 409 Conflict (BATCH_EXPIRED / INSUFFICIENT_STOCK)
        else Success
            SaleSvc->>DB: Create Sale + StockMovement(SALE) + AuditLog
            SaleSvc-->>Idem: 201 Created Invoice
            Idem-->>UI: Save key & return 201 Invoice
        end
    end
```
