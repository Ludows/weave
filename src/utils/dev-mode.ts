/**
 * Development mode features
 * 
 * Provides development warnings and checks that are removed in production
 */

// Detect development mode
export const isDevelopmentMode = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return true; // Default to development mode
};

// Development warnings
export function devWarn(message: string, ...args: any[]): void {
  if (isDevelopmentMode()) {
    console.warn(`[Weave Dev Warning] ${message}`, ...args);
  }
}

export function devError(message: string, ...args: any[]): void {
  if (isDevelopmentMode()) {
    console.error(`[Weave Dev Error] ${message}`, ...args);
  }
}

// Track circular dependencies
const executingEffects = new Set<any>();

export function checkCircularDependency(effect: any): boolean {
  if (executingEffects.has(effect)) {
    devWarn('Circular dependency detected - effect is already executing');
    return true;
  }
  return false;
}

export function trackEffectExecution(effect: any, fn: () => void): void {
  if (!isDevelopmentMode()) {
    fn();
    return;
  }
  
  executingEffects.add(effect);
  try {
    fn();
  } finally {
    executingEffects.delete(effect);
  }
}

// Memory leak detection
const activeInstances = new WeakSet<any>();

export function trackInstance(instance: any): void {
  if (isDevelopmentMode()) {
    activeInstances.add(instance);
  }
}

export function warnUncleanedResources(instance: any): void {
  if (isDevelopmentMode()) {
    if (activeInstances.has(instance)) {
      devWarn('Instance may have uncleaned resources - ensure $.destroy() is called');
    }
  }
}

// Performance warnings
export function warnPerformance(message: string): void {
  if (isDevelopmentMode()) {
    devWarn(`Performance: ${message}`);
  }
}

// Production mode optimization
export function stripDevCode<T>(devFn: () => T, prodFn: () => T): T {
  return isDevelopmentMode() ? devFn() : prodFn();
}
