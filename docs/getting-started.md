# Getting Started with Fastify Kick-Start

This guide will help you get up and running with Fastify Kick-Start, a powerful library for building REST APIs with TypeScript decorators and automatic documentation.

## Installation

```bash
npm install @jimmies-workspace/fastify-kick-start reflect-metadata
```

> **Note**: `reflect-metadata` is required for decorators to work properly.

## Your First API

Let's create a simple API with a user controller:

### 1. Create a Controller

```typescript
// controllers/user.controller.ts
import { Controller, Get, Post, Opts } from '@jimmies-workspace/fastify-kick-start';
import { Type } from '@sinclair/typebox';

const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String({ format: 'email' })
});

@Controller('/api/users')
export class UserController {
  private users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];

  @Get('/')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Get all users',
      response: {
        200: Type.Array(UserSchema)
      }
    }
  })
  async getUsers() {
    return this.users;
  }

  @Get('/:id')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Get user by ID',
      params: Type.Object({
        id: Type.Number()
      }),
      response: {
        200: UserSchema,
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String()
        })
      }
    }
  })
  async getUserById(req: any, reply: any) {
    const userId = parseInt(req.params.id);
    const user = this.users.find(u => u.id === userId);
    
    if (!user) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    return user;
  }

  @Post('/')
  @Opts({
    schema: {
      tags: ['Users'],
      summary: 'Create a new user',
      body: Type.Object({
        name: Type.String({ minLength: 1 }),
        email: Type.String({ format: 'email' })
      }),
      response: {
        201: UserSchema
      }
    }
  })
  async createUser(req: any, reply: any) {
    const newUser = {
      id: Math.max(...this.users.map(u => u.id)) + 1,
      ...req.body
    };
    
    this.users.push(newUser);
    
    return reply.code(201).send(newUser);
  }
}
```

### 2. Create the Server

```typescript
// server.ts
import { createQuickServer } from '@jimmies-workspace/fastify-kick-start';
import { UserController } from './controllers/user.controller';

async function startServer() {
  const app = await createQuickServer([UserController], {
    swagger: {
      info: {
        title: 'My First API',
        description: 'A simple user management API',
        version: '1.0.0'
      }
    }
  });

  try {
    await app.listen({ port: 3000, host: 'localhost' });
    console.log('🚀 Server running at http://localhost:3000');
    console.log('📚 API docs at http://localhost:3000/docs');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

### 3. Run Your API

```bash
npx ts-node server.ts
```

Your API is now running! Visit:
- `http://localhost:3000/api/users` - Get all users
- `http://localhost:3000/docs` - Interactive API documentation

## Key Concepts

### Controllers

Controllers are classes decorated with `@Controller` that group related routes together:

```typescript
@Controller('/api/products')  // Base path for all routes
export class ProductController {
  // Route methods go here
}
```

### Route Decorators

Use HTTP method decorators to define routes:

```typescript
@Get('/')           // GET /api/products
@Post('/')          // POST /api/products
@Put('/:id')        // PUT /api/products/:id
@Patch('/:id')      // PATCH /api/products/:id
@Delete('/:id')     // DELETE /api/products/:id
async handleRoute() {}
```

### Schema Validation

Use `@Opts` with TypeBox schemas for automatic validation and documentation:

```typescript
@Post('/users')
@Opts({
  schema: {
    body: Type.Object({
      name: Type.String({ minLength: 1 }),
      email: Type.String({ format: 'email' })
    }),
    response: {
      201: UserSchema,
      400: ErrorSchema
    }
  }
})
async createUser(req: any, reply: any) {
  // req.body is automatically validated
}
```

### Prefixes

Use `@Prefix` to add path prefixes (can be stacked):

```typescript
@Prefix('/api')
@Prefix('/v1')
@Controller('/users')
class UserController {
  // Routes will be prefixed with /api/v1/users
}
```

## Advanced Features


### Middleware

Apply middleware to controllers or routes:

```typescript
import { Middleware, loggingMiddleware, rateLimitMiddleware } from '@jimmies-workspace/fastify-kick-start';

@Middleware([loggingMiddleware(), rateLimitMiddleware()])
@Controller('/api')
export class ApiController {
  @Get('/data')
  @Middleware(customMiddleware)
  async getData() {
    // Middleware runs before this method
  }
}
```

### Custom Server Configuration

For more control, use the server builder:

```typescript
import { createServer } from '@jimmies-workspace/fastify-kick-start';

const app = await createServer()
  .withLogging({ level: 'debug', prettyPrint: true })
  .withSwagger({
    info: { title: 'Advanced API', version: '2.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' }
      }
    }
  })
  .withCors({ enabled: true })
  .withControllers([UserController, ProductController])
  .build();
```

## Next Steps

- Check out the [examples](../examples/) directory for complete working examples
- Read the [API Reference](./api-reference.md) for detailed documentation
- Explore [Middleware](./middleware.md) options
- See [Deployment](./deployment.md) best practices

## Common Patterns

### Error Handling

```typescript
class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

@Post('/users')
async createUser(req: any, reply: any) {
  if (!req.body.email) {
    throw new ValidationError('Email is required');
  }
  // Handle success case
}
```

### Response Formatting

```typescript
@Get('/users')
async getUsers(req: any, reply: any) {
  const users = await this.userService.findAll();
  
  return reply.send({
    success: true,
    data: users,
    count: users.length
  });
}
```

### Query Parameters

```typescript
@Get('/users')
@Opts({
  schema: {
    querystring: Type.Object({
      page: Type.Optional(Type.Number({ minimum: 1 })),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
      search: Type.Optional(Type.String())
    })
  }
})
async getUsers(req: any) {
  const { page = 1, limit = 10, search } = req.query;
  // Handle pagination and search
}
```

## Troubleshooting

### Common Issues

1. **Decorators not working**: Make sure you have `reflect-metadata` imported at the top of your entry file
2. **Routes not registered**: Ensure your controller classes are decorated with `@Controller`
3. **Schema validation failing**: Check that your TypeBox schemas match your data structure
4. **TypeScript errors**: Ensure you have `experimentalDecorators` and `emitDecoratorMetadata` enabled in `tsconfig.json`

### TypeScript Configuration

Your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2020",
    "module": "commonjs",
    "strict": true
  }
}
```
