import { Request } from 'express';

export interface AuthenticatedUser {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface RequestWithUser<
    P = Record<string, string>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
    user?: AuthenticatedUser;
}
