import * as inventoryService from '../services/inventoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listBatches = asyncHandler(async (req, res) => {
  const data = await inventoryService.listBatches(req.query);
  res.json({ success: true, ...data });
});

export const getAlerts = asyncHandler(async (req, res) => {
  const days = req.query.nearExpiryDays ? Number(req.query.nearExpiryDays) : undefined;
  const data = await inventoryService.getInventoryAlerts(days);
  res.json({ success: true, data });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const data = await inventoryService.adjustBatchStock({ ...req.body, actor: req.user });
  res.status(201).json({ success: true, data });
});

export const listMovements = asyncHandler(async (req, res) => {
  const data = await inventoryService.listStockMovements(req.query);
  res.json({ success: true, ...data });
});
