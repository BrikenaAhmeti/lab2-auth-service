import dotenv from 'dotenv';

dotenv.config();

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
    emailFrom: process.env.EMAIL_FROM || 'medsphere@noreply.com',
    resendApiKey: process.env.RESEND_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parsePort(process.env.SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
};
