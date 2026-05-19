import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';
import { departmentRoutes } from './modules/departments/presentation/department.routes';
import { authRoutes } from './modules/auth/presentation/auth.routes';
import { userRoutes } from './modules/users/presentation/user.routes';
import { swaggerRoutes } from './docs/swagger.routes';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(
        cors({
            origin: true,
            credentials: true,
        }),
    );
    app.use(morgan('dev'));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.use('/docs', swaggerRoutes);
    app.use('/departments', departmentRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
