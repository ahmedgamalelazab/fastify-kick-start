# Fastify Kick-Start

A comprehensive, reusable Fastify library with decorators, plugins, and Swagger integration. Build production-ready REST APIs quickly with TypeScript-first design and extensive customization options.

## Features

- 🎯 **Decorator-based Controllers** - Clean, annotation-driven API development
- 📚 **Auto-generated Documentation** - Swagger/OpenAPI 3.0 with interactive UI
- 🛡️ **Security Middleware** - Rate limiting, CORS, security headers, and more
- 🔧 **Highly Configurable** - Flexible server builder with sensible defaults
- 📦 **Plugin Architecture** - Extensible with custom plugins
- 🚀 **Production Ready** - Error handling, logging, and performance optimizations
- 📖 **TypeScript First** - Full type safety with TypeBox schema validation

## Quick Start

### Installation

```bash
npm install @jimmy-nitron/fastify-kick-start
# or
yarn add @jimmy-nitron/fastify-kick-start
```

### Basic Example

```typescript
import { Controller, Get, createQuickServer } from '@jimmy-nitron/fastify-kick-start';
import { Type } from '@sinclair/typebox';

@Controller('/api/users')
class UserController {
  @Get('/')
  async getUsers() {
    return { users: [] };
  }

  @Get('/:id')
  async getUserById(req: any, reply: any) {
    const { id } = req.params;
    return { id, name: 'John Doe' };
  }
}

// Create and start server
const app = await createQuickServer([UserController]);
await app.listen({ port: 3000 });
```

## Core Decorators

### @Controller

Mark a class as a controller and optionally set a route prefix:

```typescript
@Controller('/api/users')
class UserController {
  // Routes will be prefixed with /api/users
}
```

### HTTP Method Decorators

```typescript
@Controller('/api/users')
class UserController {
  @Get('/') // GET /api/users
  @Post('/') // POST /api/users
  @Put('/:id') // PUT /api/users/:id
  @Patch('/:id') // PATCH /api/users/:id
  @Delete('/:id') // DELETE /api/users/:id
  async handleRequest() {}
}
```

### @Opts - Route Configuration

Add Fastify route options including schema validation:

```typescript
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
      404: ErrorSchema
    }
  }
})
async getUserById(req: any, reply: any) {}
```

### @Prefix - Route Prefixes

Add prefixes to controllers (can be stacked):

```typescript
@Prefix('/api')
@Prefix('/v1')
@Controller('/users')
class UserController {
  // Routes will be prefixed with /api/v1/users
}
```

### @Middleware - Custom Middleware

Apply middleware to controllers or routes:

```typescript
@Middleware([loggingMiddleware, rateLimitMiddleware])
@Controller('/api')
class ApiController {
  @Get('/data')
  @Middleware(cacheMiddleware)
  async getData() {}
}
```

## Server Builder

### Quick Server

For rapid development with sensible defaults:

```typescript
import { createQuickServer } from '@jimmy-nitron/fastify-kick-start';

const app = await createQuickServer([UserController, ProductController], {
  swagger: {
    info: {
      title: 'My API',
      version: '1.0.0',
    },
  },
});
```

### Advanced Configuration

For full control over server configuration:

```typescript
import { createServer } from '@jimmy-nitron/fastify-kick-start';

const app = await createServer()
  .withLogging({
    enabled: true,
    level: 'info',
    prettyPrint: true,
  })
  .withSwagger({
    enabled: true,
    info: {
      title: 'Advanced API',
      description: 'Full-featured REST API',
      version: '2.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  })
  .withSwaggerUI({
    enabled: true,
    routePrefix: '/docs',
  })
  .withCors({
    enabled: true,
    options: {
      origin: ['http://localhost:3000'],
      credentials: true,
    },
  })
  .withControllers([UserController, ProductController])
  .build();
```

## Middleware

### Built-in Middleware

```typescript
import {
  corsMiddleware,
  loggingMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
  validationMiddleware,
} from '@jimmy-nitron/fastify-kick-start';

@Middleware([
  corsMiddleware({ origin: 'https://example.com' }),
  loggingMiddleware({ level: 'info' }),
  rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }),
  securityHeadersMiddleware(),
  validationMiddleware({
    validateBody: body => body.name?.length > 0 || 'Name is required',
  }),
])
@Controller('/api')
class ApiController {}
```

### Custom Middleware

```typescript
const customMiddleware: MiddlewareFunction = async (req, reply) => {
  // Custom logic
  req.customData = 'some value';
};

@Middleware(customMiddleware)
@Controller('/custom')
class CustomController {}
```

## Schema Validation

Using TypeBox for type-safe schema validation:

```typescript
import { Type } from '@sinclair/typebox';

const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 }))
});

@Post('/users')
@Opts({
  schema: {
    body: UserSchema,
    response: {
      201: UserSchema,
      400: Type.Object({
        statusCode: Type.Number(),
        error: Type.String(),
        message: Type.String()
      })
    }
  }
})
async createUser(req: any, reply: any) {
  // req.body is automatically validated against UserSchema
  return reply.code(201).send(req.body);
}
```

## Error Handling

### Default Error Handler

The library includes a comprehensive error handler:

```typescript
const app = await createServer()
  .withErrorHandler({
    enabled: true,
    handler: (error, req, reply) => {
      req.log.error(error);

      const statusCode = error.statusCode || 500;
      reply.code(statusCode).send({
        statusCode,
        error: 'Something went wrong',
        message: error.message,
      });
    },
  })
  .build();
```

### Custom Error Classes

```typescript
class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Throw in controllers
throw new ValidationError('Invalid input data');
```

## Examples

Check out the `examples/` directory for complete working examples:

- [`basic-server.ts`](./examples/basic-server.ts) - Simple REST API
- [`advanced-server.ts`](./examples/advanced-server.ts) - Full-featured API with auth, middleware, and advanced routing

## API Reference

### Decorators

- `@Controller(prefix?)` - Mark class as controller
- `@Get(path?)`, `@Post(path?)`, `@Put(path?)`, `@Patch(path?)`, `@Delete(path?)` - HTTP methods
- `@Prefix(prefix)` - Add route prefix
- `@Opts(options)` - Fastify route options
- `@Middleware(middleware)` - Custom middleware

### Server Builder

- `createQuickServer(controllers, options?)` - Quick server creation
- `createServer()` - Advanced server builder
  - `.withLogging(options)`
  - `.withSwagger(options)`
  - `.withSwaggerUI(options)`
  - `.withCors(options)`
  - `.withErrorHandler(options)`
  - `.withControllers(controllers)`
  - `.withPlugin(plugin, options?)`
  - `.build()`

### Middleware

- `corsMiddleware(options)`
- `loggingMiddleware(options)`
- `rateLimitMiddleware(options)`
- `securityHeadersMiddleware(options)`
- `validationMiddleware(options)`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/blabs/fastify-kick-start#readme)
- 🐛 [Issue Tracker](https://github.com/blabs/fastify-kick-start/issues)
- 💬 [Discussions](https://github.com/blabs/fastify-kick-start/discussions)
