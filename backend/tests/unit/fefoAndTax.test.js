import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateLinePricing, computeFefoPlan, roundMoney } from '../../src/services/inventoryService.js';

describe('FEFO Allocation & Tax Pricing Unit Tests', () => {
  const now = new Date('2026-11-12T00:00:00Z');

  it('allocates from earliest non-expired active batch first and ignores expired/quarantined batches', () => {
    const batches = [
      { _id: 'exp', batchNumber: 'B-EXP', expiryDate: new Date('2026-11-01T00:00:00Z'), quantityOnHand: 50, status: 'active' },
      { _id: 'quar', batchNumber: 'B-QUAR', expiryDate: new Date('2026-11-20T00:00:00Z'), quantityOnHand: 30, status: 'quarantined' },
      { _id: 'later', batchNumber: 'B-LATER', expiryDate: new Date('2027-06-01T00:00:00Z'), quantityOnHand: 40, status: 'active' },
      { _id: 'soon', batchNumber: 'B-SOON', expiryDate: new Date('2026-12-01T00:00:00Z'), quantityOnHand: 10, status: 'active' },
    ];

    const plan = computeFefoPlan(batches, 18, now);
    assert.equal(plan.remainingUnfulfilled, 0);
    assert.equal(plan.totalAvailable, 50);
    assert.equal(plan.allocated.length, 2);
    assert.equal(plan.allocated[0].batch.batchNumber, 'B-SOON');
    assert.equal(plan.allocated[0].quantity, 10);
    assert.equal(plan.allocated[1].batch.batchNumber, 'B-LATER');
    assert.equal(plan.allocated[1].quantity, 8);
  });

  it('reports remainingUnfulfilled when requested quantity exceeds non-expired stock', () => {
    const batches = [
      { _id: 'b1', batchNumber: 'B-1', expiryDate: new Date('2027-01-01T00:00:00Z'), quantityOnHand: 5, status: 'active' },
      { _id: 'b2', batchNumber: 'B-EXP', expiryDate: new Date('2026-10-01T00:00:00Z'), quantityOnHand: 100, status: 'active' },
    ];

    const plan = computeFefoPlan(batches, 12, now);
    assert.equal(plan.totalAvailable, 5);
    assert.equal(plan.remainingUnfulfilled, 7);
    assert.equal(plan.allocated[0].quantity, 5);
  });

  it('calculates line subtotal, tax, and total with accurate currency rounding', () => {
    const res = calculateLinePricing(3, 5.5, 5);
    assert.equal(res.lineSubtotal, 16.5);
    assert.equal(res.lineTax, 0.83);
    assert.equal(res.lineTotal, 17.33);
    assert.equal(roundMoney(1.005), 1.01);
  });
});
