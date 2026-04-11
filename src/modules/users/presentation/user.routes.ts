import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';

const controller = new UserController();

export const userRoutes = Router();

userRoutes.get('/me', authMiddleware, async (req, res, next) => {
    try {
        await controller.me(req, res);
    } catch (error) {
        next(error);
    }
});

userRoutes.patch('/me', authMiddleware, async (req, res, next) => {
    try {
        await controller.updateMe(req, res);
    } catch (error) {
        next(error);
    }
});