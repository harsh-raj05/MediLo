import { AppError } from '../utils/AppError.js';

/**
 * Server-side Role-Based Access Control middleware.
 * Never rely solely on hiding buttons in the UI.
 */
export const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError(
        403,
        'FORBIDDEN',
        `Access denied for role '${req.user.role}'. Required: ${allowedRoles.join(', ')}`
      )
    );
  }
  return next();
};
