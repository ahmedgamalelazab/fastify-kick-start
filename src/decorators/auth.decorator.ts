import 'reflect-metadata';

import { AuthStrategy, METADATA_KEYS } from '../types';

/**
 * @Auth decorator for adding authentication to controllers or individual routes
 * 
 * This decorator can be applied at the class level (affecting all routes in the controller)
 * or at the method level (affecting only that specific route).
 * 
 * @param strategy - Authentication strategy name or strategy object
 * 
 * @example
 * ```typescript
 * // Apply to entire controller
 * @Auth('jwt')
 * @Controller('/protected')
 * export class ProtectedController {
 *   @Get('/data')
 *   async getData() {
 *     // This route requires JWT authentication
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
 *     // This route is public
 *   }
 * 
 *   @Get('/private')
 *   @Auth('jwt')
 *   async getPrivateData() {
 *     // Only this route requires authentication
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Using custom auth strategy
 * const customAuth: AuthStrategy = {
 *   name: 'custom',
 *   authenticate: async (req, reply) => {
 *     // Custom authentication logic
 *   }
 * };
 * 
 * @Auth(customAuth)
 * @Controller('/custom')
 * export class CustomAuthController {
 *   // All routes use custom authentication
 * }
 * ```
 */
export const Auth = (strategy: string | AuthStrategy): ClassDecorator & MethodDecorator => {
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

      options[propertyKey].auth = strategy;
      Reflect.defineMetadata(METADATA_KEYS.OPTIONS, options, target.constructor);
    } else {
      // Class decorator - apply to entire controller
      Reflect.defineMetadata(METADATA_KEYS.AUTH, strategy, target);
    }
  };
};

/**
 * Helper function to get authentication strategy for a controller
 */
export const getControllerAuth = (target: any): string | AuthStrategy | undefined => {
  return Reflect.getMetadata(METADATA_KEYS.AUTH, target);
};

/**
 * Helper function to get authentication strategy for a specific route
 */
export const getRouteAuth = (target: any, methodName: string | symbol): string | AuthStrategy | undefined => {
  const options = Reflect.getMetadata(METADATA_KEYS.OPTIONS, target) as Record<
    string | symbol,
    any
  >;
  
  return options?.[methodName]?.auth;
};

/**
 * Helper function to check if a controller or route requires authentication
 */
export const requiresAuth = (target: any, methodName?: string | symbol): boolean => {
  if (methodName) {
    // Check method-level auth first
    const routeAuth = getRouteAuth(target, methodName);
    if (routeAuth !== undefined) {
      return true;
    }
  }
  
  // Check controller-level auth
  const controllerAuth = getControllerAuth(target);
  return controllerAuth !== undefined;
};

/**
 * Helper function to get the effective auth strategy for a route
 * (method-level auth takes precedence over controller-level auth)
 */
export const getEffectiveAuth = (target: any, methodName: string | symbol): string | AuthStrategy | undefined => {
  // Method-level auth takes precedence
  const routeAuth = getRouteAuth(target, methodName);
  if (routeAuth !== undefined) {
    return routeAuth;
  }
  
  // Fall back to controller-level auth
  return getControllerAuth(target);
};
