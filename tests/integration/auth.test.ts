import request from 'supertest';
import app from '../../apps/api/src/index';

// Integration tests for the authentication flow.
// Requires a running test database (DATABASE_URL pointing to securescout_test).

describe('Auth API Integration', () => {
  const testUser = {
    email:    `test-${Date.now()}@example.com`,
    password: 'SecurePass123!@#',
    name:     'Test User',
    orgName:  'Test Org',
  };

  let accessToken: string;

  it('POST /api/v1/auth/register — creates a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('POST /api/v1/auth/register — rejects weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ ...testUser, email: 'weak@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/login — authenticates valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/v1/auth/login — rejects invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123!' });
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/scans — rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/scans');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/scans — allows authenticated request', async () => {
    const res = await request(app).get('/api/v1/scans')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});
