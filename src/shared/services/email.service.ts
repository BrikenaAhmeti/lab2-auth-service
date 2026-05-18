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
}

class ConsoleEmailService implements EmailService {
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
    async send(input: SendEmailInput): Promise<void> {
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
            throw new Error(`Resend email failed: ${response.status} ${body}`);
        }
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

    async send(input: SendEmailInput): Promise<void> {
        await this.transporter.sendMail({
            from: env.emailFrom,
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
        });
    }
}

export function createEmailService(): EmailService {
    if (env.smtpHost && env.smtpUser && env.smtpPass) {
        return new SmtpEmailService();
    }

    if (env.resendApiKey) {
        return new ResendEmailService();
    }

    return new ConsoleEmailService();
}
