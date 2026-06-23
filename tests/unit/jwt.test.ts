import { JwtService } from '../../apps/api/src/services/jwt.service';

describe('JwtService', () => {
  const payload = {
    userId: 'user_123', orgId: 'org_456',
    role: 'DEVELOPER', email: 'test@example.com', sessionId: 'sess_789',
  };

  it('generates a valid token pair', () => {
    const tokens = JwtService.generateTokenPair(payload);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(900);
  });

  it('verifies a valid access token', () => {
    const { accessToken } = JwtService.generateTokenPair(payload);
    const decoded = JwtService.verifyAccessToken(accessToken);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('rejects an invalid token', () => {
    expect(() => JwtService.verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('rejects a tampered token', () => {
    const { accessToken } = JwtService.generateTokenPair(payload);
    const tampered = accessToken.slice(0, -5) + 'xxxxx';
    expect(() => JwtService.verifyAccessToken(tampered)).toThrow();
  });
});
