import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requireInternalApiKey } from '../../../shared/middleware/internal-api-key';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new UserController();

export const userRoutes = Router();
export const internalUserRoutes = Router();

internalUserRoutes.post('/profiles', requireInternalApiKey, async (req, res, next) => {
    try {
        await controller.internalProfiles(req, res);
    } catch (error) {
        next(error);
    }
});

userRoutes.get('/doctors', authMiddleware, async (req, res, next) => {
    try {
        await controller.getDoctors(req, res);
    } catch (error) {
        next(error);
    }
});

userRoutes.get('/me', authMiddleware, requirePermission('users:read', 'own'), async (req, res, next) => {
    try {
        await controller.me(req, res);
    } catch (error) {
        next(error);
    }
});

userRoutes.patch('/me', authMiddleware, requirePermission('users:update', 'own'), async (req, res, next) => {
    try {
        await controller.updateMe(req, res);
    } catch (error) {
        next(error);
    }
});
