import * as returnService from '../services/returnService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listReturns = asyncHandler(async (req, res) => {
  const data = await returnService.listReturns(req.query);
  res.json({ success: true, ...data });
});

export const createReturn = asyncHandler(async (req, res) => {
  const data = await returnService.createReturn({ ...req.body, actor: req.user });
  res.status(201).json({ success: true, data });
});
