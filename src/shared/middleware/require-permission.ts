import { NextFunction, Request, Response } from 'express';

type PermissionScope = 'own' | 'department' | 'all';

function allowedScopes(requiredScope: PermissionScope): PermissionScope[] {
    if (requiredScope === 'all') return ['all'];
    if (requiredScope === 'department') return ['department', 'all'];
    return ['own', 'department', 'all'];
}

export function requirePermission(permission: string, scope?: PermissionScope) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const permissions = req.user.permissions ?? [];

        const hasPermission = scope
            ? allowedScopes(scope).some((allowedScope) =>
                permissions.includes(`${permission}:${allowedScope}`),
            )
            : permissions.includes(permission) ||
            permissions.some((item) => item.startsWith(`${permission}:`));

        if (!hasPermission) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        return next();
    };
}
