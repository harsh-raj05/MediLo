import * as saleService from '../services/saleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSales = asyncHandler(async (req, res) => {
  const data = await saleService.listSales(req.query, req.user);
  res.json({ success: true, ...data });
});

export const getSale = asyncHandler(async (req, res) => {
  const data = await saleService.getSaleById(req.params.id, req.user);
  res.json({ success: true, data });
});

export const createSale = asyncHandler(async (req, res) => {
  const data = await saleService.createSale({ ...req.body, actor: req.user });
  res.status(201).json({ success: true, data });
});
