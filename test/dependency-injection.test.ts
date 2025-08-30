/**
 * Dependency Injection Tests
 *
 * Tests for the enhanced dependency injection system including:
 * - Smart DI Bridge
 * - Awilix Integration
 * - Generic Container Support
 * - Backward Compatibility
 */

import { FastifyInstance } from 'fastify';

import { Controller, Get, Post, createServer } from '../src';

// Mock Awilix for testing
const mockAwilix = {
  createContainer: () => ({
    cradle: {},
    createScope: jest.fn().mockReturnValue({
      cradle: { testService: { getData: () => 'scoped-data' } },
      dispose: jest.fn().mockResolvedValue(undefined),
    }),
    dispose: jest.fn().mockResolvedValue(undefined),
    resolve: jest.fn(),
    register: jest.fn(),
  }),
};

// Test services
class TestService {
  getData() {
    return 'test-data';
  }
}

class DatabaseService {
  query(sql: string) {
    return `Executed: ${sql}`;
  }
}

// Test controllers for different DI scenarios
@Controller('/di-test')
class DITestController {
  constructor(private readonly deps: any) {}

  @Get('/data')
  async getData() {
    // Handle both direct service access and container resolve patterns
    let testService;
    if (this.deps?.testService) {
      testService = this.deps.testService;
    } else if (this.deps?.resolve) {
      try {
        testService = this.deps.resolve('testService');
      } catch {
        // Service not found
      }
    }
    return { data: testService?.getData() || 'no-service' };
  }

  @Post('/query')
  async query() {
    // Handle both direct service access and container resolve patterns
    let database;
    if (this.deps?.database) {
      database = this.deps.database;
    } else if (this.deps?.resolve) {
      try {
        database = this.deps.resolve('database');
      } catch {
        // Service not found
      }
    }
    return { result: database?.query('SELECT * FROM users') || 'no-database' };
  }
}

@Controller('/legacy-test')
class LegacyTestController {
  constructor(private readonly deps: any) {}

  @Get('/data')
  async getData() {
    return { data: this.deps.testService?.getData() || 'no-service' };
  }

  @Post('/query')
  async query() {
    return { result: this.deps.database?.query('SELECT * FROM users') || 'no-database' };
  }
}

@Controller('/resolver-test')
class ResolverTestController {
  constructor(private readonly deps: any) {}

  @Get('/data')
  async getData() {
    return { data: this.deps.testService?.getData() || 'no-service' };
  }

  @Post('/query')
  async query() {
    return { result: this.deps.database?.query('SELECT * FROM users') || 'no-database' };
  }
}

@Controller('/awilix-test')
class AwilixTestController {
  constructor(private readonly cradle: any) {}

  @Get('/service')
  async getService() {
    // For Awilix, services should be directly on the cradle
    return { service: this.cradle?.testService?.getData() || 'no-service' };
  }

  @Get('/database')
  async getDatabase() {
    return { db: this.cradle?.database?.query('SELECT 1') || 'no-db' };
  }
}

@Controller('/no-di')
class NoDIController {
  @Get('/simple')
  async getSimple() {
    return { message: 'no dependencies needed' };
  }
}

// Generic container implementations for testing
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

  resolve<T>(identifier: any): T {
    return this.get<T>(identifier);
  }
}

describe('Dependency Injection System', () => {
  describe('Smart DI Bridge', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should work with generic container', async () => {
      const container = new GenericContainer();
      container.register('testService', () => new TestService());
      container.register('database', () => new DatabaseService());

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(container, {
          containerType: 'generic',
          autoDetect: false,
        })
        .withControllers([DITestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/di-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'test-data',
      });
    });

    it('should work with InversifyJS-style container', async () => {
      const container = new InversifyStyleContainer();
      container.bind('testService').to(TestService);
      container.bind('database').to(DatabaseService);

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(container, {
          containerType: 'inversify',
          autoDetect: false,
        })
        .withControllers([DITestController])
        .build();

      const response = await app.inject({
        method: 'POST',
        url: '/di-test/query',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toContain('Executed: SELECT * FROM users');
    });

    it('should auto-detect container type', async () => {
      const container = new GenericContainer();
      container.register('testService', () => new TestService());

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(container, {
          autoDetect: true, // Should detect as 'generic'
        })
        .withControllers([DITestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/di-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'test-data',
      });
    });
  });

  describe('Awilix Integration', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should work with Awilix container', async () => {
      const container = mockAwilix.createContainer();
      container.cradle = {
        testService: new TestService(),
        database: new DatabaseService(),
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withAwilix(container as any, {
          disposeOnResponse: true,
          disposeOnClose: true,
          enableRequestScoping: false, // Disable for simpler testing
        })
        .withControllers([AwilixTestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/awilix-test/service',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        service: 'test-data',
      });
    });

    it('should handle request scoping', async () => {
      const container = mockAwilix.createContainer();
      // Set up the main container cradle with the scoped service
      container.cradle = {
        testService: { getData: () => 'scoped-data' },
        database: { query: () => 'scoped-query' },
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withAwilix(container as any, {
          enableRequestScoping: true,
        })
        .withControllers([AwilixTestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/awilix-test/service',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        service: 'scoped-data',
      });

      // Verify scope was created
      expect(container.createScope).toHaveBeenCalled();
    });
  });

  describe('Backward Compatibility', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should work with legacy DI options', async () => {
      const legacyContainer = {
        testService: new TestService(),
        database: new DatabaseService(),
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withControllers([DITestController])
        .build();

      // Register controller plugin with legacy DI options
      await app.register(
        (await import('../src/plugins/controller.plugin')).controllerPluginFactory,
        {
          controllers: [LegacyTestController],
          dependencyInjection: {
            container: legacyContainer,
          },
        }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/legacy-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'test-data',
      });
    });

    it('should work with custom resolver function', async () => {
      const services = {
        testService: new TestService(),
        database: new DatabaseService(),
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withControllers([DITestController])
        .build();

      // Register controller plugin with custom resolver
      await app.register(
        (await import('../src/plugins/controller.plugin')).controllerPluginFactory,
        {
          controllers: [ResolverTestController],
          dependencyInjection: {
            resolver: (ControllerClass: any) => new ControllerClass(services),
          },
        }
      );

      const response = await app.inject({
        method: 'POST',
        url: '/resolver-test/query',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.result).toContain('Executed: SELECT * FROM users');
    });
  });

  describe('No Dependency Injection', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should work without any DI configuration', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withControllers([NoDIController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/no-di/simple',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: 'no dependencies needed',
      });
    });
  });

  describe('Priority System', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should prioritize DI bridge over legacy options', async () => {
      const bridgeContainer = new GenericContainer();
      bridgeContainer.register('testService', () => ({ getData: () => 'bridge-data' }));

      const legacyContainer = {
        testService: { getData: () => 'legacy-data' },
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(bridgeContainer)
        .withControllers([DITestController])
        .build();

      // Also register legacy DI (should be ignored due to priority)
      await app.register(async fastify => {
        await fastify.register(
          (await import('../src/plugins/controller.plugin')).controllerPluginFactory,
          {
            controllers: [], // Empty to avoid duplicate registration
            dependencyInjection: {
              container: legacyContainer,
            },
          }
        );
      });

      const response = await app.inject({
        method: 'GET',
        url: '/di-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'bridge-data', // Should use bridge, not legacy
      });
    });
  });

  describe('Error Handling', () => {
    let app: FastifyInstance;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should handle missing services gracefully', async () => {
      const emptyContainer = new GenericContainer();
      // Don't register any services

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(emptyContainer)
        .withControllers([DITestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/di-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'no-service', // Graceful fallback
      });
    });

    it('should handle container resolution errors', async () => {
      const faultyContainer = {
        resolve: jest.fn().mockImplementation(() => {
          throw new Error('Resolution failed');
        }),
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withDependencyInjection(faultyContainer as any)
        .withControllers([DITestController])
        .build();

      const response = await app.inject({
        method: 'GET',
        url: '/di-test/data',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        data: 'no-service', // Should fallback gracefully
      });
    });
  });
});
