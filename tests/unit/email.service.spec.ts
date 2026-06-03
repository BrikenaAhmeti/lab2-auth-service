import { env } from '../../src/config/env';
import { createEmailService } from '../../src/shared/services/email.service';

describe('createEmailService', () => {
    const originalEnv = {
        nodeEnv: env.nodeEnv,
        resendApiKey: env.resendApiKey,
        smtpHost: env.smtpHost,
        smtpUser: env.smtpUser,
        smtpPass: env.smtpPass,
    };

    afterEach(() => {
        Object.assign(env, originalEnv);
        jest.restoreAllMocks();
    });

    function clearProviders() {
        env.resendApiKey = '';
        env.smtpHost = '';
        env.smtpUser = '';
        env.smtpPass = '';
    }

    it('uses local preview email when no provider is configured outside production', async () => {
        clearProviders();
        env.nodeEnv = 'development';
        const infoSpy = jest.spyOn(console, 'info').mockImplementation();

        const service = createEmailService();
        await service.send({
            to: 'patient@example.com',
            subject: 'Preview',
            text: 'Preview body',
        });

        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[email-preview]'));
    });

    it('requires SMTP or Resend configuration in production', () => {
        clearProviders();
        env.nodeEnv = 'production';

        expect(() => createEmailService()).toThrow(
            'Email provider is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY.',
        );
    });
});
