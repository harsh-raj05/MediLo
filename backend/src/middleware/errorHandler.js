import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

export const errorHandler = (err, _req, res, _next) => {
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `Duplicate value for ${fields.join(', ') || 'unique field'}`,
        details: err.keyValue,
      },
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid identifier for ${err.path}`,
      },
    });
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Database schema validation failed',
        details,
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode >= 500 && env.nodeEnv === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'An unexpected error occurred';

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
};
