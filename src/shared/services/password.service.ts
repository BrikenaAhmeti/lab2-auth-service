import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class PasswordService {
    private readonly lowerChars = 'abcdefghijkmnopqrstuvwxyz';
    private readonly upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    private readonly numberChars = '23456789';
    private readonly specialChars = '!@#$%^&*_+-=';

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    async compare(password: string, passwordHash: string): Promise<boolean> {
        return bcrypt.compare(password, passwordHash);
    }

    generateTemporaryPassword(length = 20): string {
        const allChars = [
            this.lowerChars,
            this.upperChars,
            this.numberChars,
            this.specialChars,
        ].join('');

        const passwordChars = [
            this.pickRandom(this.lowerChars),
            this.pickRandom(this.upperChars),
            this.pickRandom(this.numberChars),
            this.pickRandom(this.specialChars),
        ];

        while (passwordChars.length < length) {
            passwordChars.push(this.pickRandom(allChars));
        }

        for (let i = passwordChars.length - 1; i > 0; i--) {
            const j = crypto.randomInt(i + 1);
            [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
        }

        return passwordChars.join('');
    }

    private pickRandom(chars: string) {
        return chars[crypto.randomInt(chars.length)];
    }
}
