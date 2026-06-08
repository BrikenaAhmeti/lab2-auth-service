import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';
import { createRateLimiter } from './shared/middleware/rate-limit';
import { departmentRoutes } from './modules/departments/presentation/department.routes';
import { authRoutes, internalAuthRoutes } from './modules/auth/presentation/auth.routes';
import { internalUserRoutes, userRoutes } from './modules/users/presentation/user.routes';
import { swaggerRoutes } from './docs/swagger.routes';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(createRateLimiter({
        windowMs: 15 * 60_000,
        maxRequests: 300,
        skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
    }));
    app.use(morgan('dev'));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.use('/docs', swaggerRoutes);
    app.use('/api/docs', swaggerRoutes);
    app.use('/departments', departmentRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/internal/auth', internalAuthRoutes);
    app.use('/internal/users', internalUserRoutes);
    app.use('/api/users', userRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
