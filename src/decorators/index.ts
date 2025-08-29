/**
 * @fileoverview Core decorators for Fastify Kick-Start library
 *
 * This module exports all the decorators needed to build REST APIs with Fastify.
 * The decorators provide a clean, annotation-based way to define controllers,
 * routes, middleware, authentication, and other HTTP concerns.
 */

// Controller decorators
export * from './controller.decorator';
export * from './prefix.decorator';

// Route decorators
export * from './route.decorator';

// Configuration decorators
export * from './options.decorator';

// Middleware decorators
export * from './middleware.decorator';
