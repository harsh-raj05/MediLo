import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { recordAudit } from './auditService.js';

const sanitizeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

export const registerCustomer = async ({ name, email, password, phone = '' }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
    phone: phone.trim(),
  });

  await recordAudit({
    actor: user,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user._id,
    summary: `Customer registered: ${user.email}`,
  });

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new AppError(403, 'USER_INACTIVE', 'Account is deactivated. Contact an administrator.');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  await recordAudit({
    actor: user,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id,
    summary: `${user.role} logged in: ${user.email}`,
  });

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return sanitizeUser(user);
};

export const listUsers = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: rows.map(sanitizeUser),
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export const updateUserAccess = async ({ targetUserId, role, isActive, actor }) => {
  const target = await User.findById(targetUserId);
  if (!target) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (String(target._id) === String(actor._id) && (isActive === false || (role && role !== 'admin'))) {
    throw new AppError(400, 'SELF_LOCKOUT', 'Administrators cannot deactivate or demote their own account');
  }

  const previous = { role: target.role, isActive: target.isActive };
  if (role !== undefined) target.role = role;
  if (isActive !== undefined) target.isActive = isActive;
  await target.save();

  await recordAudit({
    actor,
    action: 'USER_ACCESS_UPDATED',
    entityType: 'User',
    entityId: target._id,
    summary: `Updated user ${target.email}: role=${target.role}, isActive=${target.isActive}`,
    metadata: { previous, updated: { role: target.role, isActive: target.isActive } },
  });

  return sanitizeUser(target);
};
