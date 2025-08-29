import 'reflect-metadata';

import { METADATA_KEYS } from '../types';

/**
 * @Controller decorator for marking classes as HTTP controllers
 * 
 * This decorator marks a class as a controller and optionally sets a route prefix.
 * It initializes the metadata required for route registration.
 * 
 * @param prefix - Optional route prefix for all routes in this controller
 * 
 * @example
 * ```typescript
 * @Controller('/api/users')
 * export class UserController {
 *   // All routes will be prefixed with /api/users
 * }
 * ```
 * 
 * @example
 * ```typescript
 * @Controller()
 * export class HealthController {
 *   // No prefix, routes will be at root level
 * }
 * ```
 */
export const Controller =
  (prefix?: string): ClassDecorator =>
  target => {
    // Set the controller marker
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, true, target);
    
    // Set the prefix (empty string if not provided)
    Reflect.defineMetadata(METADATA_KEYS.PREFIX, prefix || '', target);

    // Initialize routes array if it doesn't exist
    if (!Reflect.hasMetadata(METADATA_KEYS.ROUTES, target)) {
      Reflect.defineMetadata(METADATA_KEYS.ROUTES, [], target);
    }

    // Initialize options object if it doesn't exist
    if (!Reflect.hasMetadata(METADATA_KEYS.OPTIONS, target)) {
      Reflect.defineMetadata(METADATA_KEYS.OPTIONS, {}, target);
    }

    // Initialize middleware array if it doesn't exist
    if (!Reflect.hasMetadata(METADATA_KEYS.MIDDLEWARE, target)) {
      Reflect.defineMetadata(METADATA_KEYS.MIDDLEWARE, [], target);
    }
  };

/**
 * Helper function to check if a class is decorated with @Controller
 */
export const isController = (target: any): boolean => {
  return Reflect.getMetadata(METADATA_KEYS.CONTROLLER, target) === true;
};

/**
 * Helper function to get controller prefix
 */
export const getControllerPrefix = (target: any): string => {
  return Reflect.getMetadata(METADATA_KEYS.PREFIX, target) || '';
};
