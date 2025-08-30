/**
 * Awilix Plugin Tests
 *
 * Tests specifically for the Awilix integration plugin
 */

import { FastifyInstance } from 'fastify';
import { awilixPluginFactory } from '../src/plugins';
import { createServer } from '../src/server';

// Mock Awilix container for testing
class MockAwilixContainer {
  cradle = {
    testService: { getData: () => 'test-data' },
    logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };

  createScope = jest.fn().mockReturnValue({
    cradle: {
      testService: { getData: () => 'scoped-data' },
      scopedService: { getId: () => 'scope-123' },
    },
    dispose: jest.fn().mockResolvedValue(undefined),
  });

  dispose = jest.fn().mockResolvedValue(undefined);
  resolve = jest.fn();
}

describe('Awilix Plugin', () => {
  let app: FastifyInstance;
  let mockContainer: MockAwilixContainer;

  beforeEach(() => {
    mockContainer = new MockAwilixContainer();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe('Plugin Registration', () => {
    it('should register Awilix plugin successfully', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          disposeOnResponse: false,
          disposeOnClose: false,
          enableRequestScoping: false,
        })
        .build();

      // Verify decorations exist
      expect(app.diContainer).toBe(mockContainer);
      expect(app.diCradle).toBe(mockContainer.cradle);
    });

    it('should register with default options', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
        })
        .build();

      expect(app.diContainer).toBe(mockContainer);
      expect(app.diCradle).toBe(mockContainer.cradle);
    });
  });

  describe('Request Scoping', () => {
    it('should create request scopes when enabled', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: false, // Disable for easier testing
        })
        .build();

      // Add a simple route to test scoping
      app.get('/test-scope', async req => {
        return { scope: req.diScope ? 'available' : 'not-available' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-scope',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ scope: 'available' });
      expect(mockContainer.createScope).toHaveBeenCalled();
    });

    it('should not create request scopes when disabled', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: false,
        })
        .build();

      // Add a simple route
      app.get('/test-no-scope', async () => {
        return { message: 'no scoping' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-no-scope',
      });

      expect(response.statusCode).toBe(200);
      expect(mockContainer.createScope).not.toHaveBeenCalled();
    });
  });

  describe('Scope Disposal', () => {
    it('should dispose scopes on successful response', async () => {
      const mockScope = {
        cradle: { service: 'scoped' },
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      mockContainer.createScope.mockReturnValue(mockScope);

      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: true,
        })
        .build();

      app.get('/test-dispose', async () => {
        return { message: 'success' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-dispose',
      });

      expect(response.statusCode).toBe(200);
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should dispose scopes on error', async () => {
      const mockScope = {
        cradle: { service: 'scoped' },
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      mockContainer.createScope.mockReturnValue(mockScope);

      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: true,
        })
        .build();

      app.get('/test-error', async () => {
        throw new Error('Test error');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-error',
      });

      expect(response.statusCode).toBe(500);
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should handle disposal errors gracefully', async () => {
      const mockScope = {
        cradle: { service: 'scoped' },
        dispose: jest.fn().mockRejectedValue(new Error('Disposal failed')),
      };

      mockContainer.createScope.mockReturnValue(mockScope);

      app = await createServer()
        .withLogging({ enabled: true, level: 'debug' }) // Enable logging to capture warnings
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: true,
        })
        .build();

      app.get('/test-disposal-error', async () => {
        return { message: 'success' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-disposal-error',
      });

      // Should still return success despite disposal error
      expect(response.statusCode).toBe(200);
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should not dispose when disposeOnResponse is false', async () => {
      const mockScope = {
        cradle: { service: 'scoped' },
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      mockContainer.createScope.mockReturnValue(mockScope);

      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: false,
        })
        .build();

      app.get('/test-no-dispose', async () => {
        return { message: 'success' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-no-dispose',
      });

      expect(response.statusCode).toBe(200);
      expect(mockScope.dispose).not.toHaveBeenCalled();
    });
  });

  describe('Container Disposal on Close', () => {
    it('should dispose container on server close when enabled', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          disposeOnClose: true,
        })
        .build();

      await app.close();

      expect(mockContainer.dispose).toHaveBeenCalled();
    });

    it('should not dispose container on server close when disabled', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          disposeOnClose: false,
        })
        .build();

      await app.close();

      expect(mockContainer.dispose).not.toHaveBeenCalled();
    });

    it('should handle container disposal errors gracefully', async () => {
      mockContainer.dispose.mockRejectedValue(new Error('Container disposal failed'));

      app = await createServer()
        .withLogging({ enabled: true, level: 'debug' }) // Enable logging to capture errors
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          disposeOnClose: true,
        })
        .build();

      // Should not throw despite disposal error
      await expect(app.close()).resolves.not.toThrow();
      expect(mockContainer.dispose).toHaveBeenCalled();
    });
  });

  describe('Request Scope Getter', () => {
    it('should provide lazy scope creation via getter', async () => {
      const mockScope1 = {
        cradle: { service: 'scope1' },
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      const mockScope2 = {
        cradle: { service: 'scope2' },
        dispose: jest.fn().mockResolvedValue(undefined),
      };

      mockContainer.createScope.mockReturnValueOnce(mockScope1).mockReturnValueOnce(mockScope2);

      app = await createServer()
        .withLogging({ enabled: false })
        .withPlugin(awilixPluginFactory, {
          container: mockContainer,
          enableRequestScoping: true,
          disposeOnResponse: false,
        })
        .build();

      app.get('/test-lazy-scope', async req => {
        // Access scope multiple times - should return same instance
        const scope1 = req.diScope;
        const scope2 = req.diScope;

        return {
          same: scope1 === scope2,
          service: scope1.cradle.service,
        };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-lazy-scope',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.same).toBe(true);
      expect(body.service).toBe('scope1');

      // Should only create one scope per request (onRequest hook creates it)
      expect(mockContainer.createScope).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with Server Builder', () => {
    it('should work with server builder withAwilix method', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withAwilix(mockContainer as any, {
          disposeOnResponse: true,
          disposeOnClose: true,
          enableRequestScoping: true,
        })
        .build();

      expect(app.diContainer).toBe(mockContainer);
      expect(app.diCradle).toBe(mockContainer.cradle);
    });

    it('should use default options with server builder', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withAwilix(mockContainer as any)
        .build();

      expect(app.diContainer).toBe(mockContainer);
      expect(app.diCradle).toBe(mockContainer.cradle);
    });
  });
});
