import { env } from '../../config/env';
import nodemailer from 'nodemailer';

export interface SendEmailInput {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface EmailService {
    send(input: SendEmailInput): Promise<void>;
    getProviderName?(): string;
    isDeliveryConfigured?(): boolean;
}

function serializeEmailError(error: unknown) {
    if (!(error instanceof Error)) {
        return String(error);
    }

    const details = error as Error & {
        code?: string;
        command?: string;
        response?: string;
        responseCode?: number;
    };

    return [
        `message="${error.message}"`,
        details.code ? `code=${details.code}` : undefined,
        details.command ? `command=${details.command}` : undefined,
        details.responseCode ? `responseCode=${details.responseCode}` : undefined,
        details.response ? `response="${details.response}"` : undefined,
    ].filter(Boolean).join(' ');
}

class ConsoleEmailService implements EmailService {
    getProviderName() {
        return 'console';
    }

    isDeliveryConfigured() {
        return false;
    }

    async send(input: SendEmailInput): Promise<void> {
        console.info(
            [
                '[email-preview]',
                `to=${input.to}`,
                `subject=${input.subject}`,
                input.text,
            ].join('\n'),
        );
    }
}

class ResendEmailService implements EmailService {
    getProviderName() {
        return 'resend';
    }

    isDeliveryConfigured() {
        return true;
    }

    async send(input: SendEmailInput): Promise<void> {
        console.info(`[email] provider=resend to=${input.to} subject="${input.subject}" request=started`);
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: env.emailFrom,
                to: [input.to],
                subject: input.subject,
                text: input.text,
                html: input.html,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(
                `[email] provider=resend to=${input.to} status=${response.status} request=failed body=${body}`,
            );
            throw new Error(`Resend email failed: ${response.status} ${body}`);
        }

        console.info(`[email] provider=resend to=${input.to} request=succeeded`);
    }
}

class SmtpEmailService implements EmailService {
    private readonly transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
            user: env.smtpUser,
            pass: env.smtpPass,
        },
    });

    getProviderName() {
        return 'smtp';
    }

    isDeliveryConfigured() {
        return true;
    }

    async send(input: SendEmailInput): Promise<void> {
        console.info(
            `[email] provider=smtp host=${env.smtpHost} port=${env.smtpPort} secure=${env.smtpSecure} to=${input.to} subject="${input.subject}" request=started`,
        );
        try {
            const info = await this.transporter.sendMail({
                from: env.emailFrom,
                to: input.to,
                subject: input.subject,
                text: input.text,
                html: input.html,
            });
            console.info(
                `[email] provider=smtp to=${input.to} messageId=${info.messageId ?? 'unknown'} accepted=${info.accepted?.join(',') ?? ''} rejected=${info.rejected?.join(',') ?? ''} request=succeeded`,
            );
        } catch (error) {
            console.error(
                `[email] provider=smtp to=${input.to} request=failed ${serializeEmailError(error)}`,
            );
            throw error;
        }
    }
}

export function createEmailService(): EmailService {
    console.info(
        [
            '[email] startup',
            `smtpHost=${env.smtpHost || '[missing]'}`,
            `smtpPort=${env.smtpPort}`,
            `smtpSecure=${env.smtpSecure}`,
            `smtpUserConfigured=${Boolean(env.smtpUser)}`,
            `smtpPassConfigured=${Boolean(env.smtpPass)}`,
            `emailFrom=${env.emailFrom}`,
            `resendConfigured=${Boolean(env.resendApiKey)}`,
        ].join(' '),
    );

    if (env.smtpHost && env.smtpUser && env.smtpPass) {
        console.info(
            `[email] provider=smtp configured host=${env.smtpHost} port=${env.smtpPort} secure=${env.smtpSecure} from=${env.emailFrom} userConfigured=true passConfigured=true`,
        );
        return new SmtpEmailService();
    }

    if (env.resendApiKey) {
        console.info(`[email] provider=resend configured from=${env.emailFrom}`);
        return new ResendEmailService();
    }

    console.warn('[email] provider=console configured; no SMTP/Resend credentials found, emails will only be printed');
    return new ConsoleEmailService();
}
