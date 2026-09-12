import 'server-only';
import pino from 'pino';
import { env } from '@/config/env';

/**
 * Structured logging. Redaction paths are configured up front rather than
 * added after the first PII leak — anything matching these paths never reaches
 * the log sink.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'confirmPassword',
      'token',
      'tokenHash',
      'sessionToken',
      'authorization',
      'cookie',
      'email',
      'phone',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.email',
      '*.phone',
      'req.headers.authorization',
      'req.headers.cookie',
      'shippingAddress',
      'billingAddress',
    ],
    censor: '[redacted]',
  },
  base: { service: 'mira' },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
