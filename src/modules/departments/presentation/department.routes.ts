import { Router } from 'express';
import { DepartmentController } from './department.controller';

const controller = new DepartmentController();

export const departmentRoutes = Router();

departmentRoutes.post('/', (req, res) => controller.create(req, res));
departmentRoutes.get('/:id', (req, res) => controller.getById(req, res));