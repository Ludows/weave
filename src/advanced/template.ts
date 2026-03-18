/**
 * template() rendering implementation
 * 
 * Note: The template() directive is implemented as a method on NodeRef.
 * This file re-exports it for convenience.
 */

export { NodeRef } from '../dom/node-ref';

// The template() method is available on NodeRef instances returned by $()
// Example usage:
// const modal = $('#modal');
// modal.template(() => `<div>${data.value}</div>`);

