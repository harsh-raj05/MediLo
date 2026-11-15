import * as auditService from '../services/auditService.js';
import * as reportService from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const salesReport = asyncHandler(async (req, res) => {
  const data = await reportService.getSalesReport(req.query);
  res.json({ success: true, data });
});

export const stockValuationReport = asyncHandler(async (_req, res) => {
  const data = await reportService.getStockValuationReport();
  res.json({ success: true, data });
});

export const expiryReport = async (req, res, next) => {
  try {
    const days = req.query.nearExpiryDays ? Number(req.query.nearExpiryDays) : undefined;
    const data = await reportService.getExpiryReport(days);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const stockReconciliationReport = asyncHandler(async (req, res) => {
  const data = await reportService.getStockReconciliationReport(req.query);
  res.json({ success: true, data });
});

export const auditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.listAuditLogs(req.query);
  res.json({ success: true, ...data });
});
