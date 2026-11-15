import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { Batch } from '../../src/models/Batch.js';
import { Medicine } from '../../src/models/Medicine.js';
import { StockMovement } from '../../src/models/StockMovement.js';
import { DEMO_PASSWORD, seedDatabase } from '../../src/seeds/seedData.js';

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

const waitForPort = (port, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      const socket = net.createConnection(port, '127.0.0.1');
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for mongod on port ${port}`));
        } else {
          setTimeout(attempt, 150);
        }
      });
    };
    attempt();
  });

const findMongodBinary = () => {
  const winDefault = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
  if (fs.existsSync(winDefault)) return winDefault;
  return 'mongod';
};

describe('Medilo Pharmacy Management System — End-to-End API Integration Tests', () => {
  let mongodProc;
  let tmpDbPath;
  let app;

  let adminToken;
  let pharmacistToken;
  let customerToken;

  before(async () => {
    const port = await getFreePort();
    tmpDbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'medilo-test-db-'));
    const mongodBin = findMongodBinary();

    mongodProc = spawn(mongodBin, ['--dbpath', tmpDbPath, '--port', String(port), '--bind_ip', '127.0.0.1'], {
      stdio: 'ignore',
    });

    await waitForPort(port);
    await connectDB(`mongodb://127.0.0.1:${port}/medilo_test`);
    app = createApp();
  });

  after(async () => {
    await disconnectDB();
    if (mongodProc) {
      await new Promise((resolve) => {
        mongodProc.once('exit', resolve);
        mongodProc.kill();
        setTimeout(resolve, 3000);
      });
    }
    if (tmpDbPath && fs.existsSync(tmpDbPath)) {
      fs.rmSync(tmpDbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });

  beforeEach(async () => {
    await seedDatabase({ reset: true });

    const [adminRes, pharmRes, custRes] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'admin@medilo.demo', password: DEMO_PASSWORD }),
      request(app).post('/api/v1/auth/login').send({ email: 'pharmacist@medilo.demo', password: DEMO_PASSWORD }),
      request(app).post('/api/v1/auth/login').send({ email: 'customer@medilo.demo', password: DEMO_PASSWORD }),
    ]);

    adminToken = adminRes.body.data.token;
    pharmacistToken = pharmRes.body.data.token;
    customerToken = custRes.body.data.token;
  });

  it('enforces server-side RBAC: blocks customers from staff endpoints and prevents non-OTC online checkout', async () => {
    const unauth = await request(app).get('/api/v1/inventory/batches');
    assert.equal(unauth.status, 401);

    const custBatches = await request(app)
      .get('/api/v1/inventory/batches')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(custBatches.status, 403);

    const custReports = await request(app)
      .get('/api/v1/reports/stock-reconciliation')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(custReports.status, 403);

    const pharmAudit = await request(app)
      .get('/api/v1/reports/audit-logs')
      .set('Authorization', `Bearer ${pharmacistToken}`);
    assert.equal(pharmAudit.status, 403);

    // Customer cannot buy POS-only antimicrobial online
    const rxMed = await Medicine.findOne({ sku: 'MED-NVC-250' }).lean();
    const rxOrder = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ medicineId: String(rxMed._id), quantity: 1 }] });
    assert.equal(rxOrder.status, 403);
    assert.equal(rxOrder.body.error.code, 'OTC_ONLY_ONLINE');
  });

  it('Acceptance Test 1 & Customer->Staff Journey: FEFO deducts from earliest batch first, spans batches, records StockMovement, and appears in staff sales', async () => {
    const medCalm = await Medicine.findOne({ sku: 'MED-CALM-500' }).lean();
    const batchA1Before = await Batch.findOne({ medicineId: medCalm._id, batchNumber: 'MC-2026-A1' }).lean();
    const batchB2Before = await Batch.findOne({ medicineId: medCalm._id, batchNumber: 'MC-2027-B2' }).lean();

    // Seeded sample sale took 4 units from MC-2026-A1 (25 -> 21 remaining).
    assert.equal(batchA1Before.quantityOnHand, 21);

    // Customer places online order for 25 units -> should take all 21 from MC-2026-A1 and 4 from MC-2027-B2
    const orderRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'order-fefo-test-001')
      .send({
        items: [{ medicineId: String(medCalm._id), quantity: 25 }],
        notes: 'Customer FEFO verification order',
      });

    assert.equal(orderRes.status, 201);
    const sale = orderRes.body.data;
    assert.equal(sale.saleType, 'ONLINE_ORDER');
    assert.equal(sale.items[0].allocations.length, 2);
    assert.equal(sale.items[0].allocations[0].batchNumber, 'MC-2026-A1');
    assert.equal(sale.items[0].allocations[0].quantity, 21);
    assert.equal(sale.items[0].allocations[1].batchNumber, 'MC-2027-B2');
    assert.equal(sale.items[0].allocations[1].quantity, 4);

    const batchA1After = await Batch.findById(batchA1Before._id).lean();
    const batchB2After = await Batch.findById(batchB2Before._id).lean();
    assert.equal(batchA1After.quantityOnHand, 0);
    assert.equal(batchA1After.status, 'depleted');
    assert.equal(batchB2After.quantityOnHand, batchB2Before.quantityOnHand - 4);

    const movements = await StockMovement.find({ referenceCode: sale.invoiceNumber }).lean();
    assert.equal(movements.length, 2);
    assert.equal(movements.reduce((s, m) => s + m.quantityDelta, 0), -25);

    // Verify staff can see this customer's online order in staff sales view
    const staffSales = await request(app)
      .get(`/api/v1/sales?search=${sale.invoiceNumber}`)
      .set('Authorization', `Bearer ${pharmacistToken}`);
    assert.equal(staffSales.status, 200);
    assert.equal(staffSales.body.items.length, 1);
    assert.equal(staffSales.body.items[0].invoiceNumber, sale.invoiceNumber);

    // Verify idempotent replay does NOT double-deduct stock
    const replayRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', 'order-fefo-test-001')
      .send({
        items: [{ medicineId: String(medCalm._id), quantity: 25 }],
        notes: 'Customer FEFO verification order',
      });
    assert.equal(replayRes.status, 201);
    assert.equal(replayRes.headers['x-idempotency-replayed'], 'true');
    assert.equal(replayRes.body.data.invoiceNumber, sale.invoiceNumber);
    const batchB2Still = await Batch.findById(batchB2Before._id).lean();
    assert.equal(batchB2Still.quantityOnHand, batchB2Before.quantityOnHand - 4);
  });

  it('Acceptance Test 2: blocks selling an expired batch', async () => {
    const allerMed = await Medicine.findOne({ sku: 'MED-ALR-10' }).lean();
    const expiredBatch = await Batch.findOne({ medicineId: allerMed._id, batchNumber: 'AS-EXP-001' }).lean();

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        customerName: 'POS Test',
        paymentMethod: 'CASH',
        items: [
          {
            medicineId: String(allerMed._id),
            batchId: String(expiredBatch._id),
            quantity: 2,
          },
        ],
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'BATCH_EXPIRED');

    // Confirm expired batch quantity was untouched
    const batchAfter = await Batch.findById(expiredBatch._id).lean();
    assert.equal(batchAfter.quantityOnHand, expiredBatch.quantityOnHand);
  });

  it('Acceptance Test 3: warns about low-stock and near-expiry batches', async () => {
    const res = await request(app)
      .get('/api/v1/inventory/alerts?nearExpiryDays=30')
      .set('Authorization', `Bearer ${pharmacistToken}`);

    assert.equal(res.status, 200);
    const alerts = res.body.data;
    assert.ok(alerts.lowStockMedicines.some((m) => m.sku === 'MED-RESP-100'));
    assert.ok(alerts.lowStockMedicines.some((m) => m.sku === 'MED-GAS-20'));
    assert.ok(alerts.nearExpiryBatches.some((b) => b.batchNumber === 'MC-2026-A1'));
    assert.ok(alerts.expiredBatches.some((b) => b.batchNumber === 'AS-EXP-001'));
  });

  it('Acceptance Test 4: returns & adjustments require reason, block negative stock & over-returns, and are auditable', async () => {
    const respMed = await Medicine.findOne({ sku: 'MED-RESP-100' }).lean();
    const respBatch = await Batch.findOne({ medicineId: respMed._id }).lean();

    // Missing/short reason rejected
    const noReasonAdj = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: String(respBatch._id),
        delta: -1,
        adjustmentType: 'DAMAGE',
        reason: 'bad',
      });
    assert.equal(noReasonAdj.status, 400);

    // Negative stock prevented (respBatch has 8 units, attempt -20)
    const overDeduct = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: String(respBatch._id),
        delta: -20,
        adjustmentType: 'DAMAGE',
        reason: 'Broken bottles during shelf inspection',
      });
    assert.equal(overDeduct.status, 409);
    assert.equal(overDeduct.body.error.code, 'INSUFFICIENT_STOCK');

    // Valid negative adjustment (-2 units)
    const validAdj = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        batchId: String(respBatch._id),
        delta: -2,
        adjustmentType: 'DAMAGE',
        reason: 'Two syrup bottles cracked in storage',
      });
    assert.equal(validAdj.status, 201);
    assert.equal(validAdj.body.data.batch.quantityOnHand, 6);

    // Sale + Return test
    const saleRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        customerName: 'Return Demo',
        paymentMethod: 'CASH',
        items: [{ medicineId: String(respMed._id), quantity: 3 }],
      });
    assert.equal(saleRes.status, 201);
    const sale = saleRes.body.data;

    // Return > sold blocked
    const overReturn = await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        saleId: sale._id,
        reason: 'Customer returned unopened bottles',
        condition: 'RESTOCKABLE',
        items: [{ medicineId: String(respMed._id), batchId: String(respBatch._id), quantity: 5 }],
      });
    assert.equal(overReturn.status, 409);
    assert.equal(overReturn.body.error.code, 'RETURN_EXCEEDS_SOLD');

    // Valid return of 2 units
    const validReturn = await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        saleId: sale._id,
        reason: 'Customer bought extra quantity by mistake',
        condition: 'RESTOCKABLE',
        items: [{ medicineId: String(respMed._id), batchId: String(respBatch._id), quantity: 2 }],
      });
    assert.equal(validReturn.status, 201);

    const finalBatch = await Batch.findById(respBatch._id).lean();
    assert.equal(finalBatch.quantityOnHand, 5); // 8 - 2 (adj) - 3 (sale) + 2 (return) = 5

    // Verify audit trail recorded both adjustment and return
    const auditRes = await request(app)
      .get('/api/v1/reports/audit-logs?limit=20')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditRes.status, 200);
    const actions = auditRes.body.items.map((a) => a.action);
    assert.ok(actions.includes('STOCK_ADJUSTED'));
    assert.ok(actions.includes('SALE_RETURN_PROCESSED'));
  });

  it('Acceptance Test 5: Stock Reconciliation Report reconciles opening + purchases + returns - sales + adjustments with 0 variance', async () => {
    // Perform a purchase, a sale, a return, and a stock adjustment before checking reconciliation
    const medVita = await Medicine.findOne({ sku: 'MED-VIT-D3' }).lean();
    const suppliersRes = await request(app)
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${pharmacistToken}`);
    const supplierId = suppliersRes.body.items[0]._id;

    const purchaseRes = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({
        supplierId,
        supplierInvoiceNumber: 'SUP-INV-7788',
        items: [
          {
            medicineId: String(medVita._id),
            batchNumber: 'VB-2028-NEW',
            expiryDate: '2028-06-30',
            quantity: 30,
            unitCost: 6.8,
            salePrice: 12.0,
          },
        ],
      });
    assert.equal(purchaseRes.status, 201);

    const reconRes = await request(app)
      .get('/api/v1/reports/stock-reconciliation')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(reconRes.status, 200);
    const report = reconRes.body.data;
    assert.equal(report.reconciled, true);
    assert.equal(report.totals.variance, 0);
    assert.ok(report.totals.purchases >= 30);
    assert.ok(report.totals.sales >= 5);

    for (const row of report.items) {
      assert.equal(row.variance, 0, `Variance should be 0 for ${row.sku}`);
      assert.equal(
        row.expectedClosingStock,
        row.openingStock + row.purchases + row.saleReturns - row.sales + row.adjustmentsIn - row.adjustmentsOut
      );
    }
  });
});
