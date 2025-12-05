
export interface MockDNSResult {
  address: string;
  family: 4 | 6;
}

export class SecurityTestUtils {
  // DNS mocking utilities
  static mockDNSLookup = jest.fn<Promise<MockDNSResult>, [string]>();

  static setupDNSMocks() {
    // Mock DNS resolution for testing
    jest.doMock('dns', () => ({
      lookup: jest.fn((hostname: string, callback: (err: Error | null, address?: string, family?: number) => void) => {
        SecurityTestUtils.mockDNSLookup(hostname)
          .then((result: MockDNSResult) => callback(null, result.address, result.family))
          .catch((err: Error) => callback(err));
      })
    }));

    // Reset DNS mock responses
    SecurityTestUtils.mockDNSLookup.mockImplementation(async (hostname: string) => {
      // Default safe resolution for legitimate domains
      if (hostname === 'allrecipes.com') {
        return { address: '192.0.2.1', family: 4 }; // RFC 5737 test address
      }
      
      if (hostname === 'ah.nl') {
        return { address: '192.0.2.2', family: 4 };
      }

      // Malicious DNS rebinding attempts
      if (hostname === 'evil-rebind.com') {
        return { address: '127.0.0.1', family: 4 }; // Should be blocked
      }

      if (hostname === 'private-rebind.com') {
        return { address: '10.0.0.1', family: 4 }; // Should be blocked
      }

      if (hostname === 'metadata-rebind.com') {
        return { address: '169.254.169.254', family: 4 }; // Should be blocked
      }

      // Default to safe address
      return { address: '192.0.2.100', family: 4 };
    });
  }

  // Time mocking for rate limiting and circuit breaker tests
  static mockTime(fixedTime: number) {
    jest.spyOn(Date, 'now').mockReturnValue(fixedTime);
    jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      if (typeof callback === 'function') {
        // For testing, immediately call timeout callbacks
        callback();
      }
      return { 
        ref: jest.fn(), 
        unref: jest.fn(),
        refresh: jest.fn(),
        hasRef: jest.fn().mockReturnValue(true),
        close: jest.fn(),
        _onTimeout: callback,
        [Symbol.toPrimitive]: () => 123,
        [Symbol.dispose]: jest.fn()
      } as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  }

  // Restore time mocks
  static restoreTime() {
    jest.restoreAllMocks();
  }

  // Generate malicious payloads for testing
  static getMaliciousJsonPayloads() {
    return {
      prototypeChain: JSON.stringify({
        "@type": "Recipe",
        "name": "Test",
        "__proto__": { "polluted": true }
      }),
      
      constructorPollution: JSON.stringify({
        "@type": "Recipe", 
        "name": "Test",
        "constructor": { "prototype": { "polluted": true } }
      }),
      
      largePayload: JSON.stringify({
        "@type": "Recipe",
        "name": "Test",
        "recipeIngredient": Array(10000).fill("ingredient")
      }),

      xssPayload: JSON.stringify({
        "@type": "Recipe",
        "name": "<script>alert('xss')</script>",
        "recipeInstructions": ["javascript:alert('xss')", "Mix ingredients"]
      })
    };
  }

  // Generate SSRF test URLs
  static getSSRFTestUrls() {
    return {
      localhost: [
        'http://localhost:8080/admin',
        'http://127.0.0.1:8080/admin', 
        'http://127.1.1.1/admin',
        'http://[::1]:8080/admin',
        'http://[::ffff:127.0.0.1]:8080/admin'
      ],
      privateIPs: [
        'http://10.0.0.1/internal',
        'http://192.168.1.1/router',
        'http://172.16.0.1/internal',
        'http://172.31.255.255/internal'
      ],
      linkLocal: [
        'http://169.254.1.1/local',
        'http://169.254.169.254/latest/meta-data'
      ],
      cloudMetadata: [
        'http://metadata.google.internal/computeMetadata',
        'http://169.254.169.254/latest/meta-data/',
        'https://metadata.google.internal/computeMetadata'
      ],
      dnsRebinding: [
        'http://evil-rebind.com/admin',
        'http://private-rebind.com/internal',
        'http://metadata-rebind.com/metadata'
      ],
      invalidProtocols: [
        'ftp://example.com/file.txt',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ]
    };
  }

  // Create rate limiting test scenarios
  static createRateLimitScenarios(baseTime: number = Date.now()) {
    return {
      underLimit: Array(5).fill(null).map((_, i) => ({
        user_id: 'test-user-id',
        endpoint: '/api/scrape-recipe',
        timestamp: baseTime - (i * 10000) // 10 seconds apart
      })),
      
      overLimit: Array(12).fill(null).map((_, i) => ({
        user_id: 'test-user-id', 
        endpoint: '/api/scrape-recipe',
        timestamp: baseTime - (i * 1000) // 1 second apart (rapid fire)
      })),
      
      violations: [
        { user_id: 'test-user-id', endpoint: '/api/scrape-recipe', timestamp: baseTime - 300000 }, // 5 min ago
        { user_id: 'test-user-id', endpoint: '/api/scrape-recipe', timestamp: baseTime - 900000 }, // 15 min ago
      ]
    };
  }

  // Circuit breaker test utilities  
  static createCircuitBreakerState(domain: string, failures: number, lastFailure: number = Date.now()) {
    const blockDurations = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];
    const blockDuration = Math.min(blockDurations[failures - 1] || blockDurations[blockDurations.length - 1], 60 * 60 * 1000);
    
    return {
      domain,
      failures,
      lastFailure,
      blockedUntil: lastFailure + blockDuration
    };
  }

  // Verify sanitized output doesn't contain dangerous content
  static verifyTextSanitization(text: string) {
    const dangerous = [
      /<script/i,
      /<iframe/i, 
      /<object/i,
      /<embed/i,
      /javascript:/i,
      /data:text\/html/i,
      /__proto__/,
      /constructor\.prototype/,
      /polluted/
    ];

    return dangerous.every(pattern => !pattern.test(text));
  }

  // Verify error messages don't leak sensitive information
  static verifyErrorSanitization(errorMessage: string) {
    const sensitivePatterns = [
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
      /\b[\w-]+\.local\b/i, // Local hostnames  
      /:\d{2,5}\b/, // Port numbers
      /[a-zA-Z]:\\[^\s]*/, // Windows file paths
      /\/[a-zA-Z0-9_/-]+/, // Unix file paths
      /at\s+.*/, // Stack traces
      /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/i // Detailed network errors
    ];

    return sensitivePatterns.every(pattern => !pattern.test(errorMessage));
  }

  // Helper to create large content for testing size limits
  static createLargeContent(sizeInMB: number): string {
    const oneMB = 'x'.repeat(1024 * 1024);
    return oneMB.repeat(sizeInMB);
  }

  // Helper to create streaming response mock
  static createStreamingResponse(content: string, chunkSize: number = 1024) {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    return {
      chunks,
      createReadableStream() {
        let index = 0;
        return {
          getReader() {
            return {
              read: async () => {
                if (index >= chunks.length) {
                  return { done: true, value: undefined };
                }
                
                const value = new TextEncoder().encode(chunks[index++]);
                return { done: false, value };
              },
              releaseLock: jest.fn()
            };
          }
        };
      }
    };
  }

  // Cleanup utility for test teardown
  static cleanup() {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    SecurityTestUtils.mockDNSLookup.mockClear();
  }
}
