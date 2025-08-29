/**
 * Basic functionality tests
 */

import { Type } from '@sinclair/typebox';

import {
    Controller,
    Get,
    Opts,
    Post,
    createQuickServer,
} from '../src';

// Test controller
@Controller('/test')
class TestController {
  @Get('/')
  @Opts({
    schema: {
      response: {
        200: Type.Object({
          message: Type.String(),
        }),
      },
    },
  })
  async getTest() {
    return { message: 'Hello, World!' };
  }

  @Post('/echo')
  @Opts({
    schema: {
      body: Type.Object({
        text: Type.String(),
      }),
      response: {
        200: Type.Object({
          echo: Type.String(),
        }),
      },
    },
  })
  async postEcho(req: any) {
    return { echo: req.body.text };
  }
}

describe('Fastify Kick-Start Library', () => {
  let app: any;

  beforeAll(async () => {
    app = await createQuickServer([TestController], {
      swagger: {
        enabled: false, // Disable for testing
      },
      swaggerUi: {
        enabled: false, // Disable for testing
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Controller Registration', () => {
    it('should register GET route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: 'Hello, World!',
      });
    });

    it('should register POST route with body validation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/echo',
        payload: {
          text: 'Hello, Echo!',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        echo: 'Hello, Echo!',
      });
    });

    it('should validate request body schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/echo',
        payload: {
          // Missing required 'text' field
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Health Check', () => {
    it('should have default health check when no controllers registered', async () => {
      const healthApp = await createQuickServer([], {
        swagger: { enabled: false },
        swaggerUi: { enabled: false },
      });

      const response = await healthApp.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');

      await healthApp.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle method not allowed', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/test',
      });

      expect(response.statusCode).toBe(404); // Fastify returns 404 for unregistered routes
    });
  });
});
