import { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export function createRateLimiter(options: {
    windowMs: number;
    maxRequests: number;
    message?: string;
}) {
    const store = new Map<string, RateLimitEntry>();
    const message = options.message ?? 'Too many requests. Please try again later.';

    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const current = store.get(key);

        if (!current || now >= current.resetAt) {
            store.set(key, {
                count: 1,
                resetAt: now + options.windowMs,
            });
            return next();
        }

        if (current.count >= options.maxRequests) {
            return res.status(429).json({ message });
        }

        current.count += 1;
        store.set(key, current);
        return next();
    };
}
