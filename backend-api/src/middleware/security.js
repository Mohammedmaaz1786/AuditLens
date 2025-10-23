import crypto from 'crypto';
import logger from '../utils/logger.js';

// Rate limiting store
const rateLimitStore = new Map();
const failedLoginAttempts = new Map();

/**
 * Rate limiting middleware for DDoS protection
 */
export const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(identifier);

    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(identifier, entry);
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${identifier}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    next();
  };
};

/**
 * Input validation and sanitization middleware
 */
export const validateInput = (req, res, next) => {
  try {
    // SQL Injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+SELECT)/gi,
      /(OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/gi,
      /(--|;|\/\*|\*\/)/g,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    const checkValue = (value, path = '') => {
      if (typeof value === 'string') {
        // Check SQL injection
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            logger.warn(`SQL injection attempt detected: ${path}`, { value: value.substring(0, 100) });
            return false;
          }
        }

        // Check XSS
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            logger.warn(`XSS attempt detected: ${path}`, { value: value.substring(0, 100) });
            return false;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (!checkValue(value[key], `${path}.${key}`)) {
            return false;
          }
        }
      }
      return true;
    };

    // Validate request body
    if (req.body && !checkValue(req.body, 'body')) {
      res.status(400).json({
        success: false,
        message: 'Invalid input detected. Potential security threat.',
      });
      return;
    }

    // Validate query parameters
    if (req.query && !checkValue(req.query, 'query')) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters detected.',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Input validation error:', error);
    next(error);
  }
};

/**
 * Track failed login attempts for brute force protection
 */
export const trackFailedLogin = (identifier) => {
  const now = Date.now();
  const entry = failedLoginAttempts.get(identifier) || { attempts: 0 };

  // Check if locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { locked: true, attemptsLeft: 0 };
  }

  // Reset if lock expired
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    entry.attempts = 0;
    entry.lockedUntil = undefined;
  }

  entry.attempts++;

  // Lock after 5 attempts
  if (entry.attempts >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15 minutes
    failedLoginAttempts.set(identifier, entry);
    logger.warn(`Account locked due to failed login attempts: ${identifier}`);
    return { locked: true, attemptsLeft: 0 };
  }

  failedLoginAttempts.set(identifier, entry);
  return { locked: false, attemptsLeft: 5 - entry.attempts };
};

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedLogins = (identifier) => {
  failedLoginAttempts.delete(identifier);
};

/**
 * Audit logging middleware - track all requests
 */
export const auditLog = (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const duration = Date.now() - startTime;

    // Log audit entry
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      user: req.user?.id || 'anonymous',
      ip: req.ip || req.socket.remoteAddress,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });

    return originalJson(body);
  };

  next();
};

/**
 * Encrypt sensitive data in response
 */
export const encryptResponse = (data, sensitiveFields) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = Array.isArray(data) ? [...data] : { ...data };

  for (const field of sensitiveFields) {
    if (field in result && result[field]) {
      // Mask sensitive data (keep last 4 characters)
      const value = String(result[field]);
      if (value.length > 4) {
        result[field] = '*'.repeat(value.length - 4) + value.slice(-4);
      }
    }
  }

  return result;
};

/**
 * Generate digital signature for data integrity
 */
export const generateSignature = (data, secret = process.env.SIGNATURE_SECRET || 'change_me') => {
  const dataString = JSON.stringify(data);
  return crypto.createHmac('sha256', secret).update(dataString).digest('hex');
};

/**
 * Verify digital signature
 */
export const verifySignature = (data, signature, secret = process.env.SIGNATURE_SECRET || 'change_me') => {
  const expectedSignature = generateSignature(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

/**
 * CORS configuration for secure cross-origin requests
 */
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

/**
 * Security headers middleware
 */
export const securityHeaders = (_req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS - Force HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Data sanitization - remove sensitive fields before logging/returning
 */
export const sanitizeData = (data, sensitiveFields = ['password', 'token', 'secret', 'cvv', 'ssn']) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const result = Array.isArray(data) ? [...data] : { ...data };

  for (const field of sensitiveFields) {
    if (field in result) {
      result[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in result) {
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitizeData(result[key], sensitiveFields);
    }
  }

  return result;
};

export default {
  rateLimit,
  validateInput,
  trackFailedLogin,
  resetFailedLogins,
  auditLog,
  encryptResponse,
  generateSignature,
  verifySignature,
  corsOptions,
  securityHeaders,
  sanitizeData,
};
