import { FastifyInstance } from 'fastify';
import { createServer, createQuickServer } from '../src/server/builder';

describe('Swagger Multiple Servers Configuration', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Custom Servers Configuration', () => {
    it('should use single custom server', async () => {
      const customServer = {
        url: 'https://api.example.com',
        description: 'Production server',
      };

      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          servers: [customServer],
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify that custom server is used
      expect(spec.servers).toHaveLength(1);
      expect(spec.servers[0]).toEqual(customServer);
      expect(spec.servers).not.toContainEqual({
        url: 'http://localhost:3000',
        description: 'Development server',
      });
    });

    it('should use multiple custom servers', async () => {
      const customServers = [
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.example.com',
          description: 'Staging server',
        },
        {
          url: 'https://dev-api.example.com',
          description: 'Development server',
        },
      ];

      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Multi-Server API',
            version: '1.0.0',
          },
          servers: customServers,
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify that all custom servers are used
      expect(spec.servers).toHaveLength(3);
      expect(spec.servers).toEqual(customServers);

      // Verify each server individually
      expect(spec.servers[0]).toEqual({
        url: 'https://api.example.com',
        description: 'Production server',
      });
      expect(spec.servers[1]).toEqual({
        url: 'https://staging-api.example.com',
        description: 'Staging server',
      });
      expect(spec.servers[2]).toEqual({
        url: 'https://dev-api.example.com',
        description: 'Development server',
      });
    });

    it('should handle servers with different protocols and ports', async () => {
      const customServers = [
        {
          url: 'https://secure-api.example.com:443',
          description: 'HTTPS Production server',
        },
        {
          url: 'http://internal-api.example.com:8080',
          description: 'HTTP Internal server',
        },
        {
          url: 'ws://websocket-api.example.com:9000',
          description: 'WebSocket server',
        },
      ];

      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Protocol Test API',
            version: '2.0.0',
          },
          servers: customServers,
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      expect(spec.servers).toHaveLength(3);
      expect(spec.servers).toEqual(customServers);
    });
  });

  describe('Default Servers Behavior', () => {
    it('should use default localhost server when no servers provided', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Default Server API',
            version: '1.0.0',
          },
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify that default server is used
      expect(spec.servers).toContainEqual({
        url: 'http://localhost:3000',
        description: 'Development server',
      });
    });

    it('should override default servers when custom servers are provided', async () => {
      const customServers = [
        {
          url: 'https://production.example.com',
          description: 'Production API',
        },
      ];

      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Override Test API',
            version: '1.0.0',
          },
          servers: customServers,
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify that only custom servers are used, not defaults
      expect(spec.servers).toEqual(customServers);
      expect(spec.servers).not.toContainEqual({
        url: 'http://localhost:3000',
        description: 'Development server',
      });
    });
  });

  describe('createQuickServer Integration', () => {
    it('should work with createQuickServer and multiple servers', async () => {
      const customServers = [
        {
          url: 'https://quick-prod.example.com',
          description: 'Quick Production API',
        },
        {
          url: 'https://quick-staging.example.com',
          description: 'Quick Staging API',
        },
      ];

      app = await createQuickServer([], {
        swagger: {
          info: {
            title: 'Quick Server Multi-Server API',
            version: '3.0.0',
            description: 'API with multiple servers via createQuickServer',
          },
          servers: customServers,
        },
      });

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify servers configuration
      expect(spec.servers).toEqual(customServers);

      // Verify info configuration
      expect(spec.info.title).toBe('Quick Server Multi-Server API');
      expect(spec.info.version).toBe('3.0.0');
      expect(spec.info.description).toBe('API with multiple servers via createQuickServer');
    });

    it('should merge servers with other swagger options in createQuickServer', async () => {
      const customServers = [
        {
          url: 'https://secure.example.com',
          description: 'Secure API Server',
        },
      ];

      app = await createQuickServer([], {
        swagger: {
          info: {
            title: 'Secure API',
            version: '1.0.0',
          },
          servers: customServers,
          security: [{ bearerAuth: [] }],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        },
      });

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Verify servers
      expect(spec.servers).toEqual(customServers);

      // Verify security configuration is preserved
      expect(spec.security).toEqual([{ bearerAuth: [] }]);
      expect(spec.components.securitySchemes.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty servers array', async () => {
      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Empty Servers API',
            version: '1.0.0',
          },
          servers: [],
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      // Should fall back to default servers when empty array is provided
      expect(spec.servers).toContainEqual({
        url: 'http://localhost:3000',
        description: 'Development server',
      });
    });

    it('should handle servers with minimal configuration', async () => {
      const minimalServers = [
        { url: 'https://minimal.example.com' }, // No description
      ];

      app = await createServer()
        .withLogging({ enabled: false })
        .withSwagger({
          enabled: true,
          info: {
            title: 'Minimal Server API',
            version: '1.0.0',
          },
          servers: minimalServers,
        })
        .withSwaggerUI({ enabled: true })
        .build();

      await app.ready();

      // Get the OpenAPI spec directly from fastify.swagger()
      const spec = (app as any).swagger();

      expect(spec.servers).toEqual(minimalServers);
      expect(spec.servers[0].url).toBe('https://minimal.example.com');
      expect(spec.servers[0].description).toBeUndefined();
    });
  });
});
