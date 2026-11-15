import crypto from 'node:crypto';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { AppError } from '../utils/AppError.js';

const hashPayload = (body) =>
  crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');

/**
 * Protects critical write endpoints (sales, purchases, returns, adjustments)
 * against duplicate submissions via the `Idempotency-Key` request header.
 */
export const enforceIdempotency = async (req, res, next) => {
  try {
    const rawKey = req.headers['idempotency-key'];
    if (!rawKey) {
      return next();
    }
    const key = String(rawKey).trim();
    if (!key || key.length > 128) {
      return next(new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 1-128 chars'));
    }
    if (!req.user?._id) {
      return next();
    }

    const route = `${req.baseUrl}${req.path}`;
    const requestHash = hashPayload(req.body);

    const existing = await IdempotencyKey.findOne({
      key,
      userId: req.user._id,
      route,
    }).lean();

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return next(
          new AppError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This Idempotency-Key was already used with a different request payload'
          )
        );
      }
      res.setHeader('X-Idempotency-Replayed', 'true');
      return res.status(existing.statusCode).json(existing.responseBody);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyKey.create({
          key,
          userId: req.user._id,
          route,
          requestHash,
          statusCode: res.statusCode,
          responseBody: body,
        }).catch(() => {
          // Ignore duplicate race errors on idempotency persistence
        });
      }
      return originalJson(body);
    };

    return next();
  } catch (err) {
    return next(err);
  }
};
