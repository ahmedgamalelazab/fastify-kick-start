import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

import {
    getAllRouteOptions,
    getControllerPrefix,
    getControllerRoutes,
    getEffectiveAuth,
    getEffectiveMiddleware,
    isController,
} from '../decorators';
import { combinePaths } from '../decorators/prefix.decorator';
import {
    AuthStrategy,
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
 * - Authentication strategies
 * - Dependency injection
 * - Route options (schema, hooks, etc.)
 */
async function controllerPlugin(
  fastify: FastifyInstance,
  options: ControllerPluginOptions
): Promise<void> {
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
      await registerRoute(
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
async function registerRoute(
  fastify: FastifyInstance,
  controllerInstance: any,
  route: RouteDefinition,
  routeOpts: any,
  basePath: string,
  ControllerClass: ControllerConstructor
): Promise<void> {
  const { requestMethod, path, methodName } = route;
  
  // Build full path
  const fullPath = combinePaths(basePath, path);
  
  // Get HTTP method in lowercase
  const httpMethod = requestMethod.toLowerCase() as HttpVerb;
  
  // Get middleware for this route
  const middleware = getEffectiveMiddleware(ControllerClass, methodName);
  
  // Get auth strategy for this route
  const authStrategy = getEffectiveAuth(ControllerClass, methodName);
  
  // Create route handler
  const routeHandler = createRouteHandler(
    controllerInstance,
    methodName,
    middleware,
    authStrategy
  );
  
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
 * Create a route handler that executes middleware and authentication
 */
function createRouteHandler(
  controllerInstance: any,
  methodName: string | symbol,
  middleware: MiddlewareFunction[],
  authStrategy?: string | AuthStrategy
): (req: FastifyRequest, reply: FastifyReply) => Promise<any> {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // Execute authentication if required
      if (authStrategy) {
        await executeAuth(req, reply, authStrategy);
      }
      
      // Execute the controller method
      const result = await controllerInstance[methodName](req, reply);
      
      // If the controller method didn't send a response, send the result
      if (!reply.sent && result !== undefined) {
        return reply.send(result);
      }
      
      return result;
    } catch (error) {
      // Let Fastify's error handler deal with it
      throw error;
    }
  };
}

/**
 * Execute authentication strategy
 */
async function executeAuth(
  req: FastifyRequest,
  reply: FastifyReply,
  authStrategy: string | AuthStrategy
): Promise<void> {
  if (typeof authStrategy === 'string') {
    // Named strategy - should be registered with the auth system
    // This is a placeholder - in a real implementation, you'd look up
    // the strategy from a registry
    throw new Error(`Authentication strategy '${authStrategy}' not found`);
  } else {
    // Custom strategy object
    await authStrategy.authenticate(req, reply);
  }
}

/**
 * Export as Fastify plugin
 */
export const controllerPluginFactory = fastifyPlugin(controllerPlugin, {
  name: 'fastify-kick-start-controller',
  fastify: '5.x',
});

export { controllerPlugin };
