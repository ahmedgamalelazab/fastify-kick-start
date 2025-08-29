import 'reflect-metadata';

import { METADATA_KEYS, RouteOptions } from '../types';

/**
 * @Opts decorator for adding Fastify route options to controller methods
 * 
 * This decorator allows you to specify Fastify route options such as schema validation,
 * response serialization, hooks, and other route-specific configurations.
 * 
 * @param opts - Fastify RouteShorthandOptions including schema, hooks, etc.
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Get('/:id')
 *   @Opts({
 *     schema: {
 *       tags: ['Users'],
 *       summary: 'Get user by ID',
 *       params: Type.Object({
 *         id: Type.String()
 *       }),
 *       response: {
 *         200: UserSchema
 *       }
 *     }
 *   })
 *   async getUserById(req, reply) {
 *     // Route handler implementation
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * @Controller('/auth')
 * export class AuthController {
 *   @Post('/login')
 *   @Opts({
 *     schema: {
 *       body: LoginSchema,
 *       response: {
 *         200: TokenSchema,
 *         401: ErrorSchema
 *       }
 *     },
 *     preHandler: [rateLimitMiddleware]
 *   })
 *   async login(req, reply) {
 *     // Login implementation
 *   }
 * }
 * ```
 */
export const Opts = (opts: RouteOptions): MethodDecorator => {
  return (target, propertyKey) => {
    // Initialize options object if it doesn't exist
    if (!Reflect.hasMetadata(METADATA_KEYS.OPTIONS, target.constructor)) {
      Reflect.defineMetadata(METADATA_KEYS.OPTIONS, {}, target.constructor);
    }

    // Get existing options
    const options = Reflect.getMetadata(METADATA_KEYS.OPTIONS, target.constructor) as Record<
      string | symbol,
      RouteOptions
    >;

    // Set options for this method
    options[propertyKey] = opts;

    // Update metadata
    Reflect.defineMetadata(METADATA_KEYS.OPTIONS, options, target.constructor);
  };
};

/**
 * Helper function to get route options for a specific method
 */
export const getRouteOptions = (target: any, methodName: string | symbol): RouteOptions | undefined => {
  const options = Reflect.getMetadata(METADATA_KEYS.OPTIONS, target) as Record<
    string | symbol,
    RouteOptions
  >;
  
  return options?.[methodName];
};

/**
 * Helper function to get all route options from a controller
 */
export const getAllRouteOptions = (target: any): Record<string | symbol, RouteOptions> => {
  return Reflect.getMetadata(METADATA_KEYS.OPTIONS, target) || {};
};
