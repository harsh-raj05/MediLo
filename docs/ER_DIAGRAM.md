# Database Schema & Entity-Relationship Diagram

Medilo uses MongoDB with Mongoose schemas, strict validation rules, compound unique constraints, and operational indexes.

## Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ SALE : places_or_processes
    USER ||--o{ PURCHASE : receives
    USER ||--o{ RETURN_RECORD : processes
    USER ||--o{ STOCK_MOVEMENT : performs
    USER ||--o{ AUDIT_LOG : triggers

    CATEGORY ||--o{ MEDICINE : categorizes
    SUPPLIER ||--o{ MEDICINE : primary_supplier
    SUPPLIER ||--o{ PURCHASE : supplies
    SUPPLIER ||--o{ BATCH : supplies

    MEDICINE ||--o{ BATCH : tracked_in
    PURCHASE ||--o{ BATCH : creates_or_replenishes

    SALE ||--o{ RETURN_RECORD : referenced_by
    MEDICINE ||--o{ STOCK_MOVEMENT : tracks
    BATCH ||--o{ STOCK_MOVEMENT : ledger_for

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        enum role "admin | pharmacist | customer"
        boolean isActive
    }

    CATEGORY {
        ObjectId _id PK
        string name UK
        string slug UK
        number defaultTaxRatePct
    }

    SUPPLIER {
        ObjectId _id PK
        string code UK
        string name
        string phone
        number paymentTermsDays
    }

    MEDICINE {
        ObjectId _id PK
        string sku UK
        string name
        string genericName
        ObjectId categoryId FK
        ObjectId primarySupplierId FK
        enum dosageForm
        number reorderLevel
        number taxRatePct
        boolean isOtc
    }

    BATCH {
        ObjectId _id PK
        ObjectId medicineId FK
        ObjectId supplierId FK
        ObjectId purchaseId FK
        string batchNumber "UK with medicineId"
        date expiryDate
        number initialQuantity
        number quantityOnHand "min 0"
        number purchasePrice
        number salePrice
        enum status "active | quarantined | expired | depleted"
    }

    PURCHASE {
        ObjectId _id PK
        string purchaseNumber UK
        ObjectId supplierId FK
        string supplierInvoiceNumber
        date purchaseDate
        array items
        number totalCost
        ObjectId createdBy FK
    }

    SALE {
        ObjectId _id PK
        string invoiceNumber UK
        enum saleType "POS | ONLINE_ORDER"
        ObjectId customerId FK
        array items "includes batch allocations"
        number subtotal
        number taxTotal
        number discountTotal
        number grandTotal
        enum status "COMPLETED | PARTIALLY_RETURNED | RETURNED"
        ObjectId createdBy FK
    }

    RETURN_RECORD {
        ObjectId _id PK
        string returnNumber UK
        ObjectId saleId FK
        string reason "min 5 chars"
        enum condition "RESTOCKABLE | DAMAGED"
        array items
        number totalRefund
        ObjectId processedBy FK
    }

    STOCK_MOVEMENT {
        ObjectId _id PK
        ObjectId medicineId FK
        ObjectId batchId FK
        enum movementType "OPENING | PURCHASE | SALE | SALE_RETURN | ADJUSTMENT_IN | ADJUSTMENT_OUT"
        number quantityDelta
        number balanceBefore
        number balanceAfter
        string referenceCode
        string reason
        ObjectId performedBy FK
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId actorId FK
        string actorRole
        string action
        string entityType
        string summary
        mixed metadata
    }
```

## Key Constraints & Indexes

- **`Batch`**:
  - Compound unique index `{ medicineId: 1, batchNumber: 1 }` prevents duplicate batch records for the same medicine.
  - Compound FEFO lookup index `{ medicineId: 1, status: 1, expiryDate: 1, quantityOnHand: 1 }`.
  - Schema constraint `quantityOnHand: { min: 0 }` plus atomic `$gte` filter on deductions guarantees stock never silently becomes negative.
- **`IdempotencyKey`**:
  - Unique compound index `{ key: 1, userId: 1, route: 1 }` with 24-hour TTL (`expires: 86400`).
- **`StockMovement`**:
  - Indexed on `{ medicineId: 1, createdAt: 1 }` and `{ createdAt: -1 }` for fast reconciliation and audit queries.
