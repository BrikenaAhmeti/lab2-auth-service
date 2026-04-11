import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new DepartmentController();

export const departmentRoutes = Router();

departmentRoutes.post(
  '/',
  authMiddleware,
  requirePermission('departments:manage', 'all'),
  (req, res) => controller.create(req as any, res),
);
departmentRoutes.get(
  '/:id',
  authMiddleware,
  requirePermission('departments:read'),
  (req, res) => controller.getById(req as any, res),
);
