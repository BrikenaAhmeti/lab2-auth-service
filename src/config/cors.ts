import { CorsOptions } from 'cors';
import { env } from './env';

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

function configuredOrigins() {
    return [
        env.frontendBaseUrl,
        ...env.frontendOrigins.split(','),
    ]
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function isLocalDevelopmentOrigin(origin: string) {
    if (env.nodeEnv === 'production') {
        return false;
    }

    try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol) && localHosts.has(url.hostname);
    } catch {
        return false;
    }
}

export function isCorsOriginAllowed(origin?: string) {
    if (!origin) {
        return true;
    }

    const allowedOrigins = configuredOrigins();

    if (allowedOrigins.includes(origin)) {
        return true;
    }

    if (allowedOrigins.includes('*') && env.nodeEnv !== 'production') {
        return true;
    }

    return isLocalDevelopmentOrigin(origin);
}

export const corsOptions: CorsOptions = {
    credentials: true,
    origin(origin, callback) {
        if (isCorsOriginAllowed(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
};
