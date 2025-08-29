/**
 * @fileoverview Fastify Kick-Start Library
 *
 * A comprehensive, reusable Fastify library with decorators, plugins, and Swagger integration.
 * This library provides everything you need to quickly build production-ready REST APIs.
 *
 * @example
 * ```typescript
 * import { Controller, Get, createQuickServer } from '@jimmy-nitron/fastify-kick-start';
 *
 * @Controller('/api/users')
 * class UserController {
 *   @Get('/')
 *   async getUsers() {
 *     return { users: [] };
 *   }
 * }
 *
 * const app = await createQuickServer([UserController]);
 * await app.listen({ port: 3000 });
 * ```
 */

// Re-export everything for convenience
export * from './decorators';
export * from './middleware';
export * from './plugins';
export * from './server';
export * from './types';

// Import reflect-metadata to ensure decorators work
import 'reflect-metadata';
