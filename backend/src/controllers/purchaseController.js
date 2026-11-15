import * as purchaseService from '../services/purchaseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listPurchases = asyncHandler(async (req, res) => {
  const data = await purchaseService.listPurchases(req.query);
  res.json({ success: true, ...data });
});

export const getPurchase = asyncHandler(async (req, res) => {
  const data = await purchaseService.getPurchaseById(req.params.id);
  res.json({ success: true, data });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const data = await purchaseService.createPurchase({ ...req.body, actor: req.user });
  res.status(201).json({ success: true, data });
});
