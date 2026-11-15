import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is missing');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
    }

    const user = await User.findById(decoded.sub).lean();
    if (!user || !user.isActive) {
      throw new AppError(401, 'USER_INACTIVE', 'User account is inactive or no longer exists');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.slice(7).trim();
    if (!token) return next();
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.sub).lean();
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};
