import { NextFunction, Request, Response } from 'express';
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

    return res.status(500).json({
        message: 'Internal server error',
    });
}