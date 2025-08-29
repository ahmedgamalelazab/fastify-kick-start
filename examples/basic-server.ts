/**
 * Basic Server Example
 *
 * This example demonstrates the simplest way to create a Fastify server
 * using the Kick-Start library with minimal configuration.
 */

import { Type } from '@sinclair/typebox';

import { Controller, Get, Opts, Post, createQuickServer } from '../src';

// Define schemas using TypeBox
const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  createdAt: Type.String({ format: 'date-time' }),
});

const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
});

// Sample data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date().toISOString() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date().toISOString() },
];

/**
 * Basic User Controller
 */
@Controller('/api/users')
export class UserController {
  @Get('/')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Get all users',
      description: 'Retrieve a list of all users',
      response: {
        200: Type.Array(UserSchema),
      },
    },
  })
  async getUsers() {
    return users;
  }

  @Get('/:id')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      description: 'Retrieve a specific user by their ID',
      params: Type.Object({
        id: Type.Number(),
      }),
      response: {
        200: UserSchema,
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async getUserById(req: any, reply: any) {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return user;
  }

  @Post('/')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Create a new user',
      description: 'Create a new user with the provided information',
      body: CreateUserSchema,
      response: {
        201: UserSchema,
        400: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async createUser(req: any, reply: any) {
    const { name, email } = req.body;

    // Check if email already exists
    if (users.some(u => u.email === email)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Email already exists',
      });
    }

    const newUser = {
      id: Math.max(...users.map(u => u.id)) + 1,
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    return reply.code(201).send(newUser);
  }
}

/**
 * Health Check Controller
 */
@Controller('/health')
export class HealthController {
  @Get('/')
  @Opts({
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check if the service is running',
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          uptime: Type.Number(),
        }),
      },
    },
  })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

/**
 * Start the server
 */
async function startServer() {
  try {
    // Create server with controllers
    const app = await createQuickServer([UserController, HealthController], {
      swagger: {
        info: {
          title: 'Basic API Example',
          description: 'A simple REST API built with Fastify Kick-Start',
          version: '1.0.0',
        },
      },
    });

    // Start listening
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';

    await app.listen({ port, host });

    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(console.error);
}
