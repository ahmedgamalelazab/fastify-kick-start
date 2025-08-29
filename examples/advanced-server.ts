/**
 * Advanced Server Example
 * 
 * This example demonstrates advanced features of the Fastify Kick-Start library
 * including authentication, middleware, custom plugins, and complex routing.
 */

import { Type } from '@sinclair/typebox';

import {
    Auth,
    Controller,
    Delete,
    Get,
    Middleware,
    Opts,
    Patch,
    Post,
    Prefix,
    Put,
    apiKeyAuthMiddleware,
    createServer,
    jwtAuthMiddleware,
    loggingMiddleware,
    rateLimitMiddleware,
    securityHeadersMiddleware,
    validationMiddleware,
} from '../src';

// Schemas
const ProductSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  description: Type.String(),
  price: Type.Number({ minimum: 0 }),
  category: Type.String(),
  inStock: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

const CreateProductSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.String({ maxLength: 500 }),
  price: Type.Number({ minimum: 0 }),
  category: Type.String({ minLength: 1 }),
  inStock: Type.Optional(Type.Boolean()),
});

const UpdateProductSchema = Type.Partial(CreateProductSchema);

const UserSchema = Type.Object({
  id: Type.Number(),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
});

// Sample data
const products = [
  {
    id: 1,
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    category: 'Electronics',
    inStock: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const users = [
  { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin' as const },
  { id: 2, username: 'user', email: 'user@example.com', role: 'user' as const },
];

/**
 * Public API Controller (no authentication required)
 */
@Prefix('/api')
@Controller('/v1/public')
@Middleware([
  securityHeadersMiddleware(),
  loggingMiddleware({ level: 'info', excludePaths: ['/health'] }),
])
export class PublicController {
  @Get('/products')
  @Middleware(rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }))
  @Opts({
    schema: {
      tags: ['Public'],
      summary: 'Get all products',
      description: 'Get a list of all available products',
      querystring: Type.Object({
        category: Type.Optional(Type.String()),
        inStock: Type.Optional(Type.Boolean()),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
        offset: Type.Optional(Type.Number({ minimum: 0 })),
      }),
      response: {
        200: Type.Object({
          products: Type.Array(ProductSchema),
          total: Type.Number(),
          limit: Type.Number(),
          offset: Type.Number(),
        }),
      },
    },
  })
  async getProducts(req: any) {
    const { category, inStock, limit = 10, offset = 0 } = req.query;
    
    let filteredProducts = [...products];
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    if (inStock !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.inStock === inStock);
    }
    
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);
    
    return {
      products: paginatedProducts,
      total: filteredProducts.length,
      limit,
      offset,
    };
  }

  @Get('/products/:id')
  @Opts({
    schema: {
      tags: ['Public'],
      summary: 'Get product by ID',
      params: Type.Object({
        id: Type.Number(),
      }),
      response: {
        200: ProductSchema,
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async getProduct(req: any, reply: any) {
    const productId = parseInt(req.params.id);
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
    
    return product;
  }
}

/**
 * Admin API Controller (requires API key authentication)
 */
@Prefix('/api')
@Controller('/v1/admin')
@Auth(apiKeyAuthMiddleware({
  validate: async (apiKey: string) => {
    // In a real app, validate against database
    return apiKey === 'admin-secret-key';
  },
}))
@Middleware([
  securityHeadersMiddleware(),
  loggingMiddleware({ level: 'info', includeHeaders: true }),
  rateLimitMiddleware({ maxRequests: 50, windowMs: 60000 }),
])
export class AdminController {
  @Post('/products')
  @Middleware(validationMiddleware({
    validateBody: (body: any) => {
      if (body.price < 0) return 'Price must be non-negative';
      if (body.name.trim().length === 0) return 'Name cannot be empty';
      return true;
    },
  }))
  @Opts({
    schema: {
      tags: ['Admin'],
      summary: 'Create a new product',
      security: [{ apiKey: [] }],
      body: CreateProductSchema,
      response: {
        201: ProductSchema,
        400: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async createProduct(req: any, reply: any) {
    const productData = req.body;
    
    const newProduct = {
      id: Math.max(...products.map(p => p.id)) + 1,
      ...productData,
      inStock: productData.inStock ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    products.push(newProduct);
    
    return reply.code(201).send(newProduct);
  }

  @Put('/products/:id')
  @Opts({
    schema: {
      tags: ['Admin'],
      summary: 'Update a product',
      security: [{ apiKey: [] }],
      params: Type.Object({
        id: Type.Number(),
      }),
      body: CreateProductSchema,
      response: {
        200: ProductSchema,
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async updateProduct(req: any, reply: any) {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
    
    products[productIndex] = {
      ...products[productIndex],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    return products[productIndex];
  }

  @Patch('/products/:id')
  @Opts({
    schema: {
      tags: ['Admin'],
      summary: 'Partially update a product',
      security: [{ apiKey: [] }],
      params: Type.Object({
        id: Type.Number(),
      }),
      body: UpdateProductSchema,
      response: {
        200: ProductSchema,
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async patchProduct(req: any, reply: any) {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
    
    // Only update provided fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        (products[productIndex] as any)[key] = req.body[key];
      }
    });
    
    products[productIndex].updatedAt = new Date().toISOString();
    
    return products[productIndex];
  }

  @Delete('/products/:id')
  @Opts({
    schema: {
      tags: ['Admin'],
      summary: 'Delete a product',
      security: [{ apiKey: [] }],
      params: Type.Object({
        id: Type.Number(),
      }),
      response: {
        204: Type.Null(),
        404: Type.Object({
          statusCode: Type.Number(),
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  })
  async deleteProduct(req: any, reply: any) {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
    
    products.splice(productIndex, 1);
    
    return reply.code(204).send();
  }
}

/**
 * User API Controller (requires JWT authentication)
 */
@Prefix('/api')
@Controller('/v1/user')
@Auth(jwtAuthMiddleware({
  secret: 'your-jwt-secret',
  verify: async (payload: any) => {
    // Verify user exists and is active
    const user = users.find(u => u.id === payload.userId);
    return !!user;
  },
}))
export class UserController {
  @Get('/profile')
  @Opts({
    schema: {
      tags: ['User'],
      summary: 'Get user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: UserSchema,
      },
    },
  })
  async getProfile(req: any) {
    const userId = (req as any).user.userId;
    const user = users.find(u => u.id === userId);
    return user;
  }

  @Get('/orders')
  @Opts({
    schema: {
      tags: ['User'],
      summary: 'Get user orders',
      security: [{ bearerAuth: [] }],
      response: {
        200: Type.Array(Type.Object({
          id: Type.Number(),
          productId: Type.Number(),
          quantity: Type.Number(),
          total: Type.Number(),
          status: Type.String(),
          createdAt: Type.String({ format: 'date-time' }),
        })),
      },
    },
  })
  async getOrders(req: any) {
    // Mock orders data
    return [
      {
        id: 1,
        productId: 1,
        quantity: 2,
        total: 1999.98,
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Start the advanced server
 */
async function startAdvancedServer() {
  try {
    const app = await createServer()
      .withLogging({
        enabled: true,
        level: 'info',
        name: 'advanced-api',
        prettyPrint: process.env.NODE_ENV === 'development',
      })
      .withSwagger({
        enabled: true,
        info: {
          title: 'Advanced API Example',
          description: `
# Advanced REST API

This API demonstrates advanced features including:
- Multiple authentication strategies (API Key, JWT)
- Rate limiting and security headers
- Request validation and middleware
- Comprehensive error handling
- Interactive documentation

## Authentication

### API Key Authentication
For admin endpoints, include the API key in the header:
\`\`\`
X-API-Key: admin-secret-key
\`\`\`

### JWT Authentication
For user endpoints, include the JWT token:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`
          `,
          version: '2.0.0',
        },
        components: {
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API Key for admin access',
            },
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token for user access',
            },
          },
        },
      })
      .withSwaggerUI({
        enabled: true,
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: true,
          tryItOutEnabled: true,
        },
      })
      .withCors({
        enabled: true,
        options: {
          origin: ['http://localhost:3000', 'http://localhost:3001'],
          credentials: true,
        },
      })
      .withErrorHandler({
        enabled: true,
        handler: (error, req, reply) => {
          req.log.error(error, 'Request failed');
          
          const statusCode = (error as any).statusCode || 500;
          const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error.message;
          
          reply.code(statusCode).send({
            statusCode,
            error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
            message,
            timestamp: new Date().toISOString(),
          });
        },
      })
      .withControllers([PublicController, AdminController, UserController])
      .build();

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || 'localhost';

    await app.listen({ port, host });
    
    console.log(`🚀 Advanced server running at http://${host}:${port}`);
    console.log(`📚 API Documentation available at http://${host}:${port}/docs`);
    console.log(`🔑 Admin API Key: admin-secret-key`);
    console.log(`🎫 Test JWT: Generate your own or use a mock token`);
  } catch (error) {
    console.error('Failed to start advanced server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startAdvancedServer().catch(console.error);
}
