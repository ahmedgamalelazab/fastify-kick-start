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
export type RouteHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  req: FastifyRequest,
  reply: FastifyReply,
  next?: () => void
) => Promise<void> | void;

/**
 * Dependency injection container interface
 */
export interface DIContainer {
  resolve<T = any>(name: string | symbol): T;
  cradle?: any; // For Awilix-style containers
  get?<T = any>(name: string | symbol): T; // For other container types
  [key: string]: any;
}

/**
 * DI resolver interface for smart dependency injection
 */
export interface DIResolver {
  resolve<T = any>(target: new (...args: any[]) => T): T;
  resolveByName<T = any>(name: string | symbol): T;
  getCradle?(): any;
}

/**
 * Controller plugin options with enhanced DI support
 */
export interface ControllerPluginOptions {
  controllers: ControllerConstructor[];
  middleware?: MiddlewareFunction[];
  prefix?: string;
  /** @deprecated Use DI bridge plugin instead for better container support */
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
} as const;

/**
 * Route options type extending Fastify's RouteShorthandOptions
 */
export interface RouteOptions extends RouteShorthandOptions {
  middleware?: MiddlewareFunction[];
}

/**
 * Controller metadata interface
 */
export interface ControllerMetadata {
  prefix?: string;
  routes: RouteDefinition[];
  options: Record<string | symbol, RouteOptions>;
  middleware?: MiddlewareFunction[];
}

/**
 * Plugin registration function type
 */
export type PluginFunction = (fastify: any, options: any) => Promise<void> | void;
