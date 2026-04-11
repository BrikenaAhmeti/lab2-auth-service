import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AccessTokenPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface RefreshTokenPayload {
    sub: string;
}

export class JwtService {
    signAccessToken(payload: AccessTokenPayload): string {
        return jwt.sign(payload, env.jwtAccessSecret, {
            expiresIn: '15m',
        });
    }

    signRefreshToken(payload: RefreshTokenPayload): string {
        return jwt.sign(payload, env.jwtRefreshSecret, {
            expiresIn: '7d',
        });
    }

    verifyAccessToken(token: string): AccessTokenPayload {
        return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
    }

    verifyRefreshToken(token: string): RefreshTokenPayload {
        return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
    }
}