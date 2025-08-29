import { FastifyReply, FastifyRequest } from 'fastify';

import { AuthStrategy, MiddlewareFunction } from '../types';

/**
 * JWT Authentication middleware
 * 
 * This middleware validates JWT tokens from the Authorization header.
 * It expects tokens in the format: "Bearer <token>"
 */
export const jwtAuthMiddleware = (options: {
  secret: string;
  algorithms?: string[];
  verify?: (payload: any, req: FastifyRequest) => Promise<boolean> | boolean;
}): MiddlewareFunction => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const authorization = req.headers.authorization;
    
    if (!authorization) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing authorization header',
      });
    }
    
    const [scheme, token] = authorization.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid authorization format. Expected: Bearer <token>',
      });
    }
    
    try {
      // In a real implementation, you would use a JWT library like jsonwebtoken
      // This is a simplified example
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // Optional custom verification
      if (options.verify) {
        const isValid = await options.verify(payload, req);
        if (!isValid) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Token verification failed',
          });
        }
      }
      
      // Attach user info to request
      (req as any).user = payload;
    } catch (error) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }
  };
};

/**
 * API Key authentication middleware
 * 
 * This middleware validates API keys from headers or query parameters.
 */
export const apiKeyAuthMiddleware = (options: {
  headerName?: string;
  queryName?: string;
  validate: (apiKey: string, req: FastifyRequest) => Promise<boolean> | boolean;
}): MiddlewareFunction => {
  const { headerName = 'x-api-key', queryName = 'apiKey', validate } = options;
  
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const apiKey = req.headers[headerName] as string || (req.query as any)[queryName];
    
    if (!apiKey) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: `Missing API key in header '${headerName}' or query parameter '${queryName}'`,
      });
    }
    
    try {
      const isValid = await validate(apiKey, req);
      if (!isValid) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid API key',
        });
      }
      
      // Attach API key info to request
      (req as any).apiKey = apiKey;
    } catch (error) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'API key validation failed',
      });
    }
  };
};

/**
 * Basic authentication middleware
 * 
 * This middleware validates basic HTTP authentication.
 */
export const basicAuthMiddleware = (options: {
  validate: (username: string, password: string, req: FastifyRequest) => Promise<boolean> | boolean;
}): MiddlewareFunction => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const authorization = req.headers.authorization;
    
    if (!authorization) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing authorization header',
      });
    }
    
    const [scheme, credentials] = authorization.split(' ');
    
    if (scheme !== 'Basic' || !credentials) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid authorization format. Expected: Basic <credentials>',
      });
    }
    
    try {
      const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');
      
      if (!username || !password) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials format',
        });
      }
      
      const isValid = await options.validate(username, password, req);
      if (!isValid) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
      }
      
      // Attach user info to request
      (req as any).user = { username };
    } catch (error) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication failed',
      });
    }
  };
};

/**
 * Create authentication strategies
 */
export const createAuthStrategies = () => ({
  jwt: (secret: string, options?: Parameters<typeof jwtAuthMiddleware>[0]): AuthStrategy => ({
    name: 'jwt',
    authenticate: jwtAuthMiddleware({ secret, ...options }),
  }),
  
  apiKey: (validate: Parameters<typeof apiKeyAuthMiddleware>[0]['validate'], options?: Omit<Parameters<typeof apiKeyAuthMiddleware>[0], 'validate'>): AuthStrategy => ({
    name: 'apiKey',
    authenticate: apiKeyAuthMiddleware({ validate, ...options }),
  }),
  
  basic: (validate: Parameters<typeof basicAuthMiddleware>[0]['validate']): AuthStrategy => ({
    name: 'basic',
    authenticate: basicAuthMiddleware({ validate }),
  }),
});
