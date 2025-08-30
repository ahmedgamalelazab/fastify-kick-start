/**
 * Dependency Injection Examples for Fastify Kick Start
 *
 * This file demonstrates how to use the enhanced dependency injection system
 * with different IOC containers including Awilix, InversifyJS, and custom containers.
 */

import { createServer } from '../src/server/builder';
import { Controller, Get } from '../src/decorators';

// Example 1: Using Awilix IOC Container
import { createContainer, asClass, asFunction, AwilixContainer } from 'awilix';

// Sample services for dependency injection
class UserService {
  constructor(private database: any) {}

  async getUser(id: string) {
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}

class DatabaseService {
  async query(sql: string) {
    return `Executing: ${sql}`;
  }
}

// Example controller that uses dependency injection
@Controller('/users')
class UserController {
  constructor(private readonly cradle: any) {}

  @Get('/:id')
  async getUser(req: any, reply: any) {
    const userService = this.cradle.userService;
    const user = await userService.getUser(req.params.id);
    return reply.send(user);
  }
}

// Example 1: Awilix Integration
async function exampleWithAwilix() {
  // Create Awilix container
  const container = createContainer();

  // Register dependencies
  container.register({
    database: asClass(DatabaseService).singleton(),
    userService: asClass(UserService).singleton(),
  });

  // Create server with Awilix
  const app = await createServer()
    .withLogging({ enabled: true, level: 'info' })
    .withAwilix(container as AwilixContainer, {
      disposeOnResponse: true,
      disposeOnClose: true,
      enableRequestScoping: true,
    })
    .withControllers([UserController])
    .build();

  return app;
}

// Example 2: Generic DI Container
class GenericContainer {
  private services = new Map();

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found`);
    }
    return factory();
  }
}

@Controller('/products')
class ProductController {
  constructor(private readonly container: GenericContainer) {}

  @Get('/:id')
  async getProduct(req: any, reply: any) {
    const productService = this.container.resolve<any>('productService');
    const product = await productService.getProduct(req.params.id);
    return reply.send(product);
  }
}

async function exampleWithGenericContainer() {
  // Create generic container
  const container = new GenericContainer();

  // Register services
  container.register('database', () => new DatabaseService());
  container.register('productService', () => ({
    getProduct: async (id: string) => ({ id, name: 'Sample Product', price: 99.99 }),
  }));

  // Create server with generic DI
  const app = await createServer()
    .withLogging({ enabled: true, level: 'info' })
    .withDependencyInjection(container, {
      containerType: 'generic',
      autoDetect: false,
    })
    .withControllers([ProductController])
    .build();

  return app;
}

// Example 3: InversifyJS-style Container
class InversifyStyleContainer {
  private services = new Map();

  bind<T>(identifier: any): { to: (constructor: new (...args: any[]) => T) => void } {
    return {
      to: (constructor: new (...args: any[]) => T) => {
        this.services.set(identifier, constructor);
      },
    };
  }

  get<T>(identifier: any): T {
    const Constructor = this.services.get(identifier);
    if (!Constructor) {
      throw new Error(`Service ${identifier} not found`);
    }
    return new Constructor(this);
  }
}

@Controller('/orders')
class OrderController {
  constructor(private readonly container: InversifyStyleContainer) {}

  @Get('/:id')
  async getOrder(req: any, reply: any) {
    const orderService = this.container.get<any>('OrderService');
    const order = await orderService.getOrder(req.params.id);
    return reply.send(order);
  }
}

async function exampleWithInversifyStyle() {
  // Create InversifyJS-style container
  const container = new InversifyStyleContainer();

  // Bind services
  container.bind('OrderService').to(
    class OrderService {
      async getOrder(id: string) {
        return { id, items: ['item1', 'item2'], total: 150.0 };
      }
    }
  );

  // Create server with InversifyJS-style DI
  const app = await createServer()
    .withLogging({ enabled: true, level: 'info' })
    .withDependencyInjection(container, {
      containerType: 'inversify',
      autoDetect: false,
    })
    .withControllers([OrderController])
    .build();

  return app;
}

// Example 4: Migration from Legacy DI
@Controller('/legacy')
class LegacyController {
  constructor(private readonly deps: any) {}

  @Get('/test')
  async test(req: any, reply: any) {
    return reply.send({ message: 'Legacy DI still works!' });
  }
}

async function exampleLegacyCompatibility() {
  const legacyContainer = { someService: { getData: () => 'legacy data' } };

  // This still works for backward compatibility
  const app = await createServer()
    .withLogging({ enabled: true, level: 'info' })
    .withControllers([LegacyController])
    .build();

  // Register controller plugin with legacy DI options
  await app.register(async fastify => {
    await fastify.register(
      import('../src/plugins/controller.plugin').then(m => m.controllerPluginFactory),
      {
        controllers: [LegacyController],
        dependencyInjection: {
          container: legacyContainer,
        },
      }
    );
  });

  return app;
}

export {
  exampleWithAwilix,
  exampleWithGenericContainer,
  exampleWithInversifyStyle,
  exampleLegacyCompatibility,
};
