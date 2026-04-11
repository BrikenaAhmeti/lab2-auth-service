import crypto from 'crypto';

export class TokenHashService {
    hash(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}