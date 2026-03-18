/**
 * State serialization and pretty printing
 * 
 * Formats Weave state objects as valid JSON
 */

export interface PrettyPrintOptions {
  indent?: number;
  includeComputed?: boolean;
}

/**
 * Format state object as valid JSON
 */
export function prettyPrint(state: any, options?: PrettyPrintOptions): string {
  const indent = options?.indent ?? 2;
  const includeComputed = options?.includeComputed ?? true;
  
  // Create a clean object for serialization
  const cleanState: any = {};
  
  for (const [key, value] of Object.entries(state)) {
    // Skip functions unless they're computed properties we want to include
    if (typeof value === 'function') {
      if (includeComputed) {
        try {
          // Try to execute computed property
          cleanState[key] = value();
        } catch {
          // Skip if execution fails
        }
      }
    } else {
      cleanState[key] = value;
    }
  }
  
  return JSON.stringify(cleanState, null, indent);
}

/**
 * Serialize state to JSON string (compact)
 */
export function serialize(state: any): string {
  return prettyPrint(state, { indent: 0 });
}

/**
 * Format state with custom replacer function
 */
export function prettyPrintWithReplacer(
  state: any,
  replacer: (key: string, value: any) => any,
  indent?: number
): string {
  return JSON.stringify(state, replacer, indent ?? 2);
}
