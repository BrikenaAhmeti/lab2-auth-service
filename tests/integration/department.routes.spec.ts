import request from 'supertest';
import { createApp } from '../../src/app';

describe('Department routes', () => {
    const app = createApp();

    it('should return health status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });
});