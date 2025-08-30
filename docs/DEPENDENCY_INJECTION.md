# Dependency Injection in Fastify Kick Start

This guide explains how to use the enhanced dependency injection system in Fastify Kick Start, which provides smart IOC container integration with multiple container types.

## Overview

The dependency injection system has been completely redesigned to provide:

1. **Smart DI Bridge**: Automatically detects and adapts to different IOC container types
2. **Awilix Integration**: First-class support for Awilix with request scoping
3. **Multiple Container Support**: Works with Awilix, InversifyJS, TSyringe, and custom containers
4. **Backward Compatibility**: Legacy DI options still work
5. **Request Scoping**: Automatic scope management for request-scoped dependencies

## Quick Start

### Option 1: Using Awilix (Recommended)

```typescript
import { createContainer, asClass, asFunction } from 'awilix';
import { createServer } from 'fastify-kick-start';
import { Controller, Get } from 'fastify-kick-start/decorators';

// Define your services
class UserService {
  constructor({ database }) {
    this.database = database;
  }
  
  async getUser(id: string) {
    return await this.database.findUser(id);
  }
}

class DatabaseService {
  async findUser(id: string) {
    // Database logic here
    return { id, name: 'John Doe' };
  }
}

// Create controller that receives the cradle
@Controller('/users')
class UserController {
  constructor(private readonly cradle: any) {}

  @Get('/:id')
  async getUser(req: any, reply: any) {
    const user = await this.cradle.userService.getUser(req.params.id);
    return reply.send(user);
  }
}

// Setup server with Awilix
async function createApp() {
  const container = createContainer();
  
  container.register({
    database: asClass(DatabaseService).singleton(),
    userService: asClass(UserService).singleton(),
  });

  return await createServer()
    .withLogging({ enabled: true })
    .withAwilix(container, {
      disposeOnResponse: true,    // Clean up request scopes
      disposeOnClose: true,       // Clean up on server shutdown
      enableRequestScoping: true  // Enable per-request scopes
    })
    .withControllers([UserController])
    .build();
}
```

### Option 2: Using Generic DI Bridge

```typescript
import { createServer } from 'fastify-kick-start';

// Any IOC container that implements resolve()
class MyContainer {
  private services = new Map();
  
  register(name: string, factory: () => any) {
    this.services.set(name, factory);
  }
  
  resolve(name: string) {
    const factory = this.services.get(name);
    return factory ? factory() : null;
  }
}

@Controller('/products')
class ProductController {
  constructor(private readonly container: MyContainer) {}

  @Get('/:id')
  async getProduct(req: any, reply: any) {
    const productService = this.container.resolve('productService');
    const product = await productService.getProduct(req.params.id);
    return reply.send(product);
  }
}

async function createApp() {
  const container = new MyContainer();
  container.register('productService', () => new ProductService());

  return await createServer()
    .withDependencyInjection(container, {
      containerType: 'generic',  // or 'awilix', 'inversify', 'tsyringe'
      autoDetect: true          // automatically detect container type
    })
    .withControllers([ProductController])
    .build();
}
```

## Container Types Supported

### 1. Awilix
- **Detection**: Container has `cradle` property
- **Instantiation**: `new Controller(container.cradle)`
- **Features**: Request scoping, automatic cleanup, lifetime management

```typescript
// Awilix setup
const container = createContainer();
container.register({
  userService: asClass(UserService).singleton(),
  database: asClass(Database).scoped(), // Per-request instance
});

app.withAwilix(container);
```

### 2. InversifyJS
- **Detection**: Container has `get()` method
- **Instantiation**: `container.get(Controller)` or fallback to `new Controller(container)`
- **Features**: Decorator-based injection, hierarchical containers

```typescript
// InversifyJS-style setup
const container = new Container();
container.bind<UserService>('UserService').to(UserService);

app.withDependencyInjection(container, { containerType: 'inversify' });
```

### 3. TSyringe
- **Detection**: Container has `resolve()` method
- **Instantiation**: `container.resolve(Controller)` or fallback
- **Features**: Decorator-based injection, Microsoft-style DI

```typescript
// TSyringe-style setup
container.register('UserService', { useClass: UserService });

app.withDependencyInjection(container, { containerType: 'tsyringe' });
```

### 4. Generic/Custom
- **Detection**: Any container with `resolve()` method
- **Instantiation**: `container.resolve(Controller)` or `new Controller(container)`
- **Features**: Works with any custom container implementation

## Controller Patterns

### Pattern 1: Cradle Injection (Awilix)
```typescript
@Controller('/api/users')
class UserController {
  constructor(private readonly cradle: {
    userService: UserService;
    logger: Logger;
    database: Database;
  }) {}

  @Get('/:id')
  async getUser(req: FastifyRequest<{ Params: { id: string } }>) {
    return await this.cradle.userService.findById(req.params.id);
  }
}
```

### Pattern 2: Container Injection
```typescript
@Controller('/api/products')
class ProductController {
  constructor(private readonly container: DIContainer) {}

  @Get('/:id')
  async getProduct(req: FastifyRequest<{ Params: { id: string } }>) {
    const productService = this.container.resolve<ProductService>('ProductService');
    return await productService.findById(req.params.id);
  }
}
```

### Pattern 3: Direct Service Injection (InversifyJS)
```typescript
@Controller('/api/orders')
@injectable()
class OrderController {
  constructor(
    @inject('OrderService') private orderService: OrderService,
    @inject('PaymentService') private paymentService: PaymentService
  ) {}

  @Post('/')
  async createOrder(req: FastifyRequest<{ Body: CreateOrderDto }>) {
    return await this.orderService.create(req.body);
  }
}
```

## Request Scoping with Awilix

When using Awilix, you get automatic request scoping:

```typescript
// Service registered as scoped
container.register({
  requestContext: asClass(RequestContext).scoped(),
  userService: asClass(UserService).scoped(),
});

// Each request gets its own instances
@Controller('/api')
class ApiController {
  constructor(private readonly cradle: any) {}

  @Get('/context')
  async getContext(req: FastifyRequest) {
    // This will be a unique instance per request
    const context = this.cradle.requestContext;
    context.setUserId(req.headers['user-id']);
    
    // This service will also be unique per request
    // and can access the same request context
    const userService = this.cradle.userService;
    return await userService.getCurrentUser();
  }
}
```

## Advanced Configuration

### Custom DI Resolver

```typescript
import { SmartDIResolver } from 'fastify-kick-start/plugins';

const customResolver = new SmartDIResolver(myContainer, 'custom');

// Use with server builder
app.withPlugin(diBridgePluginFactory, {
  container: myContainer,
  resolver: customResolver
});
```

### Multiple Containers

```typescript
// You can register multiple DI systems
const app = await createServer()
  .withAwilix(awilixContainer)  // Primary DI system
  .withPlugin(customDIPlugin, { container: secondaryContainer })
  .withControllers([...controllers])
  .build();
```

## Migration Guide

### From Legacy DI Options

**Before:**
```typescript
await app.register(controllerPluginFactory, {
  controllers: [UserController],
  dependencyInjection: {
    container: myContainer,
    resolver: (Controller) => new Controller(myContainer)
  }
});
```

**After:**
```typescript
const app = await createServer()
  .withDependencyInjection(myContainer)
  .withControllers([UserController])
  .build();
```

### From Manual Controller Registration

**Before:**
```typescript
// Manual instantiation
const userController = new UserController(container.cradle);
app.get('/users/:id', userController.getUser.bind(userController));
```

**After:**
```typescript
// Automatic registration with DI
const app = await createServer()
  .withAwilix(container)
  .withControllers([UserController])
  .build();
```

## Best Practices

1. **Use Awilix for new projects** - It provides the best integration and features
2. **Leverage request scoping** - Register services as `.scoped()` when they need per-request state
3. **Type your cradle** - Define interfaces for better TypeScript support
4. **Clean up resources** - Enable `disposeOnResponse` and `disposeOnClose`
5. **Use singleton for stateless services** - Database connections, loggers, etc.
6. **Use scoped for stateful services** - Request context, user sessions, etc.

## Troubleshooting

### Controller not receiving dependencies
- Ensure DI bridge plugin is registered before controller plugin
- Check that your container implements the expected interface
- Verify container type detection with debug logging

### Memory leaks with request scoping
- Enable `disposeOnResponse: true` in Awilix options
- Ensure scoped services don't hold references to long-lived objects
- Monitor container disposal in logs

### TypeScript errors
- Define proper interfaces for your cradle/container
- Use generic types: `container.resolve<ServiceType>('serviceName')`
- Enable strict mode for better type checking

## Examples

See the `examples/dependency-injection.ts` file for complete working examples with different container types.
