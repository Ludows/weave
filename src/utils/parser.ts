/**
 * JSON configuration parser
 * 
 * Converts JSON to Weave state objects
 */

export interface ParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse JSON configuration into typed Weave state object
 */
export function parseConfig<T = any>(json: string): ParseResult<T> {
  try {
    const data = JSON.parse(json);
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

/**
 * Parse JSON with type validation
 */
export function parseConfigWithSchema<T = any>(
  json: string,
  validator?: (data: any) => data is T
): ParseResult<T> {
  const result = parseConfig<T>(json);
  
  if (!result.success || !result.data) {
    return result;
  }
  
  if (validator && !validator(result.data)) {
    return {
      success: false,
      error: 'Data does not match expected schema'
    };
  }
  
  return result;
}
