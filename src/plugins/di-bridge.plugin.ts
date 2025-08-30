import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

/**
 * Dependency Injection Bridge Plugin
 *
 * This plugin creates a smart bridge between different IOC containers and the controller plugin.
 * It supports multiple DI container types and provides a unified interface for dependency resolution.
 */

export interface DIContainer {
  resolve<T = any>(name: string | symbol): T;
  cradle?: any; // For Awilix-style containers
  get?<T = any>(name: string | symbol): T; // For other container types
  [key: string]: any;
}

export interface DIBridgeOptions {
  container: DIContainer;
  containerType?: 'awilix' | 'inversify' | 'tsyringe' | 'generic';
  autoDetect?: boolean;
}

export interface DIResolver {
  resolve<T = any>(target: new (...args: any[]) => T): T;
  resolveByName<T = any>(name: string | symbol): T;
  getCradle?(): any;
}

/**
 * Smart DI resolver that adapts to different container types
 */
class SmartDIResolver implements DIResolver {
  private containerType: string;

  constructor(
    private container: DIContainer,
    containerType?: string
  ) {
    this.containerType = containerType || this.detectContainerType();
  }

  private detectContainerType(): string {
    if (this.container.cradle) return 'awilix';
    if (this.container.get && typeof this.container.get === 'function') return 'inversify';
    if (this.container.resolve && typeof this.container.resolve === 'function') return 'generic';
    return 'unknown';
  }

  resolve<T = any>(target: new (...args: any[]) => T): T {
    switch (this.containerType) {
      case 'awilix':
        // Awilix: instantiate with cradle
        return new target(this.container.cradle);

      case 'inversify':
        // InversifyJS: try container.get first, then fallback to constructor injection
        if (this.container.get) {
          try {
            return this.container.get(target as any);
          } catch {
            // Fallback: instantiate with container
            return new target(this.container);
          }
        } else {
          // No get method, use constructor injection
          return new target(this.container);
        }

      case 'tsyringe':
        // TSyringe: use container.resolve
        try {
          return this.container.resolve(target as any);
        } catch {
          // Fallback: instantiate with container
          return new target(this.container);
        }

      case 'generic':
      default:
        // Generic: For most generic containers, we can't resolve constructor functions
        // so we directly instantiate with the container
        return new target(this.container);
    }
  }

  resolveByName<T = any>(name: string | symbol): T {
    switch (this.containerType) {
      case 'awilix':
        return this.container.cradle[name as string];

      case 'inversify':
        return this.container.get!(name);

      case 'tsyringe':
      case 'generic':
      default:
        return this.container.resolve(name);
    }
  }

  getCradle(): any {
    switch (this.containerType) {
      case 'awilix':
        return this.container.cradle;
      default:
        return this.container;
    }
  }
}

/**
 * DI Bridge plugin implementation
 */
function diBridgePlugin(fastify: FastifyInstance, options: DIBridgeOptions): void {
  const { container, containerType, autoDetect = true } = options;

  // Create smart resolver
  const resolver = new SmartDIResolver(container, autoDetect ? undefined : containerType);

  // Decorate Fastify instance with DI capabilities
  fastify.decorate('diContainer', container);
  fastify.decorate('diResolver', resolver);

  // Container is accessible via fastify.diContainer
  // Users can access cradle via fastify.diContainer.cradle if needed

  fastify.log.info(`DI Bridge initialized with container type: ${(resolver as any).containerType}`);
}

/**
 * Export as Fastify plugin
 */
export const diBridgePluginFactory = fastifyPlugin(diBridgePlugin, {
  name: 'fastify-kick-start-di-bridge',
  fastify: '5.x',
});

export { diBridgePlugin, SmartDIResolver };

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    diContainer: DIContainer;
    diResolver: DIResolver;
  }
}
