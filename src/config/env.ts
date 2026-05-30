import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envFiles = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
];

for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
        dotenv.config({ path: envFile, override: false });
    }
}

const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3005';

function parseBoolean(value: string | undefined, fallback = false) {
    if (!value) return fallback;
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
}

function parsePort(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
    port: Number(process.env.PORT || 3005),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    appBaseUrl,
    emailVerificationUrl:
        process.env.EMAIL_VERIFICATION_URL || `${appBaseUrl}/api/auth/verify-email`,
    passwordResetUrl: process.env.PASSWORD_RESET_URL || `${appBaseUrl}/reset-password`,
    emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@medsphere.local',
    resendApiKey: process.env.RESEND_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parsePort(process.env.SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
};
