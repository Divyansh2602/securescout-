import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

export interface TokenPayload {
  userId:  string;
  orgId:   string;
  role:    string;
  email:   string;
  sessionId: string;
}

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

export class JwtService {
  private static readonly ACCESS_OPTIONS: SignOptions = {
    expiresIn:  config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm:  'HS256',
    issuer:     'securescout-api',
    audience:   'securescout-web',
  };

  private static readonly REFRESH_OPTIONS: SignOptions = {
    expiresIn:  config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm:  'HS256',
    issuer:     'securescout-api',
    audience:   'securescout-web',
  };

  static generateTokenPair(payload: TokenPayload): TokenPair {
    const accessToken  = jwt.sign(payload, config.JWT_SECRET,         this.ACCESS_OPTIONS);
    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET,  this.REFRESH_OPTIONS);
    return { accessToken, refreshToken, expiresIn: 15 * 60 };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer:   'securescout-api',
        audience: 'securescout-web',
        algorithms: ['HS256'],
      }) as JwtPayload & TokenPayload;
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)  throw new AppError('Token expired', 401);
      if (err instanceof jwt.JsonWebTokenError)  throw new AppError('Invalid token', 401);
      throw new AppError('Token verification failed', 401);
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer:   'securescout-api',
        audience: 'securescout-web',
        algorithms: ['HS256'],
      }) as JwtPayload & TokenPayload;
      return decoded;
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }
}
