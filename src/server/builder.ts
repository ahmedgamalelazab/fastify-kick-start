import cors from '@fastify/cors';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';

import { controllerPluginFactory } from '../plugins/controller.plugin';
import { swaggerPluginFactory } from '../plugins/swagger.plugin';
import { ControllerConstructor, ServerBuilderOptions } from '../types';

/**
 * Fastify server builder with opinionated defaults and plugin integration
 * 
 * This builder creates a Fastify instance with common plugins and configurations
 * pre-configured for typical REST API development. It includes:
 * - TypeBox type provider for schema validation
 * - Swagger/OpenAPI documentation
 * - CORS support
 * - Error handling
 * - Logging
 * - Controller registration
 */
export class FastifyServerBuilder {
  private fastifyOptions: FastifyServerOptions = {};
  private builderOptions: ServerBuilderOptions = {};
  private controllers: ControllerConstructor[] = [];
  private customPlugins: Array<{ plugin: any; options?: any }> = [];

  /**
   * Set Fastify server options
   */
  withFastifyOptions(options: FastifyServerOptions): this {
    this.fastifyOptions = { ...this.fastifyOptions, ...options };
    return this;
  }

  /**
   * Configure logging
   */
  withLogging(options: {
    enabled?: boolean;
    level?: string;
    name?: string;
    prettyPrint?: boolean;
  }): this {
    this.builderOptions.logging = { ...this.builderOptions.logging, ...options };
    
    if (options.enabled !== false) {
      this.fastifyOptions.logger = {
        level: options.level || 'info',
        name: options.name || 'fastify-app',
        ...(options.prettyPrint && {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }),
      };
    }
    
    return this;
  }

  /**
   * Configure Swagger/OpenAPI documentation
   */
  withSwagger(options: NonNullable<ServerBuilderOptions['swagger']>): this {
    this.builderOptions.swagger = { ...this.builderOptions.swagger, ...options };
    return this;
  }

  /**
   * Configure Swagger UI
   */
  withSwaggerUI(options: NonNullable<ServerBuilderOptions['swaggerUi']>): this {
    this.builderOptions.swaggerUi = { ...this.builderOptions.swaggerUi, ...options };
    return this;
  }

  /**
   * Configure CORS
   */
  withCors(options: NonNullable<ServerBuilderOptions['cors']>): this {
    this.builderOptions.cors = { ...this.builderOptions.cors, ...options };
    return this;
  }

  /**
   * Configure error handling
   */
  withErrorHandler(options: NonNullable<ServerBuilderOptions['errorHandler']>): this {
    this.builderOptions.errorHandler = { ...this.builderOptions.errorHandler, ...options };
    return this;
  }

  /**
   * Register controllers
   */
  withControllers(controllers: ControllerConstructor[]): this {
    this.controllers = [...this.controllers, ...controllers];
    return this;
  }

  /**
   * Register a custom plugin
   */
  withPlugin(plugin: any, options?: any): this {
    this.customPlugins.push({ plugin, options });
    return this;
  }

  /**
   * Build and configure the Fastify instance
   */
  async build(): Promise<FastifyInstance> {
    // Create Fastify instance with TypeBox provider
    const app = fastify(this.fastifyOptions).withTypeProvider<TypeBoxTypeProvider>();

    // Register CORS if enabled
    if (this.builderOptions.cors?.enabled !== false) {
      await app.register(cors, this.builderOptions.cors?.options || {
        origin: true,
        credentials: true,
      });
    }

    // Register custom error handler
    if (this.builderOptions.errorHandler?.enabled !== false) {
      const errorHandler = this.builderOptions.errorHandler?.handler || this.defaultErrorHandler;
      app.setErrorHandler(errorHandler);
    }

    // Register Swagger documentation
    if (this.builderOptions.swagger?.enabled !== false || this.builderOptions.swaggerUi?.enabled !== false) {
      await app.register(swaggerPluginFactory, {
        swagger: this.builderOptions.swagger,
        swaggerUi: this.builderOptions.swaggerUi,
      });
    }

    // Register custom plugins
    for (const { plugin, options } of this.customPlugins) {
      await app.register(plugin, options);
    }

    // Register controllers
    if (this.controllers.length > 0) {
      await app.register(controllerPluginFactory, {
        controllers: this.controllers,
      });
    }

    // Add health check endpoint if no controllers are registered
    if (this.controllers.length === 0) {
      app.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }));
    }

    return app;
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler = (error: Error, req: any, reply: any) => {
    const statusCode = (error as any).statusCode || 500;
    
    req.log.error(error, 'Request error');

    // Don't expose internal errors in production
    const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error.message;

    reply.code(statusCode).send({
      statusCode,
      error: this.getErrorName(statusCode),
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  };

  /**
   * Get error name from status code
   */
  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return errorNames[statusCode] || 'Unknown Error';
  }
}

/**
 * Create a new Fastify server builder
 */
export const createServer = (): FastifyServerBuilder => {
  return new FastifyServerBuilder();
};

/**
 * Quick server creation with minimal configuration
 */
export const createQuickServer = async (
  controllers: ControllerConstructor[],
  options: ServerBuilderOptions = {}
): Promise<FastifyInstance> => {
  return createServer()
    .withLogging({ enabled: true, level: 'info' })
    .withSwagger({
      enabled: true,
      info: {
        title: 'API Documentation',
        version: '1.0.0',
      },
    })
    .withSwaggerUI({ enabled: true })
    .withCors({ enabled: true })
    .withErrorHandler({ enabled: true })
    .withControllers(controllers)
    .build();
};
