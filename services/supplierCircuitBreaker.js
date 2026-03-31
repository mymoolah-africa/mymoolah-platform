'use strict';

/**
 * Supplier Circuit Breaker — Banking-Grade
 *
 * Per-supplier circuit breaker with three states:
 *   CLOSED  → requests flow normally
 *   OPEN    → requests are rejected immediately (supplier assumed down)
 *   HALF_OPEN → one probe request allowed; success closes, failure re-opens
 *
 * Modeled on the VALR circuit breaker pattern (services/valrService.js).
 * Singleton — shared across the entire Node.js process.
 *
 * Only TRANSIENT errors (network timeout, 5xx, ECONNRESET) count toward
 * the failure threshold. Business errors (4xx, validation, insufficient
 * balance) do NOT trip the circuit.
 */

const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

const DEFAULT_OPTIONS = {
  failureThreshold: 5,
  resetTimeMs: 300_000,       // 5 minutes before half-open probe
  halfOpenMaxProbes: 1,       // how many probes allowed in half-open
  successThresholdToClose: 1, // successes in half-open needed to close
};

class SupplierCircuitBreaker {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.suppliers = new Map();
  }

  _getState(supplierCode) {
    if (!this.suppliers.has(supplierCode)) {
      this.suppliers.set(supplierCode, {
        state: STATES.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        totalFailures: 0,
        totalSuccesses: 0,
        halfOpenProbes: 0,
      });
    }
    return this.suppliers.get(supplierCode);
  }

  /**
   * Returns true if the circuit is OPEN (supplier should be skipped).
   * Automatically transitions OPEN → HALF_OPEN after cooldown.
   */
  isOpen(supplierCode) {
    const s = this._getState(supplierCode);

    if (s.state === STATES.CLOSED) return false;

    if (s.state === STATES.OPEN) {
      if (Date.now() - s.lastFailureTime >= this.options.resetTimeMs) {
        s.state = STATES.HALF_OPEN;
        s.halfOpenProbes = 0;
        s.successCount = 0;
        console.log(`[CircuitBreaker] ${supplierCode}: OPEN → HALF_OPEN (cooldown elapsed)`);
        return false;
      }
      return true;
    }

    // HALF_OPEN: allow up to halfOpenMaxProbes requests through
    if (s.state === STATES.HALF_OPEN) {
      if (s.halfOpenProbes >= this.options.halfOpenMaxProbes) {
        return true; // probe already in flight, block others
      }
      return false;
    }

    return false;
  }

  /**
   * Call before making a request in HALF_OPEN to register the probe.
   */
  registerProbe(supplierCode) {
    const s = this._getState(supplierCode);
    if (s.state === STATES.HALF_OPEN) {
      s.halfOpenProbes++;
    }
  }

  /**
   * Record a successful request — resets failure count and closes circuit.
   */
  recordSuccess(supplierCode) {
    const s = this._getState(supplierCode);
    s.totalSuccesses++;
    s.lastSuccessTime = Date.now();

    if (s.state === STATES.HALF_OPEN) {
      s.successCount++;
      if (s.successCount >= this.options.successThresholdToClose) {
        s.state = STATES.CLOSED;
        s.failureCount = 0;
        s.successCount = 0;
        s.halfOpenProbes = 0;
        console.log(`[CircuitBreaker] ${supplierCode}: HALF_OPEN → CLOSED (probe succeeded)`);
      }
    } else {
      s.failureCount = 0;
    }
  }

  /**
   * Record a transient failure — increments counter, may open circuit.
   */
  recordFailure(supplierCode) {
    const s = this._getState(supplierCode);
    s.failureCount++;
    s.totalFailures++;
    s.lastFailureTime = Date.now();

    if (s.state === STATES.HALF_OPEN) {
      s.state = STATES.OPEN;
      s.halfOpenProbes = 0;
      console.log(`[CircuitBreaker] ${supplierCode}: HALF_OPEN → OPEN (probe failed)`);
      return;
    }

    if (s.failureCount >= this.options.failureThreshold) {
      s.state = STATES.OPEN;
      console.log(`[CircuitBreaker] ${supplierCode}: CLOSED → OPEN (threshold ${this.options.failureThreshold} reached)`);
    }
  }

  /**
   * Classify whether an error is transient (counts toward circuit)
   * or a business error (does NOT trip the circuit).
   */
  static isTransientError(error) {
    if (!error) return false;

    // Network-level errors
    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE'];
    if (transientCodes.includes(error.code)) return true;

    // Axios timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) return true;

    // Server errors (5xx)
    const status = error.response?.status || error.status;
    if (status && status >= 500) return true;

    // Rate limiting
    if (status === 429) return true;

    // Everything else (400, 401, 403, 404, business logic errors) = NOT transient
    return false;
  }

  /**
   * Get circuit breaker status for all suppliers (for health endpoint).
   */
  getStatus() {
    const result = {};
    for (const [code, s] of this.suppliers) {
      result[code] = {
        state: s.state,
        failureCount: s.failureCount,
        lastFailureTime: s.lastFailureTime ? new Date(s.lastFailureTime).toISOString() : null,
        lastSuccessTime: s.lastSuccessTime ? new Date(s.lastSuccessTime).toISOString() : null,
        totalFailures: s.totalFailures,
        totalSuccesses: s.totalSuccesses,
      };
    }
    return result;
  }

  /**
   * Force-reset a specific supplier circuit (admin use).
   */
  reset(supplierCode) {
    if (this.suppliers.has(supplierCode)) {
      const s = this.suppliers.get(supplierCode);
      s.state = STATES.CLOSED;
      s.failureCount = 0;
      s.successCount = 0;
      s.halfOpenProbes = 0;
      console.log(`[CircuitBreaker] ${supplierCode}: manually reset → CLOSED`);
    }
  }
}

// Singleton instance
const instance = new SupplierCircuitBreaker();

module.exports = instance;
module.exports.SupplierCircuitBreaker = SupplierCircuitBreaker;
module.exports.STATES = STATES;
