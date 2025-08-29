import 'reflect-metadata';

import { METADATA_KEYS, MiddlewareFunction } from '../types';

/**
 * @Middleware decorator for adding middleware to controllers or individual routes
 *
 * This decorator can be applied at the class level (affecting all routes in the controller)
 * or at the method level (affecting only that specific route).
 * Multiple middleware can be applied and they will be executed in the order they are defined.
 *
 * @param middleware - Single middleware function or array of middleware functions
 *
 * @example
 * ```typescript
 * // Apply to entire controller
 * @Middleware([loggingMiddleware, validationMiddleware])
 * @Controller('/api')
 * export class ApiController {
 *   @Get('/data')
 *   async getData() {
 *     // This route will have logging and validation middleware
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Controller('/mixed')
 * export class MixedController {
 *   @Get('/public')
 *   async getPublicData() {
 *     // No middleware
 *   }
 *
 *   @Get('/protected')
 *   @Middleware(authMiddleware)
 *   async getProtectedData() {
 *     // Only this route has auth middleware
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Stacking multiple middleware decorators
 * @Controller('/complex')
 * export class ComplexController {
 *   @Get('/data')
 *   @Middleware(rateLimitMiddleware)
 *   @Middleware(cacheMiddleware)
 *   @Middleware(validationMiddleware)
 *   async getData() {
 *     // Middleware will execute in order: rateLimit -> cache -> validation
 *   }
 * }
 * ```
 */
export const Middleware = (
  middleware: MiddlewareFunction | MiddlewareFunction[]
): ClassDecorator & MethodDecorator => {
  const middlewareArray = Array.isArray(middleware) ? middleware : [middleware];

  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) {
      // Method decorator - apply to specific route
      if (!Reflect.hasMetadata(METADATA_KEYS.OPTIONS, target.constructor)) {
        Reflect.defineMetadata(METADATA_KEYS.OPTIONS, {}, target.constructor);
      }

      const options = Reflect.getMetadata(METADATA_KEYS.OPTIONS, target.constructor) as Record<
        string | symbol,
        any
      >;

      if (!options[propertyKey]) {
        options[propertyKey] = {};
      }

      if (!options[propertyKey].middleware) {
        options[propertyKey].middleware = [];
      }

      // Add middleware to existing array
      options[propertyKey].middleware.push(...middlewareArray);
      Reflect.defineMetadata(METADATA_KEYS.OPTIONS, options, target.constructor);
    } else {
      // Class decorator - apply to entire controller
      const existingMiddleware = Reflect.getMetadata(METADATA_KEYS.MIDDLEWARE, target) || [];
      const updatedMiddleware = [...existingMiddleware, ...middlewareArray];
      Reflect.defineMetadata(METADATA_KEYS.MIDDLEWARE, updatedMiddleware, target);
    }
  };
};

/**
 * Helper function to get middleware for a controller
 */
export const getControllerMiddleware = (target: any): MiddlewareFunction[] => {
  return Reflect.getMetadata(METADATA_KEYS.MIDDLEWARE, target) || [];
};

/**
 * Helper function to get middleware for a specific route
 */
export const getRouteMiddleware = (
  target: any,
  methodName: string | symbol
): MiddlewareFunction[] => {
  const options = Reflect.getMetadata(METADATA_KEYS.OPTIONS, target) as Record<
    string | symbol,
    any
  >;

  return options?.[methodName]?.middleware || [];
};

/**
 * Helper function to get all effective middleware for a route
 * (combines controller-level and method-level middleware)
 */
export const getEffectiveMiddleware = (
  target: any,
  methodName: string | symbol
): MiddlewareFunction[] => {
  const controllerMiddleware = getControllerMiddleware(target);
  const routeMiddleware = getRouteMiddleware(target, methodName);

  return [...controllerMiddleware, ...routeMiddleware];
};

/**
 * Helper function to check if a controller or route has middleware
 */
export const hasMiddleware = (target: any, methodName?: string | symbol): boolean => {
  if (methodName) {
    const routeMiddleware = getRouteMiddleware(target, methodName);
    if (routeMiddleware.length > 0) {
      return true;
    }
  }

  const controllerMiddleware = getControllerMiddleware(target);
  return controllerMiddleware.length > 0;
};
