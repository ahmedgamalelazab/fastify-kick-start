import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

import {
  getAllRouteOptions,
  getControllerPrefix,
  getControllerRoutes,
  getEffectiveMiddleware,
  isController,
} from '../decorators';
import { combinePaths } from '../decorators/prefix.decorator';
import {
  ControllerConstructor,
  ControllerPluginOptions,
  HttpVerb,
  MiddlewareFunction,
  RouteDefinition,
} from '../types';

/**
 * Controller plugin for registering decorated controllers with Fastify
 *
 * This plugin scans controller classes for route decorators and automatically
 * registers them with the Fastify instance. It supports:
 * - Route registration with proper HTTP methods and paths
 * - Middleware execution (controller-level and route-level)
 * - Smart dependency injection with multiple IOC container support
 * - Route options (schema, hooks, etc.)
 */
function controllerPlugin(fastify: FastifyInstance, options: ControllerPluginOptions): void {
  const { controllers, middleware = [], prefix = '', dependencyInjection } = options;

  // Register global middleware
  for (const middlewareFunc of middleware) {
    fastify.addHook('preHandler', middlewareFunc);
  }

  // Process each controller
  for (const ControllerClass of controllers) {
    if (!isController(ControllerClass)) {
      throw new Error(`${ControllerClass.name} is not decorated with @Controller`);
    }

    // Create controller instance using smart DI resolution
    let controllerInstance: unknown;
    // Priority 1: Use smart DI resolver if available (from DI bridge plugin)
    if (fastify.diResolver) {
      controllerInstance = fastify.diResolver.resolve(ControllerClass);
      fastify.log.debug(`Controller ${ControllerClass.name} instantiated via DI resolver`);
    }
    // Priority 2: Legacy support - custom resolver function
    else if (dependencyInjection?.resolver) {
      controllerInstance = dependencyInjection.resolver(ControllerClass);
      fastify.log.debug(`Controller ${ControllerClass.name} instantiated via custom resolver`);
    }
    // Priority 3: Legacy support - generic container
    else if (dependencyInjection?.container) {
      controllerInstance = new ControllerClass(dependencyInjection.container);
      fastify.log.debug(`Controller ${ControllerClass.name} instantiated with container injection`);
    }
    // Priority 4: Check if DI container is available on Fastify instance (Awilix style)
    else if (fastify.diContainer?.cradle) {
      controllerInstance = new ControllerClass(fastify.diContainer.cradle);
      fastify.log.debug(`Controller ${ControllerClass.name} instantiated with Awilix cradle`);
    }
    // Priority 5: Check if generic DI container is available
    else if (fastify.diContainer) {
      controllerInstance = new ControllerClass(fastify.diContainer);
      fastify.log.debug(`Controller ${ControllerClass.name} instantiated with generic container`);
    }
    // Fallback: No DI - instantiate without dependencies
    else {
      controllerInstance = new ControllerClass();
      fastify.log.warn(
        `Controller ${ControllerClass.name} instantiated without dependencies - consider using DI bridge plugin`
      );
    }

    // Get controller metadata
    const controllerPrefix = getControllerPrefix(ControllerClass);
    const routes = getControllerRoutes(ControllerClass);
    const routeOptions = getAllRouteOptions(ControllerClass);

    // Register each route
    for (const route of routes) {
      registerRoute(
        fastify,
        controllerInstance,
        route,
        routeOptions[route.methodName],
        combinePaths(prefix, controllerPrefix),
        ControllerClass
      );
    }
  }
}

/**
 * Register a single route with Fastify
 */
function registerRoute(
  fastify: FastifyInstance,
  controllerInstance: unknown,
  route: RouteDefinition,
  routeOpts: unknown,
  basePath: string,
  ControllerClass: ControllerConstructor
): void {
  const { requestMethod, path, methodName } = route;

  // Build full path
  const fullPath = combinePaths(basePath, path);

  // Get HTTP method in lowercase
  const httpMethod = requestMethod.toLowerCase() as HttpVerb;

  // Get middleware for this route
  const middleware = getEffectiveMiddleware(ControllerClass, methodName);

  // Create route handler
  const routeHandler = createRouteHandler(controllerInstance, methodName, middleware);

  // Register route with Fastify
  if (routeOpts) {
    // Clone options to avoid mutation
    const opts = { ...routeOpts } as any;

    // Add preHandler hooks for middleware
    if (middleware.length > 0) {
      const existingPreHandler = opts.preHandler || [];
      const preHandlers = Array.isArray(existingPreHandler)
        ? existingPreHandler
        : [existingPreHandler];

      opts.preHandler = [...middleware, ...preHandlers];
    }

    fastify[httpMethod](fullPath, opts, routeHandler);
  } else {
    // No options, but we might still have middleware
    if (middleware.length > 0) {
      fastify[httpMethod](fullPath, { preHandler: middleware }, routeHandler);
    } else {
      fastify[httpMethod](fullPath, routeHandler);
    }
  }

  fastify.log.debug(`Registered route: ${requestMethod} ${fullPath}`);
}

/**
 * Create a route handler that executes middleware
 */
function createRouteHandler(
  controllerInstance: unknown,
  methodName: string | symbol,
  _middleware: MiddlewareFunction[]
): (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Execute the controller method
    const result = await (controllerInstance as Record<string | symbol, any>)[methodName](
      req,
      reply
    );

    // If the controller method didn't send a response, send the result
    if (!reply.sent && result !== undefined) {
      return reply.send(result);
    }

    return result;
  };
}

/**
 * Export as Fastify plugin
 */
export const controllerPluginFactory = fastifyPlugin(controllerPlugin, {
  name: 'fastify-kick-start-controller',
  fastify: '5.x',
});

export { controllerPlugin };
