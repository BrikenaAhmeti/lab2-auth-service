import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: Number(process.env.PORT || 3005),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    frontendOrigins: process.env.FRONTEND_ORIGINS || '',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3005',
    emailFrom: process.env.EMAIL_FROM || 'noreply@medsphere.local',
    resendApiKey: process.env.RESEND_API_KEY || '',
};
