// React.act polyfill for CI environments where React.act might not be available
import React from 'react';

// Ensure React.act is available
if (!React.act) {
  // Create a simple act polyfill that just runs the callback
  React.act = (callback) => {
    try {
      const result = callback();
      if (result && typeof result.then === 'function') {
        return result;
      }
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  };
}

// Also ensure it's available globally for testing-library
if (typeof globalThis !== 'undefined') {
  if (!globalThis.React) {
    globalThis.React = React;
  }
  if (!globalThis.React.act) {
    globalThis.React.act = React.act;
  }
}

export default React;
