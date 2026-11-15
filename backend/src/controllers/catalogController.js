import * as medicineService from '../services/medicineService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const items = await medicineService.listCategories();
  res.json({ success: true, items });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = await medicineService.createCategory(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const listMedicines = asyncHandler(async (req, res) => {
  const data = await medicineService.listMedicines(req.query, req.user);
  res.json({ success: true, ...data });
});

export const getMedicine = asyncHandler(async (req, res) => {
  const data = await medicineService.getMedicineById(req.params.id, req.user);
  res.json({ success: true, data });
});

export const createMedicine = asyncHandler(async (req, res) => {
  const data = await medicineService.createMedicine(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const updateMedicine = asyncHandler(async (req, res) => {
  const data = await medicineService.updateMedicine(req.params.id, req.body, req.user);
  res.json({ success: true, data });
});
