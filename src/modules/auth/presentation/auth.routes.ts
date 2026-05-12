import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { createRateLimiter } from '../../../shared/middleware/rate-limit';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { requireRole } from '../../../shared/middleware/require-role';

const controller = new AuthController();

export const authRoutes = Router();
const authRateLimit = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many auth requests. Try again in a minute.',
});

authRoutes.post('/register', authRateLimit, async (req, res, next) => {
  try {
    await controller.register(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/login', authRateLimit, async (req, res, next) => {
  try {
    await controller.login(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/refresh', authRateLimit, async (req, res, next) => {
  try {
    await controller.refresh(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/verify-email', authRateLimit, async (req, res, next) => {
  try {
    await controller.verifyEmail(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/resend-verification', authRateLimit, async (req, res, next) => {
  try {
    await controller.resendVerification(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/forgot-password', authRateLimit, async (req, res, next) => {
  try {
    await controller.forgotPassword(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/reset-password', authRateLimit, async (req, res, next) => {
  try {
    await controller.resetPassword(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/logout', async (req, res, next) => {
  try {
    await controller.logout(req, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/me', authMiddleware, requirePermission('users:read', 'own'), async (req, res, next) => {
  try {
    await controller.me(req as any, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/sessions', authMiddleware, requirePermission('users:read', 'own'), async (req, res, next) => {
  try {
    await controller.sessions(req as any, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.post(
  '/change-password',
  authMiddleware,
  requirePermission('users:update', 'own'),
  async (req, res, next) => {
    try {
      await controller.changePassword(req as any, res);
    } catch (error) {
      next(error);
    }
  },
);

authRoutes.delete('/sessions/:id', authMiddleware, requirePermission('users:update', 'own'), async (req, res, next) => {
  try {
    await controller.revokeSession(req as any, res);
  } catch (error) {
    next(error);
  }
});

authRoutes.delete(
  '/admin/sessions/:id',
  authMiddleware,
  requireRole(['Admin', 'Super Admin']),
  requirePermission('users:deactivate', 'all'),
  async (req, res, next) => {
    try {
      await controller.revokeSessionAsAdmin(req as any, res);
    } catch (error) {
      next(error);
    }
  },
);

authRoutes.post(
  '/admin/users',
  authMiddleware,
  requireRole(['Admin', 'Super Admin']),
  requirePermission('users:create', 'all'),
  async (req, res, next) => {
    try {
      await controller.createAdminUser(req, res);
    } catch (error) {
      next(error);
    }
  },
);
