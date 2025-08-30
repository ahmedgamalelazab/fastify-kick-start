/**
 * @fileoverview Plugins for Fastify Kick-Start library
 *
 * This module exports all the built-in plugins that extend Fastify functionality.
 * Plugins provide reusable functionality that can be registered with Fastify instances.
 */

// Core plugins
export * from './controller.plugin';
export * from './swagger.plugin';

// Dependency injection plugins
export { diBridgePlugin, diBridgePluginFactory, SmartDIResolver } from './di-bridge.plugin';
export {
  awilixPlugin,
  awilixPluginFactory,
  type AwilixContainer,
  type AwilixPluginOptions,
} from './awilix.plugin';
