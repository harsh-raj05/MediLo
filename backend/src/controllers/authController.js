import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const data = await authService.registerCustomer(req.body);
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginUser(req.body);
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user._id);
  res.json({ success: true, data });
});

export const listUsers = asyncHandler(async (req, res) => {
  const data = await authService.listUsers(req.query);
  res.json({ success: true, ...data });
});

export const updateUserAccess = asyncHandler(async (req, res) => {
  const data = await authService.updateUserAccess({
    targetUserId: req.params.id,
    role: req.body.role,
    isActive: req.body.isActive,
    actor: req.user,
  });
  res.json({ success: true, data });
});
