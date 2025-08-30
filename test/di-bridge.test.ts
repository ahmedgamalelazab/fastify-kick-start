/**
 * DI Bridge Plugin Tests
 *
 * Tests specifically for the SmartDIResolver and DI Bridge plugin functionality
 */

import { FastifyInstance } from 'fastify';
import { SmartDIResolver, diBridgePluginFactory } from '../src/plugins';
import { createServer } from '../src/server';

// Mock containers for testing
class MockAwilixContainer {
  cradle = { service: 'awilix-service' };
  resolve = jest.fn();
}

class MockInversifyContainer {
  get = jest.fn().mockReturnValue('inversify-service');
  resolve = jest.fn();
}

class MockTSyringeContainer {
  resolve = jest.fn().mockReturnValue('tsyringe-service');
  get = jest.fn();
}

class MockGenericContainer {
  resolve = jest.fn().mockReturnValue('generic-service');
}

class TestClass {
  constructor(public deps: any) {}
}

describe('SmartDIResolver', () => {
  describe('Container Type Detection', () => {
    it('should detect Awilix container', () => {
      const container = new MockAwilixContainer();
      const resolver = new SmartDIResolver(container);

      expect((resolver as any).containerType).toBe('awilix');
    });

    it('should detect InversifyJS container', () => {
      const container = new MockInversifyContainer();
      const resolver = new SmartDIResolver(container);

      expect((resolver as any).containerType).toBe('inversify');
    });

    it('should detect generic container', () => {
      const container = new MockGenericContainer();
      const resolver = new SmartDIResolver(container);

      expect((resolver as any).containerType).toBe('generic');
    });

    it('should use provided container type', () => {
      const container = new MockGenericContainer();
      const resolver = new SmartDIResolver(container, 'tsyringe');

      expect((resolver as any).containerType).toBe('tsyringe');
    });
  });

  describe('Resolution Strategies', () => {
    it('should resolve with Awilix strategy', () => {
      const container = new MockAwilixContainer();
      const resolver = new SmartDIResolver(container, 'awilix');

      const instance = resolver.resolve(TestClass);

      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.deps).toBe(container.cradle);
    });

    it('should resolve with InversifyJS strategy', () => {
      const container = new MockInversifyContainer();
      const resolver = new SmartDIResolver(container, 'inversify');

      const instance = resolver.resolve(TestClass);

      expect(container.get).toHaveBeenCalledWith(TestClass);
      expect(instance).toBe('inversify-service');
    });

    it('should fallback to constructor injection for InversifyJS', () => {
      const container = new MockInversifyContainer();
      container.get.mockImplementation(() => {
        throw new Error('Not found');
      });

      const resolver = new SmartDIResolver(container, 'inversify');
      const instance = resolver.resolve(TestClass);

      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.deps).toBe(container);
    });

    it('should resolve with TSyringe strategy', () => {
      const container = new MockTSyringeContainer();
      const resolver = new SmartDIResolver(container, 'tsyringe');

      const instance = resolver.resolve(TestClass);

      expect(container.resolve).toHaveBeenCalledWith(TestClass);
      expect(instance).toBe('tsyringe-service');
    });

    it('should fallback to constructor injection for TSyringe', () => {
      const container = new MockTSyringeContainer();
      container.resolve.mockImplementation(() => {
        throw new Error('Not found');
      });

      const resolver = new SmartDIResolver(container, 'tsyringe');
      const instance = resolver.resolve(TestClass);

      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.deps).toBe(container);
    });

    it('should resolve with generic strategy', () => {
      const container = new MockGenericContainer();
      const resolver = new SmartDIResolver(container, 'generic');

      const instance = resolver.resolve(TestClass);

      // Generic containers use constructor injection, not resolve
      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.deps).toBe(container);
    });

    it('should fallback to constructor injection for generic', () => {
      const container = new MockGenericContainer();
      container.resolve.mockImplementation(() => {
        throw new Error('Not found');
      });

      const resolver = new SmartDIResolver(container, 'generic');
      const instance = resolver.resolve(TestClass);

      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.deps).toBe(container);
    });
  });

  describe('Service Resolution by Name', () => {
    it('should resolve by name for Awilix', () => {
      const container = new MockAwilixContainer();
      const resolver = new SmartDIResolver(container, 'awilix');

      const service = resolver.resolveByName('service');

      expect(service).toBe('awilix-service');
    });

    it('should resolve by name for InversifyJS', () => {
      const container = new MockInversifyContainer();
      const resolver = new SmartDIResolver(container, 'inversify');

      const service = resolver.resolveByName('TestService');

      expect(container.get).toHaveBeenCalledWith('TestService');
      expect(service).toBe('inversify-service');
    });

    it('should resolve by name for generic containers', () => {
      const container = new MockGenericContainer();
      const resolver = new SmartDIResolver(container, 'generic');

      const service = resolver.resolveByName('TestService');

      expect(container.resolve).toHaveBeenCalledWith('TestService');
      expect(service).toBe('generic-service');
    });
  });

  describe('Cradle Access', () => {
    it('should return cradle for Awilix containers', () => {
      const container = new MockAwilixContainer();
      const resolver = new SmartDIResolver(container, 'awilix');

      const cradle = resolver.getCradle();

      expect(cradle).toBe(container.cradle);
    });

    it('should return container for non-Awilix containers', () => {
      const container = new MockGenericContainer();
      const resolver = new SmartDIResolver(container, 'generic');

      const cradle = resolver.getCradle();

      expect(cradle).toBe(container);
    });
  });
});

describe('DI Bridge Plugin', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should register DI bridge plugin successfully', async () => {
    const container = new MockGenericContainer();

    app = await createServer()
      .withLogging({ enabled: false })
      .withPlugin(diBridgePluginFactory, {
        container,
        containerType: 'generic',
        autoDetect: false,
      })
      .build();

    // Verify decorations exist
    expect(app.diContainer).toBe(container);
    expect(app.diResolver).toBeDefined();
    expect(app.diResolver.resolve).toBeDefined();
    expect(app.diResolver.resolveByName).toBeDefined();
  });

  it('should auto-detect container type when enabled', async () => {
    const container = new MockAwilixContainer();

    app = await createServer()
      .withLogging({ enabled: false })
      .withPlugin(diBridgePluginFactory, {
        container,
        autoDetect: true,
      })
      .build();

    // Should detect as Awilix - cradle accessible via diContainer
    expect(app.diContainer.cradle).toBe(container.cradle);
  });

  it('should handle container without cradle', async () => {
    const container = new MockGenericContainer();

    app = await createServer()
      .withLogging({ enabled: false })
      .withPlugin(diBridgePluginFactory, {
        container,
        autoDetect: true,
      })
      .build();

    // Non-Awilix containers don't have cradle property
    expect(app.diContainer.cradle).toBeUndefined();
  });

  it('should work with explicit container type override', async () => {
    const container = new MockAwilixContainer();

    app = await createServer()
      .withLogging({ enabled: false })
      .withPlugin(diBridgePluginFactory, {
        container,
        containerType: 'generic', // Override auto-detection
        autoDetect: false,
      })
      .build();

    // Should treat as generic despite having cradle
    const instance = app.diResolver.resolve(TestClass);
    // Generic containers use constructor injection
    expect(instance).toBeInstanceOf(TestClass);
    expect(instance.deps).toBe(container);
  });
});
