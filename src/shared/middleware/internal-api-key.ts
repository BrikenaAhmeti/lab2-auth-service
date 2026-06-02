import { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env';

export function requireInternalApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.header('x-internal-api-key');

    if (!env.internalApiKey || apiKey !== env.internalApiKey) {
        return res.status(401).json({ message: 'Invalid internal API key' });
    }

    return next();
}
