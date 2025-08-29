/**
 * Jest test setup file
 * 
 * This file is run before all tests to set up the testing environment.
 */

import 'reflect-metadata';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods but allow them to be restored
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidResponse(): R;
      toHaveStatusCode(statusCode: number): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidResponse(received) {
    const pass = received && typeof received === 'object' && received.statusCode;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid response with statusCode`,
        pass: false,
      };
    }
  },

  toHaveStatusCode(received, statusCode) {
    const pass = received && received.statusCode === statusCode;
    
    if (pass) {
      return {
        message: () => `expected response not to have status code ${statusCode}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have status code ${statusCode}, but got ${received?.statusCode}`,
        pass: false,
      };
    }
  },
});
