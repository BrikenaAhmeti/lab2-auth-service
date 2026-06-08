import { env } from '../../../config/env';
import { AppError } from '../../../shared/core/errors/app-error';
import { PatientProfileLinker } from '../domain/patient-profile-linker';

export class CorePatientClient implements PatientProfileLinker {
    constructor(
        private readonly baseUrl = env.coreServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) { }

    async findByUserId(userId: string) {
        if (!this.baseUrl || !this.internalApiKey) {
            throw new AppError('Patient profile lookup is not configured', 500);
        }

        const url = new URL(`/internal/patients/by-user/${encodeURIComponent(userId)}`, this.baseUrl);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-internal-api-key': this.internalApiKey,
            },
        });

        if (!response.ok) {
            let message = 'Patient profile could not be resolved';

            try {
                const body = await response.json() as { message?: string };
                if (typeof body.message === 'string' && body.message.trim()) {
                    message = body.message;
                }
            } catch {
                message = response.statusText || message;
            }

            throw new AppError(message, response.status);
        }

        return response.json();
    }

    async linkByPersonalNumber(input: {
        userId: string;
        personalNumber: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string | null;
        dateOfBirth?: Date | string | null;
        gender?: string | null;
    }) {
        if (!this.baseUrl || !this.internalApiKey) {
            throw new AppError('Patient profile linking is not configured', 500);
        }

        const url = new URL('/internal/patients/link-by-personal-number', this.baseUrl);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-internal-api-key': this.internalApiKey,
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            let message = 'Patient profile could not be linked';

            try {
                const body = await response.json() as { message?: string };
                if (typeof body.message === 'string' && body.message.trim()) {
                    message = body.message;
                }
            } catch {
                message = response.statusText || message;
            }

            throw new AppError(message, response.status);
        }

        return response.json();
    }
}
