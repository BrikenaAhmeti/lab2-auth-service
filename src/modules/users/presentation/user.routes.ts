import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new UserController();

export const userRoutes = Router();

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
