import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../core/errors/app-error';

export function errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }

    if (error instanceof ZodError) {
        return res.status(400).json({
            message: 'Validation error',
            issues: error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    return res.status(500).json({
        message: 'Internal server error',
    });
}
