import * as medicineService from '../services/medicineService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSuppliers = asyncHandler(async (req, res) => {
  const data = await medicineService.listSuppliers(req.query);
  res.json({ success: true, ...data });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const data = await medicineService.createSupplier(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const data = await medicineService.updateSupplier(req.params.id, req.body, req.user);
  res.json({ success: true, data });
});
