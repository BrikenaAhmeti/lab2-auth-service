import { NextFunction, Request, Response } from 'express';

export function requireRole(role: string | string[]) {
    const acceptedRoles = Array.isArray(role) ? role : [role];

    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const hasRole = req.user.roles.some((item) => acceptedRoles.includes(item));
        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        return next();
    };
}
