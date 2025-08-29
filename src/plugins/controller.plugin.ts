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
 * - Dependency injection
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

    // Create controller instance
    let controllerInstance: any;
    if (dependencyInjection?.resolver) {
      controllerInstance = dependencyInjection.resolver(ControllerClass);
    } else if (dependencyInjection?.container) {
      // Generic container support
      controllerInstance = new ControllerClass(dependencyInjection.container);
    } else {
      controllerInstance = new ControllerClass();
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
  controllerInstance: any,
  route: RouteDefinition,
  routeOpts: any,
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
    const opts = { ...routeOpts };

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
  controllerInstance: any,
  methodName: string | symbol,
  _middleware: MiddlewareFunction[]
): (req: FastifyRequest, reply: FastifyReply) => Promise<any> {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Execute the controller method
    const result = await controllerInstance[methodName](req, reply);

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
