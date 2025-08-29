import 'reflect-metadata';

import { HttpMethod, METADATA_KEYS, RouteDefinition } from '../types';

/**
 * Creates a route decorator for the specified HTTP method
 */
const makeRouteDecorator = (httpMethod: HttpMethod) => {
  return (path?: string): MethodDecorator => {
    return (target, propertyKey) => {
      // Initialize routes array if it doesn't exist
      if (!Reflect.hasMetadata(METADATA_KEYS.ROUTES, target.constructor)) {
        Reflect.defineMetadata(METADATA_KEYS.ROUTES, [], target.constructor);
      }

      // Get existing routes
      const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, target.constructor) as RouteDefinition[];

      // Add new route definition
      routes.push({
        requestMethod: httpMethod,
        path: path || '',
        methodName: propertyKey,
      });

      // Update metadata
      Reflect.defineMetadata(METADATA_KEYS.ROUTES, routes, target.constructor);
    };
  };
};

/**
 * @Get decorator for HTTP GET requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Get()
 *   async getUsers() {
 *     // GET /users/getUsers
 *   }
 * 
 *   @Get('/:id')
 *   async getUserById() {
 *     // GET /users/:id
 *   }
 * 
 *   @Get('/profile')
 *   async getProfile() {
 *     // GET /users/profile
 *   }
 * }
 * ```
 */
export const Get = makeRouteDecorator(HttpMethod.GET);

/**
 * @Post decorator for HTTP POST requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Post()
 *   async createUser() {
 *     // POST /users/createUser
 *   }
 * 
 *   @Post('/register')
 *   async register() {
 *     // POST /users/register
 *   }
 * }
 * ```
 */
export const Post = makeRouteDecorator(HttpMethod.POST);

/**
 * @Put decorator for HTTP PUT requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Put('/:id')
 *   async updateUser() {
 *     // PUT /users/:id
 *   }
 * }
 * ```
 */
export const Put = makeRouteDecorator(HttpMethod.PUT);

/**
 * @Patch decorator for HTTP PATCH requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Patch('/:id')
 *   async patchUser() {
 *     // PATCH /users/:id
 *   }
 * }
 * ```
 */
export const Patch = makeRouteDecorator(HttpMethod.PATCH);

/**
 * @Delete decorator for HTTP DELETE requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Delete('/:id')
 *   async deleteUser() {
 *     // DELETE /users/:id
 *   }
 * }
 * ```
 */
export const Delete = makeRouteDecorator(HttpMethod.DELETE);

/**
 * @Head decorator for HTTP HEAD requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 */
export const Head = makeRouteDecorator(HttpMethod.HEAD);

/**
 * @Options decorator for HTTP OPTIONS requests
 * 
 * @param path - Optional path for the route. If not provided, uses the method name
 */
export const Options = makeRouteDecorator(HttpMethod.OPTIONS);

/**
 * Helper function to get all routes from a controller
 */
export const getControllerRoutes = (target: any): RouteDefinition[] => {
  return Reflect.getMetadata(METADATA_KEYS.ROUTES, target) || [];
};
