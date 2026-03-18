/**
 * Accessibility support utilities
 * 
 * Ensures ARIA attributes are preserved and provides best practices
 */

/**
 * Check if an attribute is an ARIA attribute
 */
export function isAriaAttribute(attribute: string): boolean {
  return attribute.startsWith('aria-') || attribute === 'role';
}

/**
 * Preserve ARIA attributes when updating element
 */
export function preserveAriaAttributes(element: Element, updates: Record<string, string>): void {
  // Get all existing ARIA attributes
  const ariaAttrs: Record<string, string> = {};
  Array.from(element.attributes).forEach(attr => {
    if (isAriaAttribute(attr.name)) {
      ariaAttrs[attr.name] = attr.value;
    }
  });
  
  // Apply updates
  Object.entries(updates).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // Restore ARIA attributes that weren't in updates
  Object.entries(ariaAttrs).forEach(([key, value]) => {
    if (!(key in updates)) {
      element.setAttribute(key, value);
    }
  });
}

/**
 * Best practices documentation
 */
export const accessibilityBestPractices = {
  textUpdates: `
    When using text() directive with screen readers:
    - Use aria-live="polite" for non-urgent updates
    - Use aria-live="assertive" for urgent updates
    - Consider aria-atomic="true" for complete announcements
  `,
  
  focusManagement: `
    When using focus() directive:
    - Ensure focused elements are keyboard accessible
    - Provide visible focus indicators
    - Don't trap focus without escape mechanism
    - Use focus() sparingly to avoid disorienting users
  `,
  
  conditionalMounting: `
    When using if() directive:
    - Ensure ARIA attributes are preserved on mount/unmount
    - Consider aria-hidden for visibility control instead of DOM removal
    - Announce dynamic content changes with aria-live regions
  `,
  
  dynamicContent: `
    For reactive content updates:
    - Use aria-busy during loading states
    - Announce completion with aria-live regions
    - Maintain focus context during updates
  `
};
