# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-01-30

### Fixed

- **Awilix Plugin**: Removed `diCradle` decoration that was causing `AwilixResolutionError: Could not resolve 'getter'` when using real Awilix containers
- **DI Bridge Plugin**: Removed `diCradle` decoration for consistency
- Users can still access the cradle via `fastify.diContainer.cradle` when needed

## [1.1.0] - 2025-01-30

### Added

- **Comprehensive Dependency Injection System**
  - Smart DI Bridge plugin that adapts to different IOC containers
  - First-class Awilix integration with request scoping
  - Support for InversifyJS, TSyringe, and generic containers
  - Auto-detection of container types
  - Request-scoped dependency injection with automatic cleanup
  - Priority-based resolution system

- **New Server Builder Methods**
  - `withDependencyInjection()` for generic IOC containers
  - `withAwilix()` for Awilix containers with advanced options

- **Enhanced Controller Plugin**
  - Smart dependency resolution with fallback mechanisms
  - Backward compatibility with legacy DI options
  - Improved logging and debugging support

- **New Plugin Architecture**
  - `diBridgePluginFactory` for generic DI integration
  - `awilixPluginFactory` for Awilix-specific features
  - `SmartDIResolver` class for custom DI implementations

### Enhanced

- **Type Definitions**
  - New `DIContainer` and `DIResolver` interfaces
  - Enhanced TypeScript support for dependency injection
  - Better type safety across all DI scenarios

- **Documentation**
  - Comprehensive dependency injection guide (`docs/DEPENDENCY_INJECTION.md`)
  - Working examples for all supported container types
  - Migration guide from legacy DI options
  - Best practices and troubleshooting guide

- **Testing**
  - 51 comprehensive tests covering all DI scenarios
  - Tests for Awilix integration, generic containers, and backward compatibility
  - Error handling and edge case coverage

### Fixed

- Controller instantiation now properly handles dependency injection
- Improved error handling for missing or failed dependency resolution
- Better logging for DI-related operations

### Migration Guide

For users upgrading from 1.0.0:

**Before (Legacy DI):**

```typescript
await app.register(controllerPluginFactory, {
  controllers: [UserController],
  dependencyInjection: { container: myContainer },
});
```

**After (New DI Bridge):**

```typescript
const app = await createServer()
  .withDependencyInjection(myContainer)
  .withControllers([UserController])
  .build();
```

**For Awilix users:**

```typescript
const app = await createServer()
  .withAwilix(container, { enableRequestScoping: true })
  .withControllers([UserController])
  .build();
```

Legacy options continue to work for backward compatibility.

## [1.0.0] - 2025-01-29

### Added

- Initial release with core functionality
- Decorator-based controllers (`@Controller`, `@Get`, `@Post`, etc.)
- Swagger/OpenAPI integration
- Server builder with fluent API
- Basic plugin architecture
- TypeScript-first design
- Comprehensive test suite
