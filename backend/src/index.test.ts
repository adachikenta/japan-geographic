import { describe, it, expect } from 'vitest';
import app from './index';

describe('Health Check', () => {
  it('should return health status', async () => {
    const req = new Request('http://localhost/health');
    const res = await app.request(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('service', 'japan-geographic-backend');
  });
});

describe('API Endpoints', () => {
  it('should return version info', async () => {
    const req = new Request('http://localhost/api/version');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('api');
    expect(data).toHaveProperty('environment');
  });

  it('should return geography data', async () => {
    const req = new Request('http://localhost/api/geography');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return prefectures data', async () => {
    const req = new Request('http://localhost/api/prefectures');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return statistics data', async () => {
    const req = new Request('http://localhost/api/statistics');
    const res = await app.request(req);
    const data = await res.json() as any;

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('totalPopulation');
  });
});

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown');
    const res = await app.request(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toHaveProperty('error', 'Not Found');
  });
});
