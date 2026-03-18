/**
 * Reactive dependency tracking system
 */

/**
 * Represents a reactive effect that can be tracked and triggered
 */
export interface ReactiveEffect {
  fn: () => any;
  deps: Set<Dependency>;
  scheduler?: () => void;
}

/**
 * Represents a dependency relationship between a target and a key
 */
export interface Dependency {
  target: any;
  key: string;
  effects: Set<ReactiveEffect>;
}

/**
 * Global tracking context
 */
let activeEffect: ReactiveEffect | null = null;
const targetMap = new WeakMap<any, Map<string, Set<ReactiveEffect>>>();
const executingEffects = new Set<ReactiveEffect>();

/**
 * Get the currently active effect
 */
export function getActiveEffect(): ReactiveEffect | null {
  return activeEffect;
}

/**
 * Set the active effect (used for testing and internal operations)
 */
export function setActiveEffect(effect: ReactiveEffect | null): void {
  activeEffect = effect;
}

/**
 * Track property access during reactive callback execution
 * Records the dependency relationship between the target object and the property key
 * 
 * OPTIMIZED: Uses early returns and avoids Array.from() for better performance
 */
export function track(target: any, key: string): void {
  // Only track if there's an active effect
  if (!activeEffect) {
    return;
  }

  // Get or create the dependency map for this target
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  // Get or create the effects set for this key
  let effects = depsMap.get(key);
  if (!effects) {
    effects = new Set();
    depsMap.set(key, effects);
  }

  // Early return if already tracking this effect
  if (effects.has(activeEffect)) {
    return;
  }

  // Add the current effect to the dependency
  effects.add(activeEffect);
  
  // Add dependency to effect's deps set
  // OPTIMIZED: Removed Array.from().find() - we check with effects.has() above
  activeEffect.deps.add({
    target,
    key,
    effects
  });
}

/**
 * Trigger re-execution of all dependent effects when a property changes
 * 
 * OPTIMIZED: Early returns and efficient Set operations
 */
export function trigger(target: any, key: string): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }

  const effects = depsMap.get(key);
  if (!effects || effects.size === 0) {
    return;
  }

  // Create a copy to avoid infinite loops if effects modify dependencies
  // OPTIMIZED: Only create copy if there are effects to run
  const effectsToRun = new Set(effects);

  effectsToRun.forEach(effect => {
    // Circular dependency detection: check if this effect is already executing
    if (executingEffects.has(effect)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Circular dependency detected, skipping effect execution to prevent infinite loop');
      }
      return;
    }

    // Execute the effect
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      runEffect(effect);
    }
  });
}

/**
 * Run a reactive effect with proper cleanup and circular dependency detection
 * 
 * OPTIMIZED: Reduced redundant checks
 */
export function runEffect(effect: ReactiveEffect): void {
  // Circular dependency detection
  if (executingEffects.has(effect)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Circular dependency detected, skipping effect execution to prevent infinite loop');
    }
    return;
  }

  // Clear previous dependencies
  cleanupEffect(effect);

  // Mark as executing
  executingEffects.add(effect);

  // Set as active effect and execute
  const prevEffect = activeEffect;
  activeEffect = effect;

  try {
    effect.fn();
  } finally {
    // Restore previous active effect
    activeEffect = prevEffect;
    
    // Remove from executing set
    executingEffects.delete(effect);
  }
}

/**
 * Clean up an effect's dependencies
 */
export function cleanupEffect(effect: ReactiveEffect): void {
  effect.deps.forEach(dep => {
    dep.effects.delete(effect);
  });
  effect.deps.clear();
}

/**
 * Create a reactive effect
 */
export function createReactiveEffect(
  fn: () => any,
  scheduler?: () => void
): ReactiveEffect {
  const effect: ReactiveEffect = {
    fn,
    deps: new Set(),
    scheduler
  };
  return effect;
}
