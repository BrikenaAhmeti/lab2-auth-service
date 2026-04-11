import { NextFunction, Request, Response } from 'express';
import { JwtService } from '../services/jwt.service';

const jwtService = new JwtService();

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Unauthorized',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwtService.verifyAccessToken(token);

        req.user = {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
        };

        next();
    } catch {
        return res.status(401).json({
            message: 'Invalid or expired token',
        });
    }
}