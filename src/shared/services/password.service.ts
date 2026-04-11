import bcrypt from 'bcrypt';

export class PasswordService {
    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    async compare(password: string, passwordHash: string): Promise<boolean> {
        return bcrypt.compare(password, passwordHash);
    }
}