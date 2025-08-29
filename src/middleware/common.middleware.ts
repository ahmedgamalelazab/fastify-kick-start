import { FastifyReply, FastifyRequest } from 'fastify';

import { MiddlewareFunction } from '../types';

/**
 * CORS middleware
 * 
 * This middleware handles Cross-Origin Resource Sharing (CORS) headers.
 */
export const corsMiddleware = (options: {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
} = {}): MiddlewareFunction => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400, // 24 hours
  } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Set CORS headers
    if (typeof origin === 'string') {
      reply.header('Access-Control-Allow-Origin', origin);
    } else if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin;
      if (requestOrigin && origin.includes(requestOrigin)) {
        reply.header('Access-Control-Allow-Origin', requestOrigin);
      }
    } else if (origin === true) {
      reply.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    }

    reply.header('Access-Control-Allow-Methods', methods.join(', '));
    reply.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    reply.header('Access-Control-Max-Age', maxAge.toString());

    if (credentials) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  };
};

/**
 * Request logging middleware
 * 
 * This middleware logs incoming requests with timing information.
 */
export const loggingMiddleware = (options: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeBody?: boolean;
  includeHeaders?: boolean;
  excludePaths?: string[];
} = {}): MiddlewareFunction => {
  const { level = 'info', includeBody = false, includeHeaders = false, excludePaths = [] } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const { method, url } = req;

    // Skip logging for excluded paths
    if (excludePaths.some(path => url.startsWith(path))) {
      return;
    }

    const logData: any = {
      method,
      url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    if (includeHeaders) {
      logData.headers = req.headers;
    }

    if (includeBody && req.body) {
      logData.body = req.body;
    }

    req.log[level]('Request started', logData);

    // Log response when finished
    reply.addHook('onSend', async () => {
      const duration = Date.now() - startTime;
      req.log[level]('Request completed', {
        method,
        url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      });
    });
  };
};

/**
 * Rate limiting middleware
 * 
 * This is a simple in-memory rate limiter. For production use,
 * consider using a more robust solution like Redis-based rate limiting.
 */
export const rateLimitMiddleware = (options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
} = {}): MiddlewareFunction => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }

    // Get or create request info
    let requestInfo = requests.get(key);
    if (!requestInfo || requestInfo.resetTime < windowStart) {
      requestInfo = { count: 0, resetTime: now + windowMs };
      requests.set(key, requestInfo);
    }

    // Check if limit exceeded
    if (requestInfo.count >= maxRequests) {
      const resetTime = Math.ceil((requestInfo.resetTime - now) / 1000);
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${resetTime} seconds.`,
        retryAfter: resetTime,
      });
    }

    // Increment counter
    requestInfo.count++;

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests.toString());
    reply.header('X-RateLimit-Remaining', (maxRequests - requestInfo.count).toString());
    reply.header('X-RateLimit-Reset', Math.ceil(requestInfo.resetTime / 1000).toString());

    // Handle skip options
    if (skipSuccessfulRequests || skipFailedRequests) {
      reply.addHook('onSend', async () => {
        const shouldSkip = 
          (skipSuccessfulRequests && reply.statusCode < 400) ||
          (skipFailedRequests && reply.statusCode >= 400);
        
        if (shouldSkip) {
          requestInfo!.count--;
        }
      });
    }
  };
};

/**
 * Request validation middleware
 * 
 * This middleware provides additional validation beyond schema validation.
 */
export const validationMiddleware = (options: {
  validateHeaders?: (headers: any) => boolean | string;
  validateQuery?: (query: any) => boolean | string;
  validateParams?: (params: any) => boolean | string;
  validateBody?: (body: any) => boolean | string;
} = {}): MiddlewareFunction => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const { validateHeaders, validateQuery, validateParams, validateBody } = options;

    // Validate headers
    if (validateHeaders) {
      const result = validateHeaders(req.headers);
      if (result !== true) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: typeof result === 'string' ? result : 'Invalid headers',
        });
      }
    }

    // Validate query parameters
    if (validateQuery) {
      const result = validateQuery(req.query);
      if (result !== true) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: typeof result === 'string' ? result : 'Invalid query parameters',
        });
      }
    }

    // Validate route parameters
    if (validateParams) {
      const result = validateParams(req.params);
      if (result !== true) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: typeof result === 'string' ? result : 'Invalid route parameters',
        });
      }
    }

    // Validate request body
    if (validateBody && req.body) {
      const result = validateBody(req.body);
      if (result !== true) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: typeof result === 'string' ? result : 'Invalid request body',
        });
      }
    }
  };
};

/**
 * Security headers middleware
 * 
 * This middleware adds common security headers to responses.
 */
export const securityHeadersMiddleware = (options: {
  contentSecurityPolicy?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
} = {}): MiddlewareFunction => {
  const {
    contentSecurityPolicy = "default-src 'self'",
    xFrameOptions = 'DENY',
    xContentTypeOptions = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = 'geolocation=(), microphone=(), camera=()',
  } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (contentSecurityPolicy) {
      reply.header('Content-Security-Policy', contentSecurityPolicy);
    }
    
    if (xFrameOptions) {
      reply.header('X-Frame-Options', xFrameOptions);
    }
    
    if (xContentTypeOptions) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }
    
    if (referrerPolicy) {
      reply.header('Referrer-Policy', referrerPolicy);
    }
    
    if (permissionsPolicy) {
      reply.header('Permissions-Policy', permissionsPolicy);
    }

    // Additional security headers
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  };
};
