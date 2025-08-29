import { FastifyReply, FastifyRequest, RouteShorthandOptions } from 'fastify';

/**
 * HTTP Methods supported by the decorators
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

/**
 * HTTP Verbs for internal use
 */
export type HttpVerb = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

/**
 * Route definition metadata
 */
export interface RouteDefinition {
  requestMethod: HttpMethod;
  path?: string;
  methodName: string | symbol;
}

/**
 * Controller constructor type
 */
export interface ControllerConstructor {
  new (...args: any[]): any;
}

/**
 * Route handler function type
 */
export type RouteHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<any> | any;

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  req: FastifyRequest,
  reply: FastifyReply,
  next?: () => void
) => Promise<void> | void;

/**
 * Authentication strategy interface
 */
export interface AuthStrategy {
  name: string;
  authenticate: MiddlewareFunction;
}

/**
 * Controller plugin options
 */
export interface ControllerPluginOptions {
  controllers: ControllerConstructor[];
  middleware?: MiddlewareFunction[];
  prefix?: string;
  dependencyInjection?: {
    container?: any;
    resolver?: (controller: ControllerConstructor) => any;
  };
}

/**
 * Server builder options
 */
export interface ServerBuilderOptions {
  swagger?: {
    enabled?: boolean;
    info?: {
      title?: string;
      description?: string;
      version?: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    security?: any[];
    components?: {
      securitySchemes?: Record<string, any>;
    };
  };
  swaggerUi?: {
    enabled?: boolean;
    routePrefix?: string;
    uiConfig?: Record<string, any>;
  };
  cors?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
  logging?: {
    enabled?: boolean;
    level?: string;
    name?: string;
  };
  errorHandler?: {
    enabled?: boolean;
    handler?: (error: Error, req: FastifyRequest, reply: FastifyReply) => void;
  };
}

/**
 * Metadata keys for decorators
 */
export const METADATA_KEYS = {
  CONTROLLER: 'fastify:controller',
  PREFIX: 'fastify:prefix',
  ROUTES: 'fastify:routes',
  OPTIONS: 'fastify:options',
  MIDDLEWARE: 'fastify:middleware',
  AUTH: 'fastify:auth',
} as const;

/**
 * Route options type extending Fastify's RouteShorthandOptions
 */
export interface RouteOptions extends RouteShorthandOptions {
  middleware?: MiddlewareFunction[];
  auth?: string | AuthStrategy;
}

/**
 * Controller metadata interface
 */
export interface ControllerMetadata {
  prefix?: string;
  routes: RouteDefinition[];
  options: Record<string | symbol, RouteOptions>;
  middleware?: MiddlewareFunction[];
  auth?: string | AuthStrategy;
}

/**
 * Plugin registration function type
 */
export type PluginFunction = (fastify: any, options: any) => Promise<void> | void;
