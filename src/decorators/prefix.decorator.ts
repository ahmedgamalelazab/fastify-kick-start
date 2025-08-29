import 'reflect-metadata';

import { METADATA_KEYS } from '../types';

/**
 * @Prefix decorator for adding route prefixes to controllers
 *
 * This decorator allows you to add a prefix to all routes in a controller.
 * It can be used in combination with @Controller to create nested prefixes.
 * Multiple @Prefix decorators can be stacked to create complex route hierarchies.
 *
 * @param prefix - The prefix to add to all routes in the controller
 *
 * @example
 * ```typescript
 * @Prefix('/api')
 * @Controller('/v1/users')
 * export class UserController {
 *   // Routes will be prefixed with /api/v1/users
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Prefix('/api')
 * @Prefix('/v1')
 * @Controller('/users')
 * export class UserController {
 *   // Routes will be prefixed with /api/v1/users
 * }
 * ```
 */
export const Prefix =
  (prefix: string): ClassDecorator =>
  target => {
    const existingPrefix = (Reflect.getMetadata(METADATA_KEYS.PREFIX, target) as string) || '';

    // Combine prefixes, handling leading/trailing slashes
    const combinedPrefix = [prefix, existingPrefix]
      .filter(p => p && p.length > 0)
      .map(p => (p.startsWith('/') ? p.slice(1) : p))
      .map(p => (p.endsWith('/') ? p.slice(0, -1) : p))
      .filter(p => p.length > 0)
      .join('/');

    Reflect.defineMetadata(METADATA_KEYS.PREFIX, combinedPrefix, target);

    // Initialize routes array if it doesn't exist
    if (!Reflect.hasMetadata(METADATA_KEYS.ROUTES, target)) {
      Reflect.defineMetadata(METADATA_KEYS.ROUTES, [], target);
    }
  };

/**
 * Helper function to normalize path by removing leading/trailing slashes
 */
export const normalizePath = (path: string): string => {
  if (!path || path === '/') return '';

  let normalized = path;

  // Remove leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
};

/**
 * Helper function to combine multiple path segments
 */
export const combinePaths = (...paths: (string | undefined)[]): string => {
  const validPaths = paths
    .filter((p): p is string => p != null && p.length > 0)
    .map(p => normalizePath(p))
    .filter(p => p.length > 0);

  return validPaths.length > 0 ? `/${validPaths.join('/')}` : '/';
};
