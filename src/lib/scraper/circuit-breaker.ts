interface CircuitState {
  failures: number;
  lastFailure: number;
  blockedUntil: number;
}

const circuitBreakerState = new Map<string, CircuitState>();

const MAX_FAILURES = 3;
const BASE_BLOCK_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BLOCK_MS = 60 * 60 * 1000; // 1 hour

export function isCircuitBreakerOpen(domain: string): boolean {
  const state = circuitBreakerState.get(domain);
  if (!state) return false;
  const now = Date.now();
  if (now > state.blockedUntil) {
    circuitBreakerState.delete(domain);
    return false;
  }
  return state.failures >= MAX_FAILURES;
}

export function recordCircuitBreakerFailure(domain: string): void {
  const now = Date.now();
  const state = circuitBreakerState.get(domain);
  if (!state) {
    circuitBreakerState.set(domain, {
      failures: 1,
      lastFailure: now,
      blockedUntil: now + BASE_BLOCK_MS,
    });
    return;
  }
  state.failures++;
  state.lastFailure = now;
  const blockDuration = Math.min(
    BASE_BLOCK_MS * Math.pow(2, state.failures - 1),
    MAX_BLOCK_MS
  );
  state.blockedUntil = now + blockDuration;
}

export function resetCircuitBreaker(domain: string): void {
  circuitBreakerState.delete(domain);
}

// For introspection / metrics (optional future use)
export function getCircuitBreakerSnapshot() {
  return Array.from(circuitBreakerState.entries()).map(([domain, state]) => ({
    domain,
    ...state,
  }));
}
