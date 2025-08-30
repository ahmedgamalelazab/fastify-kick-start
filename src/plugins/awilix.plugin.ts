import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

/**
 * Awilix Integration Plugin for Fastify Kick Start
 *
 * This plugin provides seamless integration with Awilix IOC container,
 * following the patterns established in the learn-from examples.
 *
 * Features:
 * - Automatic container decoration on Fastify instance
 * - Request-scoped dependency injection
 * - Automatic scope cleanup on response/error
 * - Compatible with the controller plugin's smart DI resolution
 */

export interface AwilixContainer {
  cradle: any;
  createScope(): AwilixContainer;
  dispose(): Promise<void>;
  resolve<T = any>(name: string): T;
}

export interface AwilixPluginOptions {
  container: AwilixContainer;
  disposeOnResponse?: boolean;
  disposeOnClose?: boolean;
  enableRequestScoping?: boolean;
}

/**
 * Awilix plugin implementation
 */
function awilixPlugin(fastify: FastifyInstance, options: AwilixPluginOptions): void {
  const {
    container,
    disposeOnResponse = true,
    disposeOnClose = true,
    enableRequestScoping = true,
  } = options;

  // Store scope references for cleanup
  const scopeMap = new WeakMap<FastifyRequest, AwilixContainer>();

  // Decorate Fastify instance with container
  fastify.decorate('diContainer', container);

  // For backward compatibility, also add direct cradle access
  fastify.decorate('diCradle', container.cradle);

  // Decorate request with scoped container access
  if (enableRequestScoping) {
    fastify.decorateRequest('diScope', {
      getter(this: FastifyRequest) {
        let scope = scopeMap.get(this);
        if (!scope) {
          scope = container.createScope();
          scopeMap.set(this, scope);
        }
        return scope;
      },
    });

    // Create request scope on each request
    fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
      const scope = container.createScope();
      scopeMap.set(request, scope);

      fastify.log.debug('Created Awilix scope for request');
    });
  }

  // Cleanup on response
  if (disposeOnResponse) {
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const scope = scopeMap.get(request);
      if (scope) {
        try {
          await scope.dispose();
          scopeMap.delete(request);

          fastify.log.debug(
            {
              url: request.url,
              method: request.method,
              statusCode: reply.statusCode,
            },
            'Disposed Awilix scope after successful response'
          );
        } catch (error) {
          fastify.log.warn(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              url: request.url,
              method: request.method,
            },
            'Failed to dispose Awilix scope on response'
          );
        }
      }
    });
  }

  // Cleanup on error
  fastify.addHook(
    'onError',
    async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      const scope = scopeMap.get(request);
      if (scope) {
        try {
          await scope.dispose();
          scopeMap.delete(request);

          fastify.log.debug(
            {
              url: request.url,
              method: request.method,
              error: error.message,
            },
            'Disposed Awilix scope after request error'
          );
        } catch (disposeError) {
          fastify.log.warn(
            {
              disposeError:
                disposeError instanceof Error ? disposeError.message : 'Unknown dispose error',
              originalError: error.message,
              url: request.url,
              method: request.method,
            },
            'Failed to dispose Awilix scope on error'
          );
        }
      }
    }
  );

  // Cleanup container on server close
  if (disposeOnClose) {
    fastify.addHook('onClose', async (_instance: FastifyInstance) => {
      try {
        await container.dispose();
        fastify.log.info('Disposed Awilix container on server close');
      } catch (error) {
        fastify.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to dispose Awilix container on server close'
        );
      }
    });
  }

  fastify.log.info('Awilix plugin registered successfully');
}

/**
 * Export as Fastify plugin
 */
export const awilixPluginFactory = fastifyPlugin(awilixPlugin, {
  name: 'fastify-kick-start-awilix',
  fastify: '5.x',
});

export { awilixPlugin };

// Extend Fastify types for Awilix integration
declare module 'fastify' {
  interface FastifyRequest {
    diScope: AwilixContainer;
  }
}
