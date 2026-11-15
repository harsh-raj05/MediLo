export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Medilo Pharmacy Management System API',
    version: '1.0.0',
    description:
      'REST API for Medilo Pharmacy Management System (MERN Stack). Supports role-based access control, batch-level FEFO inventory, purchases, POS & customer online sales, returns, stock adjustments, audit trails, and reconciliation reporting. All products are fictional for demonstration only.',
  },
  servers: [
    { url: '/api/v1', description: 'API v1 Base URL' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'API health check',
        security: [],
        responses: { 200: { description: 'Service healthy' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a customer account',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Customer registered with JWT' }, 409: { description: 'Email exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in and receive JWT token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'pharmacist@medilo.demo' },
                  password: { type: 'string', example: 'DemoPassword123!' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get authenticated user profile', responses: { 200: { description: 'Current user' } } },
    },
    '/auth/users': {
      get: { tags: ['Auth'], summary: 'List users (Admin only)', responses: { 200: { description: 'Paginated users' }, 403: { description: 'Forbidden' } } },
    },
    '/auth/users/{id}': {
      patch: {
        tags: ['Auth'],
        summary: 'Update user role or active state (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated user' } },
      },
    },
    '/catalog/categories': {
      get: { tags: ['Catalog'], summary: 'List active medicine categories', security: [], responses: { 200: { description: 'Categories list' } } },
      post: { tags: ['Catalog'], summary: 'Create category (Admin only)', responses: { 201: { description: 'Category created' } } },
    },
    '/catalog/medicines': {
      get: {
        tags: ['Catalog'],
        summary: 'Search & paginate medicines with aggregated non-expired sellable batch stock',
        security: [],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'stockStatus', in: 'query', schema: { type: 'string', enum: ['low', 'out', 'in_stock', 'near_expiry'] } },
          { name: 'includeBatches', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Paginated medicines' } },
      },
      post: { tags: ['Catalog'], summary: 'Create medicine (Admin only)', responses: { 201: { description: 'Medicine created' } } },
    },
    '/catalog/medicines/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get medicine details and batches (staff sees full batch breakdown)',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Medicine details' } },
      },
      patch: {
        tags: ['Catalog'],
        summary: 'Update medicine (Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Medicine updated' } },
      },
    },
    '/suppliers': {
      get: { tags: ['Suppliers'], summary: 'List suppliers (Admin/Pharmacist)', responses: { 200: { description: 'Paginated suppliers' } } },
      post: { tags: ['Suppliers'], summary: 'Create supplier (Admin only)', responses: { 201: { description: 'Supplier created' } } },
    },
    '/purchases': {
      get: { tags: ['Purchases'], summary: 'List supplier purchase records (Admin/Pharmacist)', responses: { 200: { description: 'Paginated purchases' } } },
      post: {
        tags: ['Purchases'],
        summary: 'Receive stock purchase and create/update batches + stock movements',
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { 201: { description: 'Purchase recorded' }, 400: { description: 'Expired purchase rejected' } },
      },
    },
    '/inventory/batches': {
      get: {
        tags: ['Inventory'],
        summary: 'List inventory batches with expiry and status filters (Admin/Pharmacist)',
        parameters: [
          { name: 'expiryFilter', in: 'query', schema: { type: 'string', enum: ['expired', 'near_expiry', 'sellable'] } },
          { name: 'medicineId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated batches' } },
      },
    },
    '/inventory/alerts': {
      get: { tags: ['Inventory'], summary: 'Get low-stock, near-expiry, and expired batch alerts', responses: { 200: { description: 'Inventory alerts' } } },
    },
    '/inventory/movements': {
      get: { tags: ['Inventory'], summary: 'Get full stock movement ledger', responses: { 200: { description: 'Paginated stock movements' } } },
    },
    '/inventory/adjustments': {
      post: {
        tags: ['Inventory'],
        summary: 'Adjust batch stock with mandatory reason; prevents negative stock',
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { 201: { description: 'Adjustment recorded' }, 409: { description: 'Insufficient stock or expired batch' } },
      },
    },
    '/sales': {
      get: { tags: ['Sales'], summary: 'List sales (staff sees all; customer sees own orders)', responses: { 200: { description: 'Paginated sales' } } },
      post: {
        tags: ['Sales'],
        summary: 'Create POS sale or customer online order using FEFO batch allocation; blocks expired batches',
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { 201: { description: 'Invoice created' }, 409: { description: 'Expired batch or insufficient stock' } },
      },
    },
    '/sales/{id}': {
      get: {
        tags: ['Sales'],
        summary: 'Get printable invoice details by sale ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Invoice details' } },
      },
    },
    '/returns': {
      get: { tags: ['Returns'], summary: 'List sales returns (Admin/Pharmacist)', responses: { 200: { description: 'Paginated returns' } } },
      post: {
        tags: ['Returns'],
        summary: 'Process itemized return with mandatory reason and batch restock/write-off',
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { 201: { description: 'Return recorded' }, 409: { description: 'Return exceeds sold quantity' } },
      },
    },
    '/reports/sales': {
      get: { tags: ['Reports'], summary: 'Sales revenue, tax, COGS, and top medicines report', responses: { 200: { description: 'Sales report' } } },
    },
    '/reports/stock-valuation': {
      get: { tags: ['Reports'], summary: 'Batch & medicine stock valuation report', responses: { 200: { description: 'Valuation report' } } },
    },
    '/reports/expiry': {
      get: { tags: ['Reports'], summary: 'Expiry horizon report (expired, 30d, 60d, 90d)', responses: { 200: { description: 'Expiry report' } } },
    },
    '/reports/stock-reconciliation': {
      get: {
        tags: ['Reports'],
        summary: 'Stock reconciliation report (Opening + Purchases + Returns - Sales + Adjustments = Actual)',
        responses: { 200: { description: 'Reconciliation report' } },
      },
    },
    '/reports/audit-logs': {
      get: { tags: ['Reports'], summary: 'Audit trail log (Admin only)', responses: { 200: { description: 'Paginated audit logs' } } },
    },
  },
};
